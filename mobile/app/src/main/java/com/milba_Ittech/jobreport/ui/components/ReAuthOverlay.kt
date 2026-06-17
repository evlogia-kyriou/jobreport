package com.milba_Ittech.jobreport.ui.components

import androidx.compose.animation.*
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
import com.milba_Ittech.jobreport.ui.theme.*

@Composable
fun ReAuthOverlay(
    technicianName:  String,
    isLoading:   Boolean,
    error:       String?,
    onPinEntered: (String) -> Unit,
    onLogout:    () -> Unit
) {
    var pin by remember { mutableStateOf("") }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.85f)),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier            = Modifier
                .fillMaxWidth()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // Lock icon
            Surface(
                modifier = Modifier.size(64.dp),
                shape    = CircleShape,
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

            // Greeting
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text       = "Sesi Terkunci",
                    style      = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color      = Color.White
                )
                Text(
                    text      = "Halo, $technicianName.\nSilahkan masukkan PIN Anda kembali.",
                    style     = MaterialTheme.typography.bodySmall,
                    color     = Color.White.copy(alpha = 0.8f),
                    textAlign = TextAlign.Center
                )
            }

            // PIN dots
            PinDots(
                pinLength = pin.length,
                dotColor  = Color.White,
                emptyColor = Color.White.copy(alpha = 0.3f)
            )

            // Error
            error?.let {
                Surface(
                    shape  = RoundedCornerShape(8.dp),
                    color  = BrandError.copy(alpha = 0.2f)
                ) {
                    Text(
                        text     = it,
                        color    = Color.White,
                        style    = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        textAlign = TextAlign.Center
                    )
                }
            }

            // PIN pad
            if (isLoading) {
                CircularProgressIndicator(color = Color.White)
            } else {
                PinPad(
                    onDigit     = { digit ->
                        if (pin.length < 6) {
                            pin += digit
                            if (pin.length == 6) {
                                onPinEntered(pin)
                                pin = ""
                            }
                        }
                    },
                    onBackspace = {
                        if (pin.isNotEmpty()) pin = pin.dropLast(1)
                    }
                )
            }

            // Logout option
            TextButton(onClick = onLogout) {
                Text(
                    text  = "Bukan saya? Keluar",
                    color = Color.White.copy(alpha = 0.6f),
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}