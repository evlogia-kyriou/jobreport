package com.milba_Ittech.jobreport.ui.screens.signature

import android.graphics.Bitmap
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.material.icons.filled.CheckCircle
import com.milba_Ittech.jobreport.ui.components.SignaturePad
import com.milba_Ittech.jobreport.ui.theme.*
import com.milba_Ittech.jobreport.domain.model.Technician
import java.io.ByteArrayOutputStream


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SignatureScreen(
    viewModel   : SignatureViewModel,
    ticketId    : String,
    technician  : Technician,
    AcUnitCount : Int,
    locationAddress: String,
    onSubmitted : () -> Unit,
    onBack      : () -> Unit
) {
    val state by viewModel.state.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.submissionComplete.collect { onSubmitted() }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        if (state.step == SignatureStep.TECHNICIAN)
                            "Tanda Tangan Teknisi"
                        else
                            "Tanda Tangan Klien"
                    )
                },
                navigationIcon = {
                    if (state.step == SignatureStep.TECHNICIAN) {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "Kembali")
                        }
                    }
                }
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
            // Completion badge
            Surface(
                shape    = RoundedCornerShape(12.dp),
                color    = BrandSecondary.copy(alpha = 0.1f),
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
                        modifier = Modifier.size(24.dp)
                    )
                    Column {
                        Text(
                            text       = "Semua $AcUnitCount unit AC selesai ✅",
                            style      = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.SemiBold,
                            color      = BrandSecondary
                        )
                        Text(
                            text  = locationAddress,
                            style = MaterialTheme.typography.bodySmall,
                            color = NeutralMid
                        )
                    }
                }
            }

            // Error
            state.error?.let {
                Surface(
                    shape  = RoundedCornerShape(8.dp),
                    color  = BrandError.copy(alpha = 0.08f),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text     = it,
                        color    = BrandError,
                        style    = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }

            // Step content
            when (state.step) {
                SignatureStep.TECHNICIAN -> TechnicianSignatureStep(
                    technicianName = technician.name,
                    isLoading  = state.isLoading,
                    onSigned   = { bitmap ->
                        val bytes = bitmapToBytes(bitmap)
                        viewModel.saveTechnicianSignature(
                            ticketId        = ticketId,
                            technicianId    = technician.id,
                            picName         = state.picName,
                            signatureBytes  = bytes
                        )
                    }
                )

                SignatureStep.PIC -> PicSignatureStep(
                    picName         = state.picName,
                    isLoading       = state.isLoading,
                    onPicNameChange = viewModel::updatePicName,
                    onSigned        = { bitmap ->
                        val bytes = bitmapToBytes(bitmap)
                        viewModel.savePicAndSubmit(
                            ticketId        = ticketId,
                            picName         = state.picName,
                            signatureBytes  = bytes
                        )
                    },
                    onPicUnavailable = { viewModel.proceedWithoutPic(ticketId) }
                )
            }
        }
    }
}

// ── Technician step ───────────────────────────────────────────────────────────

@Composable
fun TechnicianSignatureStep(
    technicianName: String,
    isLoading:  Boolean,
    onSigned:   (Bitmap) -> Unit
) {
    var signatureBitmap by remember { mutableStateOf<Bitmap?>(null) }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(
            text  = "Teknisi: $technicianName",
            style = MaterialTheme.typography.bodyLarge,
            color = NeutralDark,
            fontWeight = FontWeight.Medium
        )
        Text(
            text  = "Tanda tangani untuk mengkonfirmasi laporan sudah sesuai:",
            style = MaterialTheme.typography.bodySmall,
            color = NeutralMid
        )

        SignaturePad(
            modifier = Modifier.fillMaxWidth(),
            onSigned = { bitmap -> signatureBitmap = bitmap },
            onClear  = { signatureBitmap = null }
        )

        Button(
            onClick  = { signatureBitmap?.let { onSigned(it) } },
            enabled  = signatureBitmap != null && !isLoading,
            modifier = Modifier.fillMaxWidth().height(52.dp)
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    color       = Color.White,
                    modifier    = Modifier.size(20.dp),
                    strokeWidth = 2.dp
                )
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
    picName:         String,
    isLoading:       Boolean,
    onPicNameChange: (String) -> Unit,
    onSigned:        (Bitmap) -> Unit,
    onPicUnavailable: () -> Unit
) {
    var signatureBitmap       by remember { mutableStateOf<Bitmap?>(null) }
    var showUnavailableDialog by remember { mutableStateOf(false) }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(
            text  = "Berikan HP ini kepada PIC klien untuk ditandatangani",
            style = MaterialTheme.typography.bodyLarge,
            color = NeutralDark,
            fontWeight = FontWeight.Medium
        )

        OutlinedTextField(
            value         = picName,
            onValueChange = onPicNameChange,
            label         = { Text("Nama PIC Klien *") },
            placeholder   = { Text("Ahmad Wijaya") },
            singleLine    = true,
            modifier      = Modifier.fillMaxWidth()
        )

        SignaturePad(
            modifier = Modifier.fillMaxWidth(),
            onSigned = { bitmap -> signatureBitmap = bitmap },
            onClear  = { signatureBitmap = null }
        )

        Button(
            onClick  = { signatureBitmap?.let { onSigned(it) } },
            enabled  = signatureBitmap != null &&
                    picName.isNotBlank() &&
                    !isLoading,
            modifier = Modifier.fillMaxWidth().height(52.dp)
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    color       = Color.White,
                    modifier    = Modifier.size(20.dp),
                    strokeWidth = 2.dp
                )
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
    }

    if (showUnavailableDialog) {
        AlertDialog(
            onDismissRequest = { showUnavailableDialog = false },
            title            = { Text("Lanjut Tanpa Tanda Tangan?") },
            text             = {
                Text(
                    "Laporan akan dikirim tanpa tanda tangan PIC. " +
                            "Admin akan meninjau laporan ini.",
                    style = MaterialTheme.typography.bodySmall
                )
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

