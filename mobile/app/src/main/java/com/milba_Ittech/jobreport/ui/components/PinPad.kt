package com.milba_Ittech.jobreport.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Backspace
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.graphics.Color
import com.milba_Ittech.jobreport.ui.theme.NeutralDark
import com.milba_Ittech.jobreport.ui.theme.NeutralLight

@Composable
fun PinDots(pinLength: Int, maxLength: Int = 6) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment     = Alignment.CenterVertically
    ) {
        repeat(maxLength) { index ->
            val filled = index < pinLength
            Surface(
                modifier = Modifier.size(14.dp),
                shape    = CircleShape,
                color    = if (filled) NeutralDark else NeutralLight,
                tonalElevation = 0.dp
            ) {}
        }
    }
}

@Composable
fun PinPad(
    onDigit:     (String) -> Unit,
    onBackspace: () -> Unit,
    onConfirm:   (() -> Unit)? = null,   // ← optional confirm button
    modifier:    Modifier      = Modifier
) {
    // Smaller buttons — fit all screens
    val buttonSize = 56.dp
    val spacing    = 10.dp

    Column(
        modifier            = modifier,
        verticalArrangement = Arrangement.spacedBy(spacing),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Row 1 — 1 2 3
        Row(horizontalArrangement = Arrangement.spacedBy(spacing)) {
            listOf("1", "2", "3").forEach { digit ->
                NumButton(label = digit, size = buttonSize, onClick = { onDigit(digit) })
            }
        }

        // Row 2 — 4 5 6
        Row(horizontalArrangement = Arrangement.spacedBy(spacing)) {
            listOf("4", "5", "6").forEach { digit ->
                NumButton(label = digit, size = buttonSize, onClick = { onDigit(digit) })
            }
        }

        // Row 3 — 7 8 9
        Row(horizontalArrangement = Arrangement.spacedBy(spacing)) {
            listOf("7", "8", "9").forEach { digit ->
                NumButton(label = digit, size = buttonSize, onClick = { onDigit(digit) })
            }
        }

        // Row 4 — [OK or blank] [0] [backspace]
        Row(
            horizontalArrangement = Arrangement.spacedBy(spacing),
            verticalAlignment     = Alignment.CenterVertically
        ) {
            // Left button — OK if provided, blank if not
            if (onConfirm != null) {
                FilledIconButton(
                    onClick  = onConfirm,
                    modifier = Modifier.size(buttonSize),
                    shape    = CircleShape,
                    colors   = IconButtonDefaults.filledIconButtonColors(
                        containerColor = androidx.compose.ui.graphics.Color(0xFF1B6CA8)
                    )
                ) {
                    Text(
                        text     = "OK",
                        fontSize = 18.sp,
                        color    = androidx.compose.ui.graphics.Color.White,
                        fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                    )
                }
            } else {
                // Empty spacer to keep 0 centered
                Spacer(Modifier.size(buttonSize))
            }

            // 0
            NumButton(label = "0", size = buttonSize, onClick = { onDigit("0") })

            // Backspace
            FilledTonalIconButton(
                onClick  = onBackspace,
                modifier = Modifier.size(buttonSize),
                shape    = CircleShape
            ) {
                Icon(
                    imageVector        = Icons.AutoMirrored.Filled.Backspace,
                    contentDescription = "Hapus",
                    modifier           = Modifier.size(22.dp)
                )
            }
        }
    }
}

@Composable
private fun NumButton(
    label:   String,
    size:    androidx.compose.ui.unit.Dp,
    onClick: () -> Unit
) {
    FilledTonalButton(
        onClick  = onClick,
        modifier = Modifier.size(size),
        shape    = CircleShape,
        contentPadding = PaddingValues(0.dp)
    ) {
        Text(
            text     = label,
            fontSize = 22.sp
        )
    }
}

@Composable
fun PinDots(
    pinLength:  Int,
    maxLength:  Int   = 6,
    dotColor:   Color = NeutralDark,
    emptyColor: Color = NeutralLight
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment     = Alignment.CenterVertically
    ) {
        repeat(maxLength) { index ->
            val filled = index < pinLength
            Surface(
                modifier = Modifier.size(14.dp),
                shape    = CircleShape,
                color    = if (filled) dotColor else emptyColor,
                tonalElevation = 0.dp
            ) {}
        }
    }
}

