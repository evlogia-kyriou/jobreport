package com.milba_Ittech.jobreport.ui.screens.projectsignature

import android.graphics.Bitmap
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.milba_Ittech.jobreport.ui.components.AppTopBar
import com.milba_Ittech.jobreport.ui.components.OliveTitleBlock
import com.milba_Ittech.jobreport.ui.components.SignaturePad
import com.milba_Ittech.jobreport.ui.theme.*

// ── Screen ────────────────────────────────────────────────────────────────────
//
// Shown after ALL tickets in a multi-ticket project have been submitted.
// Any assigned technician can collect this final project-level PIC signature.
// A DB unique constraint on project_tickets.id ensures only one signature
// is ever saved, even if two technicians reach this screen simultaneously.

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProjectFinalSignatureScreen(
    viewModel:    ProjectFinalSignatureViewModel,
    projectId:    String,
    projectNumber: String,
    technicianId: String,
    locationName: String,
    totalAcUnits: Int,
    onSigned:     () -> Unit,
    onBack:       () -> Unit
) {
    val state by viewModel.state.collectAsState()

    // Navigate away as soon as the save completes
    LaunchedEffect(Unit) {
        viewModel.signatureComplete.collect { onSigned() }
    }

    Scaffold(
        topBar = {
            AppTopBar(
                title = {
                    OliveTitleBlock(
                        title    = "Tanda Tangan Selesai Proyek",
                        subtitle = projectNumber
                    )
                },
                onBack = onBack
            )
        }
    ) { padding ->
        Column(
            modifier            = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {

            // Project completion banner
            Surface(
                shape    = RoundedCornerShape(12.dp),
                color    = BrandPrimary.copy(alpha = 0.08f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier          = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Groups,
                        contentDescription = null,
                        tint     = BrandPrimary,
                        modifier = Modifier.size(28.dp)
                    )
                    Column {
                        Text(
                            text       = "Semua pekerjaan proyek selesai ✅",
                            style      = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.SemiBold,
                            color      = BrandPrimary
                        )
                        Text(
                            text  = "$locationName · $totalAcUnits unit AC",
                            style = MaterialTheme.typography.bodySmall,
                            color = NeutralMid
                        )
                    }
                }
            }

            // Instruction text
            Text(
                text  = "Minta tanda tangan PIC klien untuk mengkonfirmasi seluruh pekerjaan proyek telah selesai.",
                style = MaterialTheme.typography.bodyMedium,
                color = NeutralDark,
                textAlign = TextAlign.Start
            )

            // Error banner
            state.error?.let { errorMsg ->
                Surface(
                    shape    = RoundedCornerShape(8.dp),
                    color    = BrandError.copy(alpha = 0.08f),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text     = errorMsg,
                        color    = BrandError,
                        style    = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }

            // PIC name field
            OutlinedTextField(
                value         = state.picName,
                onValueChange = viewModel::updatePicName,
                label         = { Text("Nama PIC Klien *") },
                placeholder   = { Text("Ahmad Wijaya") },
                singleLine    = true,
                modifier      = Modifier.fillMaxWidth()
            )

            // Signature pad
            var signatureBitmap by remember { mutableStateOf<Bitmap?>(null) }

            Text(
                text  = "Tanda tangan PIC klien:",
                style = MaterialTheme.typography.bodySmall,
                color = NeutralMid,
                fontWeight = FontWeight.Medium
            )

            SignaturePad(
                modifier = Modifier.fillMaxWidth(),
                onSigned = { bitmap -> signatureBitmap = bitmap },
                onClear  = { signatureBitmap = null }
            )

            Spacer(Modifier.weight(1f))

            // Submit button
            Button(
                onClick = {
                    signatureBitmap?.let { bmp ->
                        viewModel.saveProjectSignature(
                            projectId    = projectId,
                            technicianId = technicianId,
                            bitmap       = bmp
                        )
                    }
                },
                enabled  = signatureBitmap != null &&
                        state.picName.isNotBlank() &&
                        !state.isLoading,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
            ) {
                if (state.isLoading) {
                    CircularProgressIndicator(
                        color       = Color.White,
                        modifier    = Modifier.size(20.dp),
                        strokeWidth = 2.dp
                    )
                    Spacer(Modifier.width(8.dp))
                    Text("Menyimpan...")
                } else {
                    Text("Konfirmasi Selesai Proyek")
                }
            }
        }
    }
}