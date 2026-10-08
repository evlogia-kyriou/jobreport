package com.milba_Ittech.jobreport.ui.screens.signature

import android.graphics.Bitmap
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import com.milba_Ittech.jobreport.ui.components.AppTopBar
import com.milba_Ittech.jobreport.ui.components.OliveTitleBlock
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.milba_Ittech.jobreport.ui.components.SignaturePad
import com.milba_Ittech.jobreport.ui.theme.*
import com.milba_Ittech.jobreport.domain.model.Technician

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SignatureScreen(
    viewModel:       SignatureViewModel,
    ticketId:        String,
    technician:      Technician,
    AcUnitCount:     Int,
    locationAddress: String,
    onSubmitted:     () -> Unit,
    onBack:          () -> Unit
) {
    val state by viewModel.state.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.submissionComplete.collect { onSubmitted() }
    }

    Scaffold(
        topBar = {
            AppTopBar(
                title = {
                    OliveTitleBlock(
                        title = if (state.step == SignatureStep.TECHNICIAN)
                            "Tanda Tangan Teknisi" else "Tanda Tangan Klien"
                    )
                },
                onBack = if (state.step == SignatureStep.TECHNICIAN) onBack else null
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Completion badge
            Surface(
                shape    = RoundedCornerShape(12.dp),
                color    = BrandSecondary.copy(alpha = 0.1f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier              = Modifier.padding(12.dp),
                    verticalAlignment     = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(Icons.Default.CheckCircle, null,
                        tint = BrandSecondary, modifier = Modifier.size(22.dp))
                    Column {
                        Text("Semua $AcUnitCount unit AC selesai ✅",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold, color = BrandSecondary)
                        Text(locationAddress,
                            style = MaterialTheme.typography.bodySmall, color = NeutralMid)
                    }
                }
            }

            // Error banner
            state.error?.let { errorMsg ->
                Surface(
                    shape    = RoundedCornerShape(8.dp),
                    color    = BrandError.copy(alpha = 0.08f),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(errorMsg, color = BrandError,
                            style = MaterialTheme.typography.bodySmall)
                        Spacer(Modifier.height(8.dp))
                        TextButton(
                            onClick  = { viewModel.clearError() },
                            modifier = Modifier.align(Alignment.End)
                        ) { Text("Coba Lagi", color = BrandError) }
                    }
                }
            }

            // Step content
            when (state.step) {
                SignatureStep.TECHNICIAN -> TechnicianSignatureStep(
                    technicianName = technician.name,
                    isLoading      = state.isLoading,
                    onSigned       = { bitmap ->
                        viewModel.saveTechnicianSignature(
                            ticketId       = ticketId,
                            technicianId   = technician.id,
                            picName        = state.picName,
                            signatureBytes = bitmapToBytes(bitmap)
                        )
                    }
                )

                SignatureStep.PIC -> {
                    // ← Hoist bitmap state to parent so it survives
                    //   recomposition when error appears ✅
                    var picBitmap by remember { mutableStateOf<Bitmap?>(null) }

                    PicSignatureStep(
                        picName           = state.picName,
                        isLoading         = state.isLoading,
                        signatureBitmap   = picBitmap,          // ← pass down ✅
                        onSignatureChange = { picBitmap = it }, // ← lift up ✅
                        onPicNameChange   = viewModel::updatePicName,
                        onSigned          = {
                            picBitmap?.let { bmp ->
                                viewModel.savePicAndSubmit(
                                    ticketId       = ticketId,
                                    picName        = state.picName,
                                    signatureBytes = bitmapToBytes(bmp)
                                )
                            }
                        },
                        onPicUnavailable  = { viewModel.proceedWithoutPic(ticketId) }
                    )
                }
            }
        }
    }
}

// ── Technician step ───────────────────────────────────────────────────────────

@Composable
fun TechnicianSignatureStep(
    technicianName: String,
    isLoading:      Boolean,
    onSigned:       (Bitmap) -> Unit
) {
    var signatureBitmap by remember { mutableStateOf<Bitmap?>(null) }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Teknisi: $technicianName",
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = FontWeight.Medium, color = NeutralDark)
        Text("Tanda tangani untuk mengkonfirmasi laporan sudah sesuai:",
            style = MaterialTheme.typography.bodySmall, color = NeutralMid)

        SignaturePad(
            modifier = Modifier.fillMaxWidth().height(200.dp),
            onSigned = { bitmap -> signatureBitmap = bitmap },
            onClear  = { signatureBitmap = null }
        )

        Button(
            onClick  = { signatureBitmap?.let { onSigned(it) } },
            enabled  = signatureBitmap != null && !isLoading,
            modifier = Modifier.fillMaxWidth().height(52.dp)
        ) {
            if (isLoading) {
                CircularProgressIndicator(color = Color.White,
                    modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                Spacer(Modifier.width(8.dp))
                Text("Menyimpan...")
            } else {
                Text("Konfirmasi Tanda Tangan Teknisi")
            }
        }
    }
}

// ── PIC step ──────────────────────────────────────────────────────────────────

@Composable
fun PicSignatureStep(
    picName:           String,
    isLoading:         Boolean,
    signatureBitmap:   Bitmap?,           // ← from parent (hoisted) ✅
    onSignatureChange: (Bitmap?) -> Unit, // ← lifts back to parent ✅
    onPicNameChange:   (String) -> Unit,
    onSigned:          () -> Unit,
    onPicUnavailable:  () -> Unit
) {
    // ← NO local signatureBitmap var — use the parameter directly ✅
    var showUnavailableDialog by remember { mutableStateOf(false) }

    Column(
        modifier            = Modifier.verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Berikan HP ini kepada PIC klien untuk ditandatangani",
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = FontWeight.Medium, color = NeutralDark)

        OutlinedTextField(
            value         = picName,
            onValueChange = onPicNameChange,
            label         = { Text("Nama PIC Klien *") },
            placeholder   = { Text("Ahmad Wijaya") },
            singleLine    = true,
            modifier      = Modifier.fillMaxWidth()
        )

        SignaturePad(
            modifier = Modifier.fillMaxWidth().height(220.dp),
            onSigned = { bitmap -> onSignatureChange(bitmap) }, // ← lift to parent ✅
            onClear  = { onSignatureChange(null) }
        )

        Button(
            onClick  = { onSigned() },
            // ← uses PARAMETER signatureBitmap, not a local var ✅
            enabled  = signatureBitmap != null && picName.isNotBlank() && !isLoading,
            modifier = Modifier.fillMaxWidth().height(52.dp)
        ) {
            if (isLoading) {
                CircularProgressIndicator(color = Color.White,
                    modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                Spacer(Modifier.width(8.dp))
                Text("Mengirim laporan...")
            } else {
                Text("Konfirmasi Tanda Tangan PIC")
            }
        }

        TextButton(
            onClick  = { showUnavailableDialog = true },
            modifier = Modifier.align(Alignment.CenterHorizontally)
        ) {
            Text("PIC tidak tersedia? Lanjut tanpa tanda tangan", color = NeutralMid)
        }

        Spacer(Modifier.height(16.dp))
    }

    if (showUnavailableDialog) {
        AlertDialog(
            onDismissRequest = { showUnavailableDialog = false },
            title            = { Text("Lanjut Tanpa Tanda Tangan?") },
            text             = {
                Text("Laporan akan dikirim tanpa tanda tangan PIC. " +
                        "Admin akan meninjau laporan ini.",
                    style = MaterialTheme.typography.bodySmall)
            },
            confirmButton = {
                Button(onClick = {
                    showUnavailableDialog = false
                    onPicUnavailable()
                }) { Text("Ya, Lanjutkan") }
            },
            dismissButton = {
                TextButton(onClick = { showUnavailableDialog = false }) {
                    Text("Batalkan")
                }
            }
        )
    }
}

// ── Helper ────────────────────────────────────────────────────────────────────

private fun bitmapToBytes(bitmap: Bitmap): ByteArray {
    val out = java.io.ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
    return out.toByteArray()
}