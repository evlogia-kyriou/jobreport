package com.milba_Ittech.jobreport.ui.components
import com.milba_Ittech.jobreport.ui.components.AppTopBar
import com.milba_Ittech.jobreport.ui.components.OliveTitleBlock
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight

// ── Olive brand color ──────────────────────────────────────────────────────────
// Used consistently across all mobile screens
val OliveDark       = Color(0xFF3D4A1E)    // header background
val OliveDarker     = Color(0xFF2D3716)    // status bar / darker shade
val OliveWhite      = Color(0xFFFFFFFF)    // primary text on olive
val OliveWhiteSub   = Color(0xCCFFFFFF)    // secondary text on olive (80% white)

// ── Shared TopAppBar colors ────────────────────────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
val oliveTopBarColors @Composable get() = TopAppBarDefaults.topAppBarColors(
    containerColor         = OliveDark,
    titleContentColor      = OliveWhite,
    navigationIconContentColor = OliveWhite,
    actionIconContentColor = OliveWhite,
    scrolledContainerColor = OliveDarker
)

// ── AppTopBar — use this on every screen ──────────────────────────────────────

/**
 * Standard app top bar with olive header.
 * Pass title as a @Composable for custom layouts (text + subtitle).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppTopBar(
    title:           @Composable () -> Unit,
    modifier:        Modifier = Modifier,
    onBack:          (() -> Unit)? = null,
    actions:         @Composable () -> Unit = {}
) {
    TopAppBar(
        title           = title,
        modifier        = modifier,
        navigationIcon  = {
            if (onBack != null) {
                IconButton(onClick = onBack) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Kembali",
                        tint               = OliveWhite
                    )
                }
            }
        },
        actions = { actions() },
        colors  = oliveTopBarColors
    )
}

/**
 * Two-line title block for screens with title + subtitle.
 * Usage: AppTopBar(title = { OliveTitleBlock("Location", "TKT · Cuci") })
 */
@Composable
fun OliveTitleBlock(
    title:    String,
    subtitle: String? = null
) {
    androidx.compose.foundation.layout.Column {
        Text(
            text       = title,
            style      = MaterialTheme.typography.bodyLarge,
            fontWeight = FontWeight.SemiBold,
            color      = OliveWhite,
            maxLines   = 1,
            overflow   = androidx.compose.ui.text.style.TextOverflow.Ellipsis
        )
        if (!subtitle.isNullOrBlank()) {
            Text(
                text  = subtitle,
                style = MaterialTheme.typography.labelSmall,
                color = OliveWhiteSub
            )
        }
    }
}