package com.milba_Ittech.jobreport.ui.screens.acunit

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.milba_Ittech.jobreport.data.AppState
import com.milba_Ittech.jobreport.domain.model.AcUnitWithDisplay
import com.milba_Ittech.jobreport.ui.components.AppTopBar
import com.milba_Ittech.jobreport.ui.components.CameraView
import com.milba_Ittech.jobreport.ui.components.OliveTitleBlock
import com.milba_Ittech.jobreport.ui.theme.*
import com.milba_Ittech.jobreport.util.PhotoQuality

// ── Phase enum ────────────────────────────────────────────────────────────────

private enum class PhotoPhase { INDOOR, OUTDOOR, DONE }

// ── Screen ────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UnitPhotoScreen(
    acUnitId:    String,
    acUnit:      AcUnitWithDisplay,
    onCompleted: () -> Unit,
    onBack:      () -> Unit
) {
    var phase         by remember { mutableStateOf(PhotoPhase.INDOOR) }
    var indoorPhoto   by remember { mutableStateOf<Bitmap?>(AppState.unitIndoorPhotos[acUnitId]) }
    var outdoorPhoto  by remember { mutableStateOf<Bitmap?>(AppState.unitOutdoorPhotos[acUnitId]) }
    var showCamera    by remember { mutableStateOf(false) }
    var qualityError  by remember { mutableStateOf<String?>(null) }

    // If both photos already taken → skip this screen
    LaunchedEffect(Unit) {
        if (indoorPhoto != null && outdoorPhoto != null) {
            onCompleted()
            return@LaunchedEffect
        }
        // Auto-open camera for the current phase
        showCamera = true
    }

    // Camera fullscreen
    if (showCamera) {
        CameraView(
            onPhotoTaken = { bitmap ->
                val quality = PhotoQuality.check(bitmap)
                when {
                    quality !is PhotoQuality.Result.Good -> {
                        qualityError = when (quality) {
                            is PhotoQuality.Result.TooDark   -> "Foto terlalu gelap. Cari tempat yang lebih terang."
                            is PhotoQuality.Result.TooBright -> "Foto terlalu terang. Hindari cahaya langsung."
                            is PhotoQuality.Result.Blurry    -> "Foto buram. Tahan HP lebih stabil."
                            else                             -> "Foto tidak valid. Coba lagi."
                        }
                        showCamera = false
                    }
                    phase == PhotoPhase.INDOOR -> {
                        indoorPhoto = bitmap
                        AppState.unitIndoorPhotos[acUnitId] = bitmap
                        qualityError = null
                        showCamera = false
                        phase = PhotoPhase.OUTDOOR
                        // Auto-open for outdoor
                        showCamera = true
                    }
                    phase == PhotoPhase.OUTDOOR -> {
                        outdoorPhoto = bitmap
                        AppState.unitOutdoorPhotos[acUnitId] = bitmap
                        qualityError = null
                        showCamera = false
                        phase = PhotoPhase.DONE
                    }
                    else -> showCamera = false
                }
            },
            onClose = {
                showCamera = false
            }
        )
        return
    }

    Scaffold(
        topBar = {
            AppTopBar(
                title = {
                    OliveTitleBlock(
                        title    = acUnit.displayName,
                        subtitle = "Foto identitas unit"
                    )
                },
                onBack = onBack
            )
        },
        bottomBar = {
            Surface(shadowElevation = 8.dp) {
                Column(modifier = Modifier.padding(16.dp)) {
                    when (phase) {
                        PhotoPhase.INDOOR -> {
                            // Show retake if quality failed
                            if (qualityError != null) {
                                Text(
                                    text  = qualityError!!,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = BrandError,
                                    modifier = Modifier.padding(bottom = 8.dp)
                                )
                            }
                            Button(
                                onClick  = { showCamera = true },
                                modifier = Modifier.fillMaxWidth().height(52.dp)
                            ) {
                                Icon(Icons.Default.CameraAlt, null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text(if (qualityError != null) "Ulangi Foto Indoor" else "Ambil Foto Unit Indoor")
                            }
                        }
                        PhotoPhase.OUTDOOR -> {
                            if (qualityError != null) {
                                Text(
                                    text  = qualityError!!,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = BrandError,
                                    modifier = Modifier.padding(bottom = 8.dp)
                                )
                            }
                            Button(
                                onClick  = { showCamera = true },
                                modifier = Modifier.fillMaxWidth().height(52.dp)
                            ) {
                                Icon(Icons.Default.CameraAlt, null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text(if (qualityError != null) "Ulangi Foto Outdoor" else "Ambil Foto Unit Outdoor")
                            }
                        }
                        PhotoPhase.DONE -> {
                            Button(
                                onClick  = onCompleted,
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                                colors   = ButtonDefaults.buttonColors(
                                    containerColor = BrandSecondary
                                )
                            ) {
                                Icon(Icons.AutoMirrored.Filled.ArrowForward, null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Mulai Pengerjaan SOP")
                            }
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
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Instruction card
            Surface(
                shape    = RoundedCornerShape(12.dp),
                color    = BrandPrimary.copy(alpha = 0.06f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier              = Modifier.padding(14.dp),
                    verticalAlignment     = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Icon(Icons.Default.Info, null, tint = BrandPrimary, modifier = Modifier.size(20.dp))
                    Text(
                        text  = "Ambil foto unit AC indoor dan outdoor sebagai identitas sebelum memulai pengerjaan.",
                        style = MaterialTheme.typography.bodySmall,
                        color = BrandPrimary
                    )
                }
            }

            // Progress indicator
            Row(
                modifier              = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                PhaseChip(
                    label     = "1. Indoor",
                    isDone    = indoorPhoto != null,
                    isActive  = phase == PhotoPhase.INDOOR,
                    modifier  = Modifier.weight(1f)
                )
                PhaseChip(
                    label     = "2. Outdoor",
                    isDone    = outdoorPhoto != null,
                    isActive  = phase == PhotoPhase.OUTDOOR,
                    modifier  = Modifier.weight(1f)
                )
            }

            // Photo previews
            Row(
                modifier              = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                PhotoPreview(
                    photo    = indoorPhoto,
                    label    = "Unit Indoor",
                    modifier = Modifier.weight(1f)
                )
                PhotoPreview(
                    photo    = outdoorPhoto,
                    label    = "Unit Outdoor",
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

// ── Sub-composables ───────────────────────────────────────────────────────────

@Composable
private fun PhaseChip(
    label:    String,
    isDone:   Boolean,
    isActive: Boolean,
    modifier: Modifier = Modifier
) {
    val color = when {
        isDone   -> BrandSecondary
        isActive -> BrandPrimary
        else     -> NeutralBorder
    }
    Surface(
        shape    = RoundedCornerShape(8.dp),
        color    = color.copy(alpha = 0.1f),
        modifier = modifier
    ) {
        Row(
            modifier              = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            verticalAlignment     = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Icon(
                imageVector = if (isDone) Icons.Default.CheckCircle
                else        Icons.Default.RadioButtonUnchecked,
                null,
                tint     = color,
                modifier = Modifier.size(14.dp)
            )
            Text(
                text  = label,
                style = MaterialTheme.typography.labelSmall,
                color = color,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@Composable
private fun PhotoPreview(
    photo:    Bitmap?,
    label:    String,
    modifier: Modifier = Modifier
) {
    Column(
        modifier            = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        if (photo != null) {
            Image(
                bitmap             = photo.asImageBitmap(),
                contentDescription = label,
                contentScale       = ContentScale.Crop,
                modifier           = Modifier
                    .fillMaxWidth()
                    .aspectRatio(4f / 3f)
                    .clip(RoundedCornerShape(10.dp))
            )
        } else {
            Surface(
                shape    = RoundedCornerShape(10.dp),
                color    = NeutralBorder.copy(alpha = 0.3f),
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(4f / 3f)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(Icons.Default.CameraAlt, null, tint = NeutralMid, modifier = Modifier.size(28.dp))
                        Text(
                            text      = "Belum difoto",
                            style     = MaterialTheme.typography.labelSmall,
                            color     = NeutralMid,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        }
        Text(
            text  = label,
            style = MaterialTheme.typography.labelSmall,
            color = NeutralMid
        )
    }
}