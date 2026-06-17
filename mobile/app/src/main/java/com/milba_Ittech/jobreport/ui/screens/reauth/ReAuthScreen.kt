package com.milba_Ittech.jobreport.ui.screens.reauth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
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
import com.milba_Ittech.jobreport.ui.theme.*

@Composable
fun ReAuthScreen(
    technicianName:  String,
    isLoading:   Boolean,
    error:       String?,
    attempts:    Int,
    onPinEntry:  (String) -> Unit,
    onLogout:    () -> Unit
) {
    var pin by remember { mutableStateOf("") }

    Box(
        modifier         = Modifier
            .fillMaxSize()
            .background(NeutralLight),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier            = Modifier
                .fillMaxWidth()
                .padding(horizontal = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {

            // Lock icon
            Surface(
                modifier = Modifier.size(72.dp),
                shape    = CircleShape,
                color    = BrandPrimary.copy(alpha = 0.1f)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector        = Icons.Default.Lock,
                        contentDescription = null,
                        tint               = BrandPrimary,
                        modifier           = Modifier.size(36.dp)
                    )
                }
            }

            // Greeting
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(
                    text       = "Halo, $technicianName.",
                    style      = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.SemiBold,
                    color      = NeutralDark,
                    textAlign  = TextAlign.Center
                )
                Text(
                    text      = "Sesi Anda telah berakhir.\nSilahkan masukkan PIN Anda kembali.",
                    style     = MaterialTheme.typography.bodySmall,
                    color     = NeutralMid,
                    textAlign = TextAlign.Center,
                    lineHeight = 20.sp
                )
            }

            // Divider
            HorizontalDivider(
                modifier  = Modifier.padding(horizontal = 16.dp),
                color     = NeutralBorder,
                thickness = 1.dp
            )

            // PIN dots
            PinDots(pinLength = pin.length)

            // Error message
            error?.let {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = BrandError.copy(alpha = 0.08f)
                ) {
                    Row(
                        modifier              = Modifier.padding(
                            horizontal = 16.dp,
                            vertical   = 8.dp
                        ),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment     = Alignment.CenterVertically
                    ) {
                        Text(
                            text      = it,
                            color     = BrandError,
                            style     = MaterialTheme.typography.bodySmall,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }

            // Attempts indicator
            if (attempts > 0) {
                Text(
                    text  = "Percobaan: $attempts / 5",
                    style = MaterialTheme.typography.labelSmall,
                    color = if (attempts >= 3) BrandError else NeutralMid
                )
            }

            // PIN pad or loading
            if (isLoading) {
                CircularProgressIndicator(
                    color    = BrandPrimary,
                    modifier = Modifier.size(40.dp)
                )
            } else {
                PinPad(
                    onDigit     = { digit ->
                        if (pin.length < 6) {
                            pin += digit
                            if (pin.length == 6) {
                                onPinEntry(pin)
                                pin = ""
                            }
                        }
                    },
                    onBackspace = {
                        if (pin.isNotEmpty()) {
                            pin = pin.dropLast(1)
                        }
                    }
                )
            }

            // Logout button
            TextButton(onClick = onLogout) {
                Text(
                    text  = "Bukan saya? Keluar",
                    color = NeutralMid,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}