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
import com.milba_Ittech.jobreport.ui.components.CameraView
import com.milba_Ittech.jobreport.ui.theme.*
import com.milba_Ittech.jobreport.util.PhotoQuality
import com.milba_Ittech.jobreport.data.repository.TicketRepository

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StepScreen(
    step:        TicketStep,
    onCompleted: (stepId: String) -> Unit,
    onBack:      () -> Unit
) {
    val context = LocalContext.current
    val ticketRepo = remember { TicketRepository() }
    val viewModel  = viewModel { StepViewModel(ticketRepo) }
    val coroutineScope = rememberCoroutineScope()
    val state     by viewModel.state.collectAsState()

    // ← Add this — resets state whenever a new step is opened
    LaunchedEffect(step.id) {
        viewModel.reset()
    }

    // Show camera fullscreen when active
    /*f (state.showCamera) {
        CameraView(
            onPhotoTaken = viewModel::onPhotoCaptured,
            onClose      = viewModel::closeCamera
        )
        return
    }*/
    if (state.showCamera) {
        CameraView(
            onPhotoTaken = { bitmap ->
                viewModel.onPhotoCaptured(step.id, bitmap)   // ← pass step.id
            },
            onClose      = viewModel::closeCamera
        )
        return
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text  = sectionLabel(step.section),
                        style = MaterialTheme.typography.bodySmall,
                        color = NeutralMid
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Kembali")
                    }
                }
            )
        },
        bottomBar = {
            Surface(shadowElevation = 8.dp) {
                Button(
                    onClick  = {
                        coroutineScope.launch {
                            // Save photo to file if present
                            state.capturedPhoto?.let { bitmap ->
                                /*val file = viewModel.savePhotoToFile(bitmap, context)
                                // File ready for upload to Supabase later
                                // For now just log the path
                                Log.d("StepScreen", "Photo saved: ${file.absolutePath}")*/
                                viewModel.savePhotoToFile(bitmap, context)

                            }
                            onCompleted(step.id)
                        }
                    },
                    enabled  = viewModel.canComplete(step.stepType) && !state.isLoading,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                        .height(52.dp)
                ) {
                    if (state.isLoading) {
                        CircularProgressIndicator(
                            color       = Color.White,
                            modifier    = Modifier.size(20.dp),
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("Selesaikan Langkah")
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

                /*"numeric_form_photo" -> NumericFormPhotoContent(
                    inputValue = state.inputValue,
                    inputUnit  = step.inputUnit ?: "",
                    photo      = state.capturedPhoto,
                    quality    = state.photoQuality,
                    onValueChange = viewModel::updateInputValue,
                    onOpenCamera  = viewModel::openCamera,
                    onRetake      = viewModel::retakePhoto
                )

                "text_conditional_photo" -> ConditionalPhotoContent(
                    isAbnormal    = state.isConditionAbnormal,
                    photo         = state.capturedPhoto,
                    quality       = state.photoQuality,
                    onCondition   = viewModel::setConditionAbnormal,
                    onOpenCamera  = viewModel::openCamera,
                    onRetake      = viewModel::retakePhoto
                )

                "checklist_only" -> ChecklistOnlyContent(
                    isChecked = state.isChecked,
                    label     = step.description,
                    onToggle  = viewModel::setChecked
                )

                "checklist_photo" -> ChecklistPhotoContent(
                    isChecked    = state.isChecked,
                    label        = step.description,
                    photo        = state.capturedPhoto,
                    quality      = state.photoQuality,
                    onToggle     = viewModel::setChecked,
                    onOpenCamera = viewModel::openCamera,
                    onRetake     = viewModel::retakePhoto
                )

                "checklist_conditional_photo" -> ChecklistConditionalContent(
                    isOk         = state.isChecked,
                    photo        = state.capturedPhoto,
                    quality      = state.photoQuality,
                    onCondition  = viewModel::setChecked,
                    onOpenCamera = viewModel::openCamera,
                    onRetake     = viewModel::retakePhoto
                )*/

                "numeric_form_photo" -> NumericFormPhotoContent(
                    inputValue    = state.inputValue,
                    inputUnit     = step.inputUnit ?: "",
                    photo         = state.capturedPhoto,
                    quality       = state.photoQuality,
                    onValueChange = { viewModel.updateInputValue(step.id, it) },
                    onOpenCamera  = viewModel::openCamera,
                    onRetake      = { viewModel.retakePhoto(step.id) }
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

                else -> {
                    // dynamic_finding or unknown — just show complete button
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

// ── Step type content composables ─────────────────────────────────────────────

@Composable
fun NumericFormPhotoContent(
    inputValue:   String,
    inputUnit:    String,
    photo:        Bitmap?,
    quality:      PhotoQuality.Result?,
    onValueChange: (String) -> Unit,
    onOpenCamera: () -> Unit,
    onRetake:     () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        // Numeric input
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

        // Photo section
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
    isAbnormal:  Boolean,
    photo:       Bitmap?,
    quality:     PhotoQuality.Result?,
    onCondition: (Boolean) -> Unit,
    onOpenCamera: () -> Unit,
    onRetake:    () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        // Condition selector
        Text(
            text  = "Kondisi:",
            style = MaterialTheme.typography.bodySmall,
            color = NeutralMid
        )
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            ConditionChip(
                label     = "Normal",
                selected  = !isAbnormal,
                color     = BrandSecondary,
                onClick   = { onCondition(false) },
                modifier  = Modifier.weight(1f)
            )
            ConditionChip(
                label     = "Tidak Normal / Rusak",
                selected  = isAbnormal,
                color     = BrandError,
                onClick   = { onCondition(true) },
                modifier  = Modifier.weight(1f)
            )
        }

        // Show photo only when abnormal
        if (isAbnormal) {
            PhotoSection(
                photo        = photo,
                quality      = quality,
                onOpenCamera = onOpenCamera,
                onRetake     = onRetake,
                label        = "Foto kondisi tidak normal"
            )
        } else {
            // Normal — show confirmation
            Surface(
                shape  = RoundedCornerShape(10.dp),
                color  = BrandSecondary.copy(alpha = 0.08f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier          = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        Icons.Default.CheckCircle,
                        null,
                        tint     = BrandSecondary,
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text  = "Kondisi normal — tidak perlu foto",
                        style = MaterialTheme.typography.bodySmall,
                        color = BrandSecondary
                    )
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
        border   = androidx.compose.foundation.BorderStroke(
            2.dp,
            if (isChecked) BrandSecondary else NeutralBorder
        ),
        color    = if (isChecked) BrandSecondary.copy(alpha = 0.08f) else Color.White,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier          = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Checkbox(
                checked         = isChecked,
                onCheckedChange = onToggle,
                colors          = CheckboxDefaults.colors(
                    checkedColor = BrandSecondary
                )
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
    isChecked:   Boolean,
    label:       String,
    photo:       Bitmap?,
    quality:     PhotoQuality.Result?,
    onToggle:    (Boolean) -> Unit,
    onOpenCamera: () -> Unit,
    onRetake:    () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        ChecklistOnlyContent(
            isChecked = isChecked,
            label     = label,
            onToggle  = onToggle
        )

        if (isChecked) {
            PhotoSection(
                photo        = photo,
                quality      = quality,
                onOpenCamera = onOpenCamera,
                onRetake     = onRetake,
                label        = "Foto bukti"
            )
        }
    }
}

@Composable
fun ChecklistConditionalContent(
    isOk:        Boolean,
    photo:       Bitmap?,
    quality:     PhotoQuality.Result?,
    onCondition: (Boolean) -> Unit,
    onOpenCamera: () -> Unit,
    onRetake:    () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(
            text  = "Hasil pemeriksaan:",
            style = MaterialTheme.typography.bodySmall,
            color = NeutralMid
        )
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            ConditionChip(
                label    = "OK / Normal",
                selected = isOk,
                color    = BrandSecondary,
                onClick  = { onCondition(true) },
                modifier = Modifier.weight(1f)
            )
            ConditionChip(
                label    = "Bermasalah",
                selected = !isOk,
                color    = BrandError,
                onClick  = { onCondition(false) },
                modifier = Modifier.weight(1f)
            )
        }

        if (!isOk) {
            PhotoSection(
                photo        = photo,
                quality      = quality,
                onOpenCamera = onOpenCamera,
                onRetake     = onRetake,
                label        = "Foto masalah yang ditemukan"
            )
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
        border   = androidx.compose.foundation.BorderStroke(
            2.dp,
            if (selected) color else NeutralBorder
        ),
        color    = if (selected) color.copy(alpha = 0.1f) else Color.White,
        modifier = modifier
    ) {
        Box(
            modifier        = Modifier.padding(vertical = 14.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text       = label,
                style      = MaterialTheme.typography.bodySmall,
                color      = if (selected) color else NeutralMid,
                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal
            )
        }
    }
}

@Composable
fun PhotoSection(
    photo:       Bitmap?,
    quality:     PhotoQuality.Result?,
    onOpenCamera: () -> Unit,
    onRetake:    () -> Unit,
    label:       String
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text  = label,
            style = MaterialTheme.typography.bodySmall,
            color = NeutralMid,
            fontWeight = FontWeight.Medium
        )

        when {
            // No photo yet
            photo == null -> {
                OutlinedButton(
                    onClick  = onOpenCamera,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(120.dp),
                    shape    = RoundedCornerShape(12.dp)
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Default.CameraAlt,
                            null,
                            modifier = Modifier.size(32.dp)
                        )
                        Text("Ambil Foto")
                    }
                }
            }

            // Photo taken but quality failed
            quality != null && quality !is PhotoQuality.Result.Good -> {
                val message = when (quality) {
                    is PhotoQuality.Result.TooDark   ->
                        "Foto terlalu gelap. Cari tempat yang lebih terang."
                    is PhotoQuality.Result.TooBright ->
                        "Foto terlalu terang. Hindari cahaya langsung."
                    is PhotoQuality.Result.Blurry    ->
                        "Foto buram. Tahan HP lebih stabil."
                    is PhotoQuality.Result.Blank     ->
                        "Lensa tertutup. Bersihkan kamera."
                    else -> "Foto tidak valid."
                }

                Surface(
                    shape  = RoundedCornerShape(10.dp),
                    color  = BrandError.copy(alpha = 0.06f),
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp, BrandError.copy(alpha = 0.4f)
                    ),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier            = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Default.Warning,
                            null,
                            tint     = BrandError,
                            modifier = Modifier.size(28.dp)
                        )
                        Text(
                            text  = message,
                            style = MaterialTheme.typography.bodySmall,
                            color = BrandError
                        )
                        Button(
                            onClick = onRetake,
                            colors  = ButtonDefaults.buttonColors(
                                containerColor = BrandError
                            )
                        ) {
                            Text("Ulangi Foto")
                        }
                    }
                }
            }

            // Photo taken and good
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
                        verticalAlignment      = Alignment.CenterVertically,
                        horizontalArrangement  = Arrangement.SpaceBetween,
                        modifier               = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            verticalAlignment      = Alignment.CenterVertically,
                            horizontalArrangement  = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                Icons.Default.CheckCircle,
                                null,
                                tint     = BrandSecondary,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text  = "Foto berhasil",
                                style = MaterialTheme.typography.labelSmall,
                                color = BrandSecondary
                            )
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
    "kedatangan"        -> "1. Kedatangan"
    "pencucian_indoor"  -> "2. Pencucian — Indoor"
    "pencucian_outdoor" -> "3. Pencucian — Outdoor"
    "penyelesaian"      -> "4. Penyelesaian"
    "laporan_kerusakan" -> "5. Laporan Kerusakan"
    else                -> section
}