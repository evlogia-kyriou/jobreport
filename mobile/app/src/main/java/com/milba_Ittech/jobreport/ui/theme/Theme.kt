package com.milba_Ittech.jobreport.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// ── Color schemes ─────────────────────────────────────────────────────────────

private val LightColorScheme = lightColorScheme(
    primary          = OliveDark,        // buttons, checkboxes, toggles
    onPrimary        = OnOlive,          // text on primary
    primaryContainer = OliveContainer,   // light olive tint
    onPrimaryContainer = OliveDarker,

    secondary        = BrandSecondary,   // success / completed
    onSecondary      = White,
    secondaryContainer = Color(0xFFDCFCE7),
    onSecondaryContainer = Color(0xFF14532D),

    error            = BrandError,
    onError          = White,

    background       = NeutralLight,
    onBackground     = NeutralDark,

    surface          = White,
    onSurface        = NeutralDark,
    surfaceVariant   = SurfaceGray,
    onSurfaceVariant = NeutralMid,
    outline          = NeutralBorder,
    outlineVariant   = NeutralBorder,
)

private val DarkColorScheme = darkColorScheme(
    primary          = OliveMid,
    onPrimary        = White,
    primaryContainer = OliveDark,
    onPrimaryContainer = OliveContainer,

    secondary        = BrandSecondary,
    onSecondary      = White,

    error            = BrandError,
    onError          = White,

    background       = Color(0xFF0F1409),
    onBackground     = Color(0xFFE8F0D0),

    surface          = Color(0xFF1A2008),
    onSurface        = Color(0xFFE8F0D0),
    surfaceVariant   = Color(0xFF2D3A15),
    onSurfaceVariant = Color(0xFFBDCB90),
    outline          = Color(0xFF4A5A28),
)

// ── Typography ────────────────────────────────────────────────────────────────

val Typography = Typography(
    displaySmall = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize   = 30.sp,
        lineHeight = 36.sp
    ),
    titleLarge = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize   = 20.sp,
        lineHeight = 28.sp
    ),
    bodyLarge = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize   = 15.sp,
        lineHeight = 22.sp
    ),
    bodyMedium = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize   = 14.sp,
        lineHeight = 20.sp
    ),
    bodySmall = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize   = 13.sp,
        lineHeight = 18.sp
    ),
    labelLarge = TextStyle(
        fontWeight = FontWeight.Medium,
        fontSize   = 13.sp,
        lineHeight = 18.sp
    ),
    labelSmall = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize   = 11.sp,
        lineHeight = 16.sp
    )
)

// ── Theme ─────────────────────────────────────────────────────────────────────

@Composable
fun TicketReportTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content:   @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    // Set status bar color to match olive header
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            WindowCompat.getInsetsController(window, view)
                .isAppearanceLightStatusBars = false  // white icons on dark bg
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography  = Typography,
        content     = content
    )
}