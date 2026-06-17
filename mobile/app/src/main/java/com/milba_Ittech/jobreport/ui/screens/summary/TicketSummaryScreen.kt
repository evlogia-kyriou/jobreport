package com.milba_Ittech.jobreport.ui.screens.summary

import android.graphics.Bitmap
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.runtime.getValue
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.unit.dp
import com.milba_Ittech.jobreport.data.AppState
import com.milba_Ittech.jobreport.domain.model.TicketStep
import com.milba_Ittech.jobreport.ui.theme.*



@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TicketSummaryScreen(
    ticketId:  String,
    ticketTitle: String = "Detail Pekerjaan",
    onBack: () -> Unit
) {
    val submitTime   = AppState.submittedAt[ticketId] ?: ""
    val AcUnitCount  = AppState.completedAcUnits.size

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text       = ticketTitle,
                            style      = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text  = "Selesai $submitTime",
                            style = MaterialTheme.typography.labelSmall,
                            color = BrandSecondary
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Kembali")
                    }
                }
            )
        }
    ) { padding ->

        LazyColumn(
            contentPadding      = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier            = Modifier.padding(padding)
        ) {

            // Status badge
            item {
                Surface(
                    shape  = RoundedCornerShape(12.dp),
                    color  = BrandSecondary.copy(alpha = 0.1f),
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
                            modifier = Modifier.size(32.dp)
                        )
                        Column {
                            Text(
                                text       = "Laporan Selesai",
                                style      = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.Bold,
                                color      = BrandSecondary
                            )
                            Text(
                                text  = "${AcUnitCount} unit AC dicuci",
                                style = MaterialTheme.typography.bodySmall,
                                color = NeutralMid
                            )
                        }
                    }
                }
            }

            // Each AC unit
            items(AppState.completedAcUnits) { AcUnitId ->
                AcUnitSummaryCard(AcUnitId = AcUnitId)
            }
            item {
                SignaturesSummaryCard()
            }
        }
    }
}

@Composable
fun AcUnitSummaryCard(AcUnitId: String) {

    Surface(
        shape    = RoundedCornerShape(12.dp),
        border   = BorderStroke(1.dp, BrandSecondary.copy(alpha = 0.3f)),
        color    = Color.White,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {

            // AC unit header
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    Icons.Default.CheckCircle,
                    null,
                    tint     = BrandSecondary,
                    modifier = Modifier.size(20.dp)
                )
                Column {
                    Text(
                        text       = "Unit AC: $AcUnitId",
                        style      = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.SemiBold,
                        color      = NeutralDark
                    )
                }
            }
            // Show photos captured for this AC unit (from AppState)
            val photos = AppState.stepPhotos.entries
                .filter { it.key.contains(AcUnitId) }

            if (photos.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                Text(
                    text  = "${photos.size} foto diambil",
                    style = MaterialTheme.typography.labelSmall,
                    color = NeutralMid
                )
            }
        }
    }
}




@Composable
fun StepSummaryRow(step: TicketStep) {
    val inputValue = AppState.stepInputValues[step.id]
    val photo      = AppState.stepPhotos[step.id]
    val isAbnormal = AppState.stepConditions[step.id] ?: false
    val isChecked  = AppState.stepChecked[step.id] ?: false

    Surface(
        shape  = RoundedCornerShape(8.dp),
        color  = NeutralLight,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Step name + check
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    Icons.Default.CheckCircle,
                    null,
                    tint     = BrandSecondary,
                    modifier = Modifier.size(14.dp)
                )
                Text(
                    text  = "${step.orderNumber}. ${step.description}",
                    style = MaterialTheme.typography.bodySmall,
                    color = NeutralDark,
                    fontWeight = FontWeight.Medium
                )
            }

            // Show answer based on step type
            when (step.stepType) {

                "numeric_form_photo" -> {
                    if (inputValue != null) {
                        Text(
                            text  = "Nilai: $inputValue ${step.inputUnit ?: ""}",
                            style = MaterialTheme.typography.bodySmall,
                            color = BrandPrimary,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }

                "text_conditional_photo",
                "checklist_conditional_photo" -> {
                    val conditionText = if (step.stepType == "text_conditional_photo") {
                        if (isAbnormal) "Tidak Normal / Rusak" else "Normal"
                    } else {
                        if (isChecked) "OK / Normal" else "Bermasalah"
                    }
                    val conditionColor = when {
                        isAbnormal || !isChecked -> BrandError
                        else                     -> BrandSecondary
                    }
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = conditionColor.copy(alpha = 0.1f)
                    ) {
                        Text(
                            text     = conditionText,
                            style    = MaterialTheme.typography.labelSmall,
                            color    = conditionColor,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }
                }

                "checklist_only",
                "checklist_photo" -> {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = BrandSecondary.copy(alpha = 0.1f)
                    ) {
                        Text(
                            text     = "Selesai dilakukan",
                            style    = MaterialTheme.typography.labelSmall,
                            color    = BrandSecondary,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }
                }
            }

            // Photo
            if (photo != null) {
                Image(
                    bitmap             = photo.asImageBitmap(),
                    contentDescription = "Foto ${step.description}",
                    contentScale       = ContentScale.Crop,
                    modifier           = Modifier
                        .fillMaxWidth()
                        .height(180.dp)
                        .clip(RoundedCornerShape(8.dp))
                )
            }
        }
    }
}

@Composable
fun SignaturesSummaryCard() {
    val techName      by AppState.technicianName
    val techSignature by AppState.technicianSignature
    val clientName    by AppState.picName
    val clientSignature by AppState.picSignature

    Surface(
        shape    = RoundedCornerShape(12.dp),
        border   = BorderStroke(1.dp, NeutralBorder),
        color    = Color.White,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier            = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Header
            Row(
                verticalAlignment     = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    Icons.Default.Draw,
                    null,
                    tint     = BrandPrimary,
                    modifier = Modifier.size(20.dp)
                )
                Text(
                    text       = "Tanda Tangan",
                    style      = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.SemiBold,
                    color      = NeutralDark
                )
            }

            HorizontalDivider(color = NeutralBorder)

            // Technician signature
            SignatureBlock(
                label     = "Teknisi",
                name      = techName,
                signature = techSignature
            )

            HorizontalDivider(color = NeutralBorder)

            // PIC signature
            SignatureBlock(
                label     = "PIC Klien",
                name      = clientName.ifBlank { "Tidak ada tanda tangan PIC" },
                signature = clientSignature
            )
        }
    }
}

@Composable
fun SignatureBlock(
    label:     String,
    name:      String,
    signature: Bitmap?
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {

        // Label + Name row
        Row(
            modifier              = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment     = Alignment.CenterVertically
        ) {
            Text(
                text  = label,
                style = MaterialTheme.typography.bodySmall,
                color = NeutralMid
            )
            Text(
                text       = name,
                style      = MaterialTheme.typography.bodySmall,
                color      = NeutralDark,
                fontWeight = FontWeight.SemiBold
            )
        }

        // Signature image or placeholder
        if (signature != null) {
            Surface(
                shape    = RoundedCornerShape(8.dp),
                border   = BorderStroke(1.dp, NeutralBorder),
                color    = Color.White,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp)
            ) {
                Image(
                    bitmap             = signature.asImageBitmap(),
                    contentDescription = "Tanda tangan $label",
                    contentScale       = ContentScale.Fit,
                    modifier           = Modifier
                        .fillMaxSize()
                        .padding(8.dp)
                )
            }
        } else {
            Surface(
                shape    = RoundedCornerShape(8.dp),
                color    = NeutralLight,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(80.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text  = "Tidak ada tanda tangan",
                        style = MaterialTheme.typography.bodySmall,
                        color = NeutralMid
                    )
                }
            }
        }
    }
}

private fun sectionLabel(section: String) = when (section) {
    "kedatangan"        -> "1. Kedatangan"
    "pencucian_indoor"  -> "2. Pencucian — Indoor"
    "pencucian_outdoor" -> "3. Pencucian — Outdoor"
    "penyelesaian"      -> "4. Penyelesaian"
    else                -> section
}