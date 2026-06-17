package com.milba_Ittech.jobreport.ui.components

import android.graphics.Bitmap
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.milba_Ittech.jobreport.ui.theme.BrandError
import com.milba_Ittech.jobreport.ui.theme.BrandSecondary
import com.milba_Ittech.jobreport.ui.theme.NeutralMid
import com.milba_Ittech.jobreport.util.PhotoQuality

// ── Quality result card ───────────────────────────────────────────────────────

@Composable
fun PhotoQualityResultCard(
    result:    PhotoQuality.Result,
    onRetake:  () -> Unit,
    modifier:  Modifier = Modifier
) {
    when (result) {
        is PhotoQuality.Result.Good -> {
            // Good — show nothing, let parent show the photo
        }

        is PhotoQuality.Result.TooDark -> {
            PhotoQualityErrorCard(
                icon      = Icons.Default.BrightnessLow,
                message   = "Foto terlalu gelap",
                hint      = "Nyalakan lampu atau dekat ke sumber cahaya",
                onRetake  = onRetake,
                modifier  = modifier
            )
        }

        is PhotoQuality.Result.TooBright -> {
            PhotoQualityErrorCard(
                icon      = Icons.Default.BrightnessMedium,
                message   = "Foto terlalu terang",
                hint      = "Hindari sumber cahaya langsung di belakang objek",
                onRetake  = onRetake,
                modifier  = modifier
            )
        }

        is PhotoQuality.Result.Blurry -> {
            PhotoQualityErrorCard(
                icon      = Icons.Default.BlurOn,
                message   = "Foto buram",
                hint      = "Tahan HP lebih stabil dan pastikan tidak bergerak saat memotret",
                onRetake  = onRetake,
                modifier  = modifier
            )
        }

        is PhotoQuality.Result.Blank -> {
            PhotoQualityErrorCard(
                icon      = Icons.Default.HideImage,
                message   = "Lensa tertutup",
                hint      = "Bersihkan lensa kamera dan pastikan tidak ada yang menutupi",
                onRetake  = onRetake,
                modifier  = modifier
            )
        }
    }
}

@Composable
fun PhotoQualityErrorCard(
    icon:     androidx.compose.ui.graphics.vector.ImageVector,
    message:  String,
    hint:     String,
    onRetake: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        shape    = RoundedCornerShape(12.dp),
        border   = BorderStroke(1.dp, BrandError.copy(alpha = 0.4f)),
        color    = BrandError.copy(alpha = 0.05f),
        modifier = modifier.fillMaxWidth()
    ) {
        Column(
            modifier            = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                imageVector        = icon,
                contentDescription = null,
                tint               = BrandError,
                modifier           = Modifier.size(36.dp)
            )

            Text(
                text       = message,
                color      = BrandError,
                fontWeight = FontWeight.SemiBold,
                style      = MaterialTheme.typography.bodyLarge,
                textAlign  = TextAlign.Center
            )

            Text(
                text      = hint,
                color     = NeutralMid,
                style     = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center
            )

            Spacer(Modifier.height(4.dp))

            Button(
                onClick  = onRetake,
                colors   = ButtonDefaults.buttonColors(
                    containerColor = BrandError
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(
                    imageVector        = Icons.Default.CameraAlt,
                    contentDescription = null,
                    modifier           = Modifier.size(18.dp)
                )
                Spacer(Modifier.width(8.dp))
                Text("Ulangi Foto")
            }
        }
    }
}

// ── Quality indicator badge ───────────────────────────────────────────────────

@Composable
fun PhotoQualityBadge(
    result:   PhotoQuality.Result,
    modifier: Modifier = Modifier
) {
    val (text, color) = when (result) {
        is PhotoQuality.Result.Good      -> "Foto bagus ✓"   to BrandSecondary
        is PhotoQuality.Result.TooDark   -> "Terlalu gelap"  to BrandError
        is PhotoQuality.Result.TooBright -> "Terlalu terang" to BrandError
        is PhotoQuality.Result.Blurry    -> "Foto buram"     to BrandError
        is PhotoQuality.Result.Blank     -> "Lensa tertutup" to BrandError
    }

    Surface(
        shape    = RoundedCornerShape(20.dp),
        color    = color.copy(alpha = 0.1f),
        modifier = modifier
    ) {
        Text(
            text     = text,
            color    = color,
            style    = MaterialTheme.typography.labelSmall,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
        )
    }
}

// ── Full photo checker component ──────────────────────────────────────────────

@Composable
fun PhotoQualityChecker(
    bitmap:   Bitmap?,
    result:   PhotoQuality.Result?,
    onRetake: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier            = modifier,
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        when {
            // No photo yet — nothing to show
            bitmap == null -> {}

            // Photo taken — show quality result
            result != null && result !is PhotoQuality.Result.Good -> {
                PhotoQualityResultCard(
                    result   = result,
                    onRetake = onRetake
                )
            }

            result is PhotoQuality.Result.Good -> {
                Row(
                    verticalAlignment      = Alignment.CenterVertically,
                    horizontalArrangement  = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector        = Icons.Default.CheckCircle,
                        contentDescription = null,
                        tint               = BrandSecondary,
                        modifier           = Modifier.size(20.dp)
                    )
                    Text(
                        text  = "Foto berhasil diambil",
                        color = BrandSecondary,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }
    }
}