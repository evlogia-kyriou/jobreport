package com.milba_Ittech.jobreport.ui.screens.login

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.milba_Ittech.jobreport.ui.components.PinDots
import com.milba_Ittech.jobreport.ui.components.PinPad
import com.milba_Ittech.jobreport.domain.model.Technician
import com.milba_Ittech.jobreport.ui.theme.*

@Composable
fun LoginScreen(
    viewModel: LoginViewModel,
    onLogin:   (Technician) -> Unit
) {
    val state by viewModel.state.collectAsState()

    Box(
        modifier         = Modifier
            .fillMaxSize()
            .background(NeutralLight)
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier            = Modifier.fillMaxWidth()
        ) {
            // Logo
            Surface(
                modifier = Modifier.size(64.dp),
                shape    = RoundedCornerShape(16.dp),
                color    = BrandPrimary
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector        = Icons.Default.Lock,
                        contentDescription = null,
                        tint               = Color.White,
                        modifier           = Modifier.size(32.dp)
                    )
                }
            }

            Spacer(Modifier.height(8.dp))

            Text(
                text       = "TicketReport",
                style      = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color      = NeutralDark
            )
            Text(
                text  = "Masuk untuk melanjutkan",
                style = MaterialTheme.typography.bodySmall,
                color = NeutralMid
            )

            Spacer(Modifier.height(24.dp))

            AnimatedContent(
                targetState = state.step,
                transitionSpec = {
                    slideInHorizontally { it } + fadeIn() togetherWith
                            slideOutHorizontally { -it } + fadeOut()
                },
                label = "login_step"
            ) { step ->
                when (step) {
                    LoginStep.ENTER_ID  -> IdStep(
                        technicianId  = state.technicianId,
                        isLoading = state.isLoading,
                        error     = state.error,
                        onDigit   = viewModel::appendIdDigit,
                        onBackspace = viewModel::backspaceId,
                        onConfirm = viewModel::confirmId
                    )
                    LoginStep.ENTER_PIN -> PinStep(
                        technicianId  = state.technicianId,
                        pin         = state.pin,
                        isLoading   = state.isLoading,
                        isLocked    = state.isLocked,
                        error       = state.error,
                        onDigit     = viewModel::appendPin,
                        onBackspace = viewModel::backspacePin,
                        onBack      = viewModel::backToId
                    )
                }
            }
        }
    }
}

// ── Step 1 — ID Entry ─────────────────────────────────────────────────────────

@Composable
fun IdStep(
    technicianId:   String,
    isLoading:  Boolean,
    error:      String?,
    onDigit:    (String) -> Unit,
    onBackspace: () -> Unit,
    onConfirm:  () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier            = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text       = "Masukkan ID Anda",
            style      = MaterialTheme.typography.titleLarge,
            color      = NeutralDark,
            fontWeight = FontWeight.SemiBold
        )

        // ID display box
        Surface(
            shape  = RoundedCornerShape(12.dp),
            color  = Color.White,
            shadowElevation = 2.dp,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
        ) {
            val display = technicianId
                .padEnd(7, '_')
                .chunked(1)
                .joinToString(" ")

            Text(
                text       = display,
                fontSize   = 24.sp,
                fontWeight = FontWeight.Bold,
                color      = NeutralDark,
                textAlign  = TextAlign.Center,
                letterSpacing = 4.sp,
                modifier   = Modifier.padding(vertical = 20.dp)
            )
        }

        // Error message
        error?.let {
            Text(
                text      = it,
                color     = BrandError,
                style     = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center
            )
        }

        if (isLoading) {
            CircularProgressIndicator(color = BrandPrimary)
        } else {
            PinPad(
                onDigit     = onDigit,
                onBackspace = onBackspace,
                onConfirm   = onConfirm
            )
        }
    }
}

// ── Step 2 — PIN Entry ────────────────────────────────────────────────────────

@Composable
fun PinStep(
    technicianId:  String,
    pin:         String,
    isLoading:   Boolean,
    isLocked:    Boolean,
    error:       String?,
    onDigit:     (String) -> Unit,
    onBackspace: () -> Unit,
    onBack:      () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier            = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text       = "ID: $technicianId",
            style      = MaterialTheme.typography.titleLarge,
            color      = NeutralDark,
            fontWeight = FontWeight.SemiBold,
            textAlign  = TextAlign.Center
        )

        Text(
            text  = "Masukkan PIN Anda",
            style = MaterialTheme.typography.bodySmall,
            color = NeutralMid
        )

        PinDots(pinLength = pin.length)

        error?.let {
            Text(
                text      = it,
                color     = BrandError,
                style     = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center
            )
        }

        if (isLoading) {
            CircularProgressIndicator(color = BrandPrimary)
        } else {
            PinPad(
                onDigit     = if (isLocked) ({}) else onDigit,
                onBackspace = if (isLocked) ({}) else onBackspace
            )
        }

        TextButton(onClick = onBack) {
            Text("← Kembali", color = NeutralMid)
        }
    }
}