package com.milba_Ittech.jobreport.ui.screens.step

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import android.util.Log
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.launch
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.milba_Ittech.jobreport.domain.model.TicketStep
import com.milba_Ittech.jobreport.ui.components.AppTopBar
import com.milba_Ittech.jobreport.ui.components.OliveTitleBlock
import com.milba_Ittech.jobreport.ui.components.CameraView
import com.milba_Ittech.jobreport.ui.theme.*
import com.milba_Ittech.jobreport.util.PhotoQuality
import com.milba_Ittech.jobreport.data.repository.TicketRepository
import com.milba_Ittech.jobreport.data.AppState
import com.milba_Ittech.jobreport.ui.screens.sop.SectionDotBar  // ← ADD ✅
import androidx.compose.material.icons.filled.Block
import androidx.compose.material.icons.filled.Warning
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Row

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StepScreen(
    step:              TicketStep,
    acUnitId:          String,
    technicianId:      String,
    isLastInSection:   Boolean,
    sectionName:       String,
    stepIndex:         Int,
    totalInSection:    Int,
    sectionIndex:      Int,
    onCompleted:       (stepId: String) -> Unit,
    onBack:            () -> Unit
) {
    val context        = LocalContext.current
    val ticketRepo     = remember { TicketRepository() }
    val viewModel      = viewModel { StepViewModel(ticketRepo) }
    val coroutineScope = rememberCoroutineScope()
    val state         by viewModel.state.collectAsState()

    LaunchedEffect(step.id) {
        viewModel.reset()

        // Phase D: record when technician opens first step for a unit ✅
        viewModel.recordUnitStartedIfFirst(
            ticketId = step.ticketId,
            acUnitId = acUnitId,
        )

        if (step.description == "Catatan temuan (jika ada)") {
            viewModel.loadFindingWithAutoText(step.id, acUnitId)
        }
    }

    val previousValue = remember(step.id) {
        when (step.description) {
            "Suhu Akhir"   -> AppState.suhuAwalStepIds[acUnitId]
                ?.let { AppState.stepInputValues[it] }
            "Ampere Akhir" -> AppState.ampereAwalStepIds[acUnitId]
                ?.let { AppState.stepInputValues[it] }
            else           -> null
        }
    }

    if (state.showCamera) {
        CameraView(
            onPhotoTaken = { bitmap -> viewModel.onPhotoCaptured(step.id, bitmap) },
            onClose      = viewModel::closeCamera
        )
        return
    }

    Scaffold(
        topBar = {
            Column {
                AppTopBar(
                    title = {
                        OliveTitleBlock(
                            title    = sectionName,
                            subtitle = step.description
                        )
                    },
                    onBack = onBack
                )
                // Section dot bar + step progress
                Surface(color = OliveDarker) {
                    Column(
                        modifier = Modifier
                            .padding(horizontal = 14.dp)
                            .padding(bottom = 8.dp)
                    ) {
                        SectionDotBar(currentIndex = sectionIndex)
                        Spacer(Modifier.height(4.dp))
                        LinearProgressIndicator(
                            progress   = { (stepIndex + 1).toFloat() / totalInSection.toFloat() },
                            modifier   = Modifier
                                .fillMaxWidth()
                                .height(3.dp)
                                .clip(RoundedCornerShape(100.dp)),
                            color      = Color.White,
                            trackColor = Color.White.copy(alpha = 0.25f)
                        )
                    }
                }
            }
        },
        bottomBar = {
            Surface(shadowElevation = 8.dp) {
                Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)) {
                    // "Langkah terakhir!" badge
                    if (isLastInSection) {
                        Surface(
                            shape    = RoundedCornerShape(100.dp),
                            color    = BrandWarning.copy(alpha = 0.12f),
                            modifier = Modifier
                                .align(Alignment.CenterHorizontally)
                                .padding(bottom = 6.dp)
                        ) {
                            Text(
                                "Langkah terakhir dalam $sectionName!",
                                style    = MaterialTheme.typography.labelSmall,
                                color    = BrandWarning,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                            )
                        }
                    }
                    Button(
                        onClick = {
                            viewModel.saveAndComplete(
                                stepId       = step.id,
                                ticketId     = step.ticketId,
                                acUnitId     = acUnitId,
                                technicianId = technicianId,
                                onCompleted  = onCompleted
                            )
                        },
                        enabled  = viewModel.canComplete(step.stepType) && !state.isLoading,
                        modifier = Modifier.fillMaxWidth().height(52.dp)
                    ) {
                        if (state.isLoading) {
                            CircularProgressIndicator(
                                color       = Color.White,
                                modifier    = Modifier.size(20.dp),
                                strokeWidth = 2.dp
                            )
                            Spacer(Modifier.width(8.dp))
                            Text("Menyimpan...")
                        } else if (isLastInSection) {
                            Text("Selesaikan $sectionName")
                        } else {
                            Text("Lanjut")
                        }
                    }
                }
            }
        }
    ) { padding ->

        Column(
            modifier            = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // Step header
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text  = "Langkah ${step.orderNumber}",
                    style = MaterialTheme.typography.labelSmall,
                    color = NeutralMid
                )
                Text(
                    text       = step.description,
                    style      = MaterialTheme.typography.titleLarge,
                    color      = NeutralDark,
                    fontWeight = FontWeight.SemiBold
                )
            }

            HorizontalDivider(color = NeutralBorder)

            // Step content based on type
            when (step.stepType) {

                "photo_only" -> PhotoOnlyContent(          // ← NEW ✅
                    photo        = state.capturedPhoto,
                    quality      = state.photoQuality,
                    onOpenCamera = viewModel::openCamera,
                    onRetake     = { viewModel.retakePhoto(step.id) },
                    label        = step.description
                )

                "numeric_form_photo" -> NumericFormPhotoContent(
                    inputValue    = state.inputValue,
                    inputUnit     = step.inputUnit ?: "",
                    photo         = state.capturedPhoto,
                    quality       = state.photoQuality,
                    onValueChange = {
                        viewModel.updateInputValue(step.id, it)
                        viewModel.validateThreshold(
                            stepDescription  = step.description,
                            previousValueStr = previousValue,
                            acUnitId         = acUnitId
                        )
                    },
                    onOpenCamera     = viewModel::openCamera,
                    onRetake         = { viewModel.retakePhoto(step.id) },
                    thresholdError   = state.thresholdError,
                    thresholdWarning = state.thresholdWarning
                )

                "text_conditional_photo" -> ConditionalPhotoContent(
                    isAbnormal   = state.isConditionAbnormal,
                    photo        = state.capturedPhoto,
                    quality      = state.photoQuality,
                    onCondition  = { viewModel.setConditionAbnormal(step.id, it) },
                    onOpenCamera = viewModel::openCamera,
                    onRetake     = { viewModel.retakePhoto(step.id) }
                )

                "checklist_only" -> ChecklistOnlyContent(
                    isChecked = state.isChecked,
                    label     = step.description,
                    onToggle  = { viewModel.setChecked(step.id, it) }
                )

                "checklist_photo" -> ChecklistPhotoContent(
                    isChecked    = state.isChecked,
                    label        = step.description,
                    photo        = state.capturedPhoto,
                    quality      = state.photoQuality,
                    onToggle     = { viewModel.setChecked(step.id, it) },
                    onOpenCamera = viewModel::openCamera,
                    onRetake     = { viewModel.retakePhoto(step.id) }
                )

                "checklist_conditional_photo" -> ChecklistConditionalContent(
                    isOk         = state.isChecked,
                    photo        = state.capturedPhoto,
                    quality      = state.photoQuality,
                    onCondition  = { viewModel.setChecked(step.id, it) },
                    onOpenCamera = viewModel::openCamera,
                    onRetake     = { viewModel.retakePhoto(step.id) }
                )

                "dynamic_finding", "dynamic_finding_photo" -> DynamicFindingPhotoContent(
                    inputValue    = state.inputValue,
                    photo         = state.capturedPhoto,
                    quality       = state.photoQuality,
                    onValueChange = { viewModel.updateInputValue(step.id, it) },
                    onOpenCamera  = viewModel::openCamera,
                    onRetake      = { viewModel.retakePhoto(step.id) }
                )

                else -> {
                    Text(
                        text  = "Tandai langkah ini selesai.",
                        style = MaterialTheme.typography.bodySmall,
                        color = NeutralMid
                    )
                }
            }

            // Error message
            state.error?.let {
                Text(text = it, color = BrandError,
                    style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

// ── PhotoOnlyContent ──────────────────────────────────────────────────────────
// NEW: for photo_only step type (unit identity photos in Kedatangan section) ✅

@Composable
fun PhotoOnlyContent(
    photo:       Bitmap?,
    quality:     PhotoQuality.Result?,
    onOpenCamera: () -> Unit,
    onRetake:    () -> Unit,
    label:       String
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        // Instruction
        Surface(
            shape    = RoundedCornerShape(10.dp),
            color    = MaterialTheme.colorScheme.surfaceVariant,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier              = Modifier.padding(12.dp),
                verticalAlignment     = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Icon(Icons.Default.Info, null,
                    tint     = NeutralMid,
                    modifier = Modifier.size(16.dp))
                Text(
                    text  = when {
                        label.contains("Indoor", ignoreCase = true) ->
                            "Mundur cukup jauh agar seluruh unit indoor masuk frame. Foto dari depan secara lurus."
                        label.contains("Outdoor", ignoreCase = true) ->
                            "Foto seluruh unit outdoor dari depan. Tampilkan kondisi awal sebelum mulai bekerja."
                        else -> "Ambil foto yang jelas dan terang."
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = NeutralMid,
                    lineHeight = androidx.compose.ui.unit.TextUnit.Unspecified
                )
            }
        }

        // Photo section
        PhotoSection(
            photo        = photo,
            quality      = quality,
            onOpenCamera = onOpenCamera,
            onRetake     = onRetake,
            label        = label
        )
    }
}

// ── Step type content composables ─────────────────────────────────────────────

@Composable
fun NumericFormPhotoContent(
    inputValue:       String,
    inputUnit:        String,
    photo:            Bitmap?,
    quality:          PhotoQuality.Result?,
    onValueChange:    (String) -> Unit,
    onOpenCamera:     () -> Unit,
    onRetake:         () -> Unit,
    thresholdError:   String? = null,
    thresholdWarning: String? = null
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        OutlinedTextField(
            value         = inputValue,
            onValueChange = onValueChange,
            label         = { Text("Nilai pengukuran") },
            suffix        = if (inputUnit.isNotEmpty()) {{ Text(inputUnit) }} else null,
            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                keyboardType = KeyboardType.Decimal
            ),
            singleLine = true,
            modifier   = Modifier.fillMaxWidth()
        )

        thresholdError?.let { errorMsg ->
            Surface(
                shape    = RoundedCornerShape(10.dp),
                color    = BrandError.copy(alpha = 0.06f),
                border   = BorderStroke(1.dp, BrandError.copy(alpha = 0.4f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier              = Modifier.padding(12.dp),
                    verticalAlignment     = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Icon(Icons.Default.Block, null,
                        tint = BrandError, modifier = Modifier.size(18.dp))
                    Text(text = errorMsg,
                        style = MaterialTheme.typography.bodySmall,
                        color = BrandError)
                }
            }
        }

        thresholdWarning?.let { warnMsg ->
            Surface(
                shape    = RoundedCornerShape(10.dp),
                color    = BrandWarning.copy(alpha = 0.06f),
                border   = BorderStroke(1.dp, BrandWarning.copy(alpha = 0.4f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier              = Modifier.padding(12.dp),
                    verticalAlignment     = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Icon(Icons.Default.Warning, null,
                        tint = BrandWarning, modifier = Modifier.size(18.dp))
                    Text(text = warnMsg,
                        style = MaterialTheme.typography.bodySmall,
                        color = BrandWarning)
                }
            }
        }

        PhotoSection(
            photo        = photo,
            quality      = quality,
            onOpenCamera = onOpenCamera,
            onRetake     = onRetake,
            label        = "Foto alat ukur"
        )
    }
}

@Composable
fun ConditionalPhotoContent(
    isAbnormal:   Boolean,
    photo:        Bitmap?,
    quality:      PhotoQuality.Result?,
    onCondition:  (Boolean) -> Unit,
    onOpenCamera: () -> Unit,
    onRetake:     () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(text = "Kondisi:",
            style = MaterialTheme.typography.bodySmall, color = NeutralMid)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            ConditionChip("Normal",              !isAbnormal, BrandSecondary,
                { onCondition(false) }, Modifier.weight(1f))
            ConditionChip("Tidak Normal / Rusak", isAbnormal, BrandError,
                { onCondition(true)  }, Modifier.weight(1f))
        }
        if (isAbnormal) {
            PhotoSection(photo, quality, onOpenCamera, onRetake, "Foto kondisi tidak normal")
        } else {
            Surface(
                shape    = RoundedCornerShape(10.dp),
                color    = BrandSecondary.copy(alpha = 0.08f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier              = Modifier.padding(16.dp),
                    verticalAlignment     = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(Icons.Default.CheckCircle, null,
                        tint = BrandSecondary, modifier = Modifier.size(20.dp))
                    Text("Kondisi normal — tidak perlu foto",
                        style = MaterialTheme.typography.bodySmall,
                        color = BrandSecondary)
                }
            }
        }
    }
}

@Composable
fun ChecklistOnlyContent(
    isChecked: Boolean,
    label:     String,
    onToggle:  (Boolean) -> Unit
) {
    Surface(
        onClick  = { onToggle(!isChecked) },
        shape    = RoundedCornerShape(12.dp),
        border   = BorderStroke(2.dp, if (isChecked) BrandSecondary else NeutralBorder),
        color    = if (isChecked) BrandSecondary.copy(alpha = 0.08f) else Color.White,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier              = Modifier.padding(16.dp),
            verticalAlignment     = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Checkbox(
                checked         = isChecked,
                onCheckedChange = onToggle,
                colors          = CheckboxDefaults.colors(checkedColor = BrandSecondary)
            )
            Text(
                text       = "Langkah ini sudah selesai dilakukan",
                style      = MaterialTheme.typography.bodyLarge,
                color      = if (isChecked) BrandSecondary else NeutralDark,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@Composable
fun ChecklistPhotoContent(
    isChecked:    Boolean,
    label:        String,
    photo:        Bitmap?,
    quality:      PhotoQuality.Result?,
    onToggle:     (Boolean) -> Unit,
    onOpenCamera: () -> Unit,
    onRetake:     () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        ChecklistOnlyContent(isChecked, label, onToggle)
        if (isChecked) {
            PhotoSection(photo, quality, onOpenCamera, onRetake, "Foto bukti")
        }
    }
}

@Composable
fun ChecklistConditionalContent(
    isOk:         Boolean,
    photo:        Bitmap?,
    quality:      PhotoQuality.Result?,
    onCondition:  (Boolean) -> Unit,
    onOpenCamera: () -> Unit,
    onRetake:     () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Hasil pemeriksaan:",
            style = MaterialTheme.typography.bodySmall, color = NeutralMid)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            ConditionChip("OK / Normal",  isOk,  BrandSecondary,
                { onCondition(true)  }, Modifier.weight(1f))
            ConditionChip("Bermasalah",  !isOk, BrandError,
                { onCondition(false) }, Modifier.weight(1f))
        }
        if (!isOk) {
            PhotoSection(photo, quality, onOpenCamera, onRetake,
                "Foto masalah yang ditemukan")
        }
    }
}

@Composable
fun DynamicFindingPhotoContent(
    inputValue:    String,
    photo:         Bitmap?,
    quality:       PhotoQuality.Result?,
    onValueChange: (String) -> Unit,
    onOpenCamera:  () -> Unit,
    onRetake:      () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Surface(
            shape    = RoundedCornerShape(10.dp),
            color    = NeutralLight,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier              = Modifier.padding(12.dp),
                verticalAlignment     = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Icon(Icons.Default.Info, null,
                    tint = NeutralMid, modifier = Modifier.size(18.dp))
                Text(
                    "Isi hanya jika ada temuan atau kerusakan. Jika tidak ada, langsung selesaikan.",
                    style = MaterialTheme.typography.bodySmall, color = NeutralMid)
            }
        }

        OutlinedTextField(
            value         = inputValue,
            onValueChange = onValueChange,
            label         = { Text("Catatan temuan (opsional)") },
            placeholder   = { Text("Contoh: kondensor kotor, freon habis...") },
            minLines      = 3,
            maxLines      = 6,
            modifier      = Modifier.fillMaxWidth()
        )

        if (inputValue.isNotBlank()) {
            Surface(
                shape    = RoundedCornerShape(10.dp),
                color    = BrandWarning.copy(alpha = 0.06f),
                border   = BorderStroke(1.dp, BrandWarning.copy(alpha = 0.3f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier            = Modifier.padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Row(
                        verticalAlignment      = Alignment.CenterVertically,
                        horizontalArrangement  = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(Icons.Default.Warning, null,
                            tint = BrandWarning, modifier = Modifier.size(16.dp))
                        Text("Foto temuan wajib dilampirkan",
                            style = MaterialTheme.typography.labelMedium,
                            color = BrandWarning, fontWeight = FontWeight.SemiBold)
                    }
                    Text("Ambil foto yang menunjukkan kondisi kerusakan",
                        style = MaterialTheme.typography.bodySmall,
                        color = BrandWarning.copy(alpha = 0.8f))
                }
            }
            PhotoSection(photo, quality, onOpenCamera, onRetake, "Foto bukti temuan kerusakan")
        }
    }
}

// ── Shared components ─────────────────────────────────────────────────────────

@Composable
fun ConditionChip(
    label:    String,
    selected: Boolean,
    color:    androidx.compose.ui.graphics.Color,
    onClick:  () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        onClick  = onClick,
        shape    = RoundedCornerShape(10.dp),
        border   = BorderStroke(2.dp, if (selected) color else NeutralBorder),
        color    = if (selected) color.copy(alpha = 0.1f) else Color.White,
        modifier = modifier
    ) {
        Box(modifier = Modifier.padding(vertical = 14.dp),
            contentAlignment = Alignment.Center) {
            Text(label,
                style      = MaterialTheme.typography.bodySmall,
                color      = if (selected) color else NeutralMid,
                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal)
        }
    }
}

@Composable
fun PhotoSection(
    photo:        Bitmap?,
    quality:      PhotoQuality.Result?,
    onOpenCamera: () -> Unit,
    onRetake:     () -> Unit,
    label:        String
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(label,
            style = MaterialTheme.typography.bodySmall,
            color = NeutralMid, fontWeight = FontWeight.Medium)

        when {
            photo == null -> {
                OutlinedButton(
                    onClick  = onOpenCamera,
                    modifier = Modifier.fillMaxWidth().height(120.dp),
                    shape    = RoundedCornerShape(12.dp)
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.CameraAlt, null, modifier = Modifier.size(32.dp))
                        Text("Ambil Foto")
                    }
                }
            }

            quality != null && quality !is PhotoQuality.Result.Good -> {
                val message = when (quality) {
                    is PhotoQuality.Result.TooDark   -> "Foto terlalu gelap. Cari tempat yang lebih terang."
                    is PhotoQuality.Result.TooBright -> "Foto terlalu terang. Hindari cahaya langsung."
                    is PhotoQuality.Result.Blurry    -> "Foto buram. Tahan HP lebih stabil."
                    is PhotoQuality.Result.Blank     -> "Lensa tertutup. Bersihkan kamera."
                    else -> "Foto tidak valid."
                }
                Surface(
                    shape    = RoundedCornerShape(10.dp),
                    color    = BrandError.copy(alpha = 0.06f),
                    border   = BorderStroke(1.dp, BrandError.copy(alpha = 0.4f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier            = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.Warning, null,
                            tint = BrandError, modifier = Modifier.size(28.dp))
                        Text(message,
                            style = MaterialTheme.typography.bodySmall, color = BrandError)
                        Button(onClick = onRetake,
                            colors = ButtonDefaults.buttonColors(containerColor = BrandError)) {
                            Text("Ulangi Foto")
                        }
                    }
                }
            }

            else -> {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Image(
                        bitmap             = photo!!.asImageBitmap(),
                        contentDescription = "Foto langkah",
                        contentScale       = ContentScale.Crop,
                        modifier           = Modifier
                            .fillMaxWidth()
                            .height(220.dp)
                            .clip(RoundedCornerShape(12.dp))
                    )
                    Row(
                        verticalAlignment     = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier              = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            verticalAlignment     = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(Icons.Default.CheckCircle, null,
                                tint = BrandSecondary, modifier = Modifier.size(16.dp))
                            Text("Foto berhasil",
                                style = MaterialTheme.typography.labelSmall, color = BrandSecondary)
                        }
                        TextButton(onClick = onRetake) {
                            Text("Ulangi", color = NeutralMid)
                        }
                    }
                }
            }
        }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

private fun sectionLabel(section: String) = when (section) {
    "kedatangan"          -> "1. Kedatangan"
    "pengecekan_ac"       -> "2. Pengecekan AC"
    "persiapan_pencucian" -> "3. Persiapan Pencucian"
    "pencucian_indoor"    -> "4. Pencucian Indoor"
    "pencucian_outdoor"   -> "5. Pencucian Outdoor"
    "pengecekan_akhir"    -> "6. Pengecekan Akhir"
    "dokumentasi_akhir"   -> "7. Dokumentasi Akhir"
    "laporan_kerusakan"   -> "8. Laporan Kerusakan"
    else                  -> section
}