package com.milba_Ittech.jobreport.ui.screens.sop

import android.util.Log
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.milba_Ittech.jobreport.data.repository.TicketRepository
import com.milba_Ittech.jobreport.domain.model.TicketAcUnit
import com.milba_Ittech.jobreport.domain.model.TicketStep
import com.milba_Ittech.jobreport.ui.components.AppTopBar
import com.milba_Ittech.jobreport.ui.components.OliveTitleBlock
import com.milba_Ittech.jobreport.ui.theme.*

// ── Section metadata ──────────────────────────────────────────────────────────

data class SopSectionMeta(
    val key:       String,
    val name:      String,
    val icon:      ImageVector,
    val iconBg:    Color,
    val iconColor: Color,
    val prep:      String = ""
)

val SOP_SECTIONS = listOf(
    SopSectionMeta(
        key       = "kedatangan",
        name      = "Kedatangan",
        icon      = Icons.Default.CameraAlt,
        iconBg    = Color(0xFFEDE7FF),
        iconColor = Color(0xFF7C4DFF),
        prep      = "Siapkan kamera. Pastikan pencahayaan cukup untuk foto unit."
    ),
    SopSectionMeta(
        key       = "pengecekan_ac",
        name      = "Pengecekan AC",
        icon      = Icons.Default.AcUnit,
        iconBg    = Color(0xFFE1F5FE),
        iconColor = Color(0xFF0277BD),
        prep      = "Pastikan AC menyala. Siapkan termometer dan tang amper."
    ),
    SopSectionMeta(
        key       = "persiapan_pencucian",
        name      = "Persiapan Pencucian",
        icon      = Icons.Default.Shield,
        iconBg    = Color(0xFFFFF3E0),
        iconColor = Color(0xFFE65100),
        prep      = "Siapkan plastik pelindung PCB. Jangan lewati langkah ini."
    ),
    SopSectionMeta(
        key       = "pencucian_indoor",
        name      = "Pencucian Indoor",
        icon      = Icons.Default.WaterDrop,
        iconBg    = Color(0xFFE3F2FD),
        iconColor = Color(0xFF1976D2),
        prep      = "Siapkan peralatan cuci: pompa air, sikat, cairan pembersih."
    ),
    SopSectionMeta(
        key       = "pencucian_outdoor",
        name      = "Pencucian Outdoor",
        icon      = Icons.Default.Air,
        iconBg    = Color(0xFFE0F2F1),
        iconColor = Color(0xFF00695C),
        prep      = "Pindah ke unit outdoor. Siapkan pompa tekanan tinggi."
    ),
    SopSectionMeta(
        key       = "pengecekan_akhir",
        name      = "Pengecekan Akhir",
        icon      = Icons.Default.CheckCircle,
        iconBg    = Color(0xFFE8F5E9),
        iconColor = Color(0xFF2E7D32),
        prep      = "Nyalakan MCB. Tunggu AC menyala 5 menit sebelum mengukur."
    ),
    SopSectionMeta(
        key       = "dokumentasi_akhir",
        name      = "Dokumentasi Akhir",
        icon      = Icons.Default.PhotoCamera,
        iconBg    = Color(0xFFE8F5E9),
        iconColor = Color(0xFF1B5E20),
        prep      = "Pastikan area sudah dirapikan sebelum mengambil foto."
    ),
    SopSectionMeta(
        key       = "laporan_kerusakan",
        name      = "Laporan Kerusakan",
        icon      = Icons.Default.Assignment,
        iconBg    = Color(0xFFFFF3E0),
        iconColor = Color(0xFFE65100),
        prep      = ""
    ),
)

// ── SopOverviewScreen ─────────────────────────────────────────────────────────

@Composable
fun SopOverviewScreen(
    ticketId:  String,
    acUnitId:  String,
    unitLabel: String,
    onStart:   (sectionIndex: Int) -> Unit,
    onBack:    () -> Unit
) {
    val ticketRepo = remember { TicketRepository() }
    var steps      by remember { mutableStateOf<List<TicketStep>>(emptyList()) }

    LaunchedEffect(acUnitId) {
        try {
            steps = ticketRepo.getStepsByAcUnit(ticketId, acUnitId)
        } catch (e: Exception) {
            Log.e("SopOverview", "Failed: ${e.message}")
        }
    }

    val stepsBySection = steps.groupBy { it.section }
    val totalDone      = steps.count { it.isCompleted }

    Scaffold(
        topBar = {
            AppTopBar(
                title = {
                    OliveTitleBlock(
                        title    = unitLabel,
                        subtitle = "Pilih dari mana mulai"
                    )
                },
                onBack = onBack
            )
        }
    ) { padding ->
        LazyColumn(
            contentPadding = PaddingValues(
                top    = padding.calculateTopPadding() + 12.dp,
                bottom = 24.dp, start = 16.dp, end = 16.dp
            ),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Progress header
            item {
                Surface(
                    shape    = RoundedCornerShape(12.dp),
                    color    = if (totalDone == 26) BrandSecondary.copy(alpha = 0.1f)
                    else MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(
                                if (totalDone == 0) "Belum ada langkah selesai"
                                else if (totalDone == 26) "Semua langkah selesai ✅"
                                else "$totalDone dari 26 langkah selesai",
                                style      = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.Medium,
                                color      = if (totalDone == 26) BrandSecondary else NeutralDark
                            )
                            LinearProgressIndicator(
                                progress           = { totalDone / 26f },
                                modifier           = Modifier.fillMaxWidth().padding(top = 6.dp)
                                    .height(4.dp).clip(RoundedCornerShape(100.dp)),
                                color              = BrandSecondary,
                                trackColor         = NeutralBorder,
                            )
                        }
                    }
                }
            }

            // Section rows
            items(SOP_SECTIONS.mapIndexed { i, s -> i to s }) { (idx, section) ->
                val sectionSteps = stepsBySection[section.key] ?: emptyList()
                val doneCount    = sectionSteps.count { it.isCompleted }
                val total        = sectionSteps.size
                val isComplete   = total > 0 && doneCount == total
                val isStarted    = doneCount > 0 && !isComplete

                Surface(
                    onClick  = { onStart(idx) },
                    shape    = RoundedCornerShape(12.dp),
                    color    = MaterialTheme.colorScheme.surface,
                    border   = BorderStroke(
                        0.5.dp,
                        if (isComplete) BrandSecondary.copy(alpha = 0.4f)
                        else if (isStarted) BrandWarning.copy(alpha = 0.4f)
                        else NeutralBorder
                    ),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier              = Modifier.padding(12.dp),
                        verticalAlignment     = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // Section icon
                        Surface(
                            shape    = RoundedCornerShape(10.dp),
                            color    = section.iconBg,
                            modifier = Modifier.size(40.dp)
                        ) {
                            Box(Modifier.fillMaxSize(), Alignment.Center) {
                                Icon(section.icon, null,
                                    tint     = section.iconColor,
                                    modifier = Modifier.size(20.dp))
                            }
                        }

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                "${idx + 1}. ${section.name}",
                                style      = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.SemiBold,
                                color      = NeutralDark
                            )
                            Text(
                                when {
                                    isComplete  -> "Selesai ✓"
                                    isStarted   -> "$doneCount/$total langkah"
                                    total > 0   -> "$total langkah"
                                    else        -> "Memuat..."
                                },
                                style = MaterialTheme.typography.labelSmall,
                                color = when {
                                    isComplete -> BrandSecondary
                                    isStarted  -> BrandWarning
                                    else       -> NeutralMid
                                }
                            )
                        }

                        Icon(
                            if (isComplete) Icons.Default.CheckCircle
                            else Icons.Default.ChevronRight,
                            null,
                            tint     = if (isComplete) BrandSecondary else NeutralMid,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }

            // Start/continue button
            item {
                val firstIncomplete = SOP_SECTIONS.indexOfFirst { sec ->
                    val done = (stepsBySection[sec.key] ?: emptyList()).count { it.isCompleted }
                    val tot  = (stepsBySection[sec.key] ?: emptyList()).size
                    tot == 0 || done < tot
                }.takeIf { it >= 0 } ?: 0

                Button(
                    onClick  = { onStart(firstIncomplete) },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    colors   = ButtonDefaults.buttonColors(containerColor = OliveDarker)
                ) {
                    Text(
                        if (totalDone == 0) "Mulai SOP"
                        else if (totalDone == 26) "Lihat Ringkasan"
                        else "Lanjutkan SOP",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(Modifier.width(8.dp))
                    Icon(Icons.Default.ArrowForward, null, modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}

// ── SectionIntroScreen ────────────────────────────────────────────────────────

@Composable
fun SectionIntroScreen(
    sectionIndex: Int,
    stepList:     List<TicketStep>,     // pre-loaded steps for this section
    onStart:      () -> Unit,
    onBack:       () -> Unit
) {
    val section = SOP_SECTIONS[sectionIndex]

    Scaffold(
        topBar = {
            AppTopBar(
                title = {
                    OliveTitleBlock(
                        title    = section.name,
                        subtitle = "Bagian ${sectionIndex + 1} dari 8"
                    )
                },
                onBack = onBack
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Section icon (large)
            Surface(
                shape    = RoundedCornerShape(20.dp),
                color    = section.iconBg,
                modifier = Modifier.size(80.dp).align(Alignment.CenterHorizontally)
            ) {
                Box(Modifier.fillMaxSize(), Alignment.Center) {
                    Icon(section.icon, null,
                        tint     = section.iconColor,
                        modifier = Modifier.size(40.dp))
                }
            }

            // Section dots
            SectionDotBar(currentIndex = sectionIndex)

            // Section name + step count
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(section.name,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.SemiBold,
                    color = NeutralDark)
                Text("${stepList.size} langkah",
                    style = MaterialTheme.typography.bodySmall,
                    color = NeutralMid)
            }

            // Step list preview
            Surface(
                shape    = RoundedCornerShape(12.dp),
                color    = MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier            = Modifier.padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    stepList.forEachIndexed { i, step ->
                        Row(
                            verticalAlignment     = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Surface(
                                shape = RoundedCornerShape(100.dp),
                                color = if (step.isCompleted) BrandSecondary.copy(alpha = 0.15f)
                                else NeutralBorder.copy(alpha = 0.3f),
                                modifier = Modifier.size(20.dp)
                            ) {
                                Box(Modifier.fillMaxSize(), Alignment.Center) {
                                    Text(
                                        if (step.isCompleted) "✓" else "${i + 1}",
                                        style = MaterialTheme.typography.labelSmall,
                                        fontSize = 9.sp,
                                        color = if (step.isCompleted) BrandSecondary else NeutralMid
                                    )
                                }
                            }
                            Text(
                                step.description,
                                style = MaterialTheme.typography.labelMedium,
                                color = if (step.isCompleted) BrandSecondary else NeutralDark
                            )
                        }
                    }
                }
            }

            // Prep tip
            if (section.prep.isNotBlank()) {
                Surface(
                    shape    = RoundedCornerShape(10.dp),
                    color    = BrandWarning.copy(alpha = 0.08f),
                    border   = BorderStroke(0.5.dp, BrandWarning.copy(alpha = 0.3f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier              = Modifier.padding(10.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment     = Alignment.Top
                    ) {
                        Icon(Icons.Default.Lightbulb, null,
                            tint     = BrandWarning,
                            modifier = Modifier.size(16.dp).padding(top = 1.dp))
                        Text(section.prep,
                            style = MaterialTheme.typography.labelSmall,
                            color = BrandWarning,
                            lineHeight = 16.sp)
                    }
                }
            }

            Spacer(Modifier.weight(1f))

            Button(
                onClick  = onStart,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                colors   = ButtonDefaults.buttonColors(containerColor = OliveDarker)
            ) {
                Text("Mulai ${section.name}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.width(8.dp))
                Icon(Icons.Default.ArrowForward, null, modifier = Modifier.size(18.dp))
            }
        }
    }
}

// ── SectionDoneScreen ─────────────────────────────────────────────────────────

@Composable
fun SectionDoneScreen(
    sectionIndex:  Int,
    completedSteps: List<TicketStep>,
    isLastSection: Boolean,
    onNext:        () -> Unit,     // → next section intro (or finish)
    onOverview:    () -> Unit      // → SopOverviewScreen
) {
    val section     = SOP_SECTIONS[sectionIndex]
    val nextSection = if (!isLastSection) SOP_SECTIONS[sectionIndex + 1] else null

    Scaffold(
        containerColor = Color(0xFF1B5E20)
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp, vertical = 20.dp),
            verticalArrangement   = Arrangement.spacedBy(16.dp),
            horizontalAlignment   = Alignment.CenterHorizontally
        ) {
            // Section dots at top
            SectionDotBar(currentIndex = sectionIndex, dark = false)

            Spacer(Modifier.height(8.dp))

            // Big checkmark
            Surface(
                shape    = RoundedCornerShape(24.dp),
                color    = Color.White.copy(alpha = 0.15f),
                modifier = Modifier.size(88.dp)
            ) {
                Box(Modifier.fillMaxSize(), Alignment.Center) {
                    Text("✓", fontSize = 44.sp, color = Color.White)
                }
            }

            // Title
            Text(
                "${section.name} selesai!",
                style      = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.SemiBold,
                color      = Color.White
            )

            // Summary card
            Surface(
                shape    = RoundedCornerShape(12.dp),
                color    = Color.White.copy(alpha = 0.15f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier            = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    completedSteps.forEach { step ->
                        Row(
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(step.description,
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.White.copy(alpha = 0.8f))
                            Text(
                                when {
                                    !step.inputValue.isNullOrBlank() ->
                                        "${step.inputValue}${step.inputUnit?.let { " $it" } ?: ""}"
                                    step.isChecked -> "✓"
                                    step.stepType == "photo_only" -> "📷 Tersimpan"
                                    else -> "✓"
                                },
                                style      = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.SemiBold,
                                color      = Color.White
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.weight(1f))

            // Next section button
            if (!isLastSection && nextSection != null) {
                Button(
                    onClick  = onNext,
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    colors   = ButtonDefaults.buttonColors(
                        containerColor = Color.White,
                        contentColor   = Color(0xFF1B5E20)
                    )
                ) {
                    Text("Lanjut ke ${nextSection.name}",
                        style      = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.width(8.dp))
                    Icon(Icons.Default.ArrowForward, null, modifier = Modifier.size(18.dp))
                }
            } else {
                // Last section done → all complete
                Button(
                    onClick  = onOverview,
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    colors   = ButtonDefaults.buttonColors(
                        containerColor = Color.White,
                        contentColor   = Color(0xFF1B5E20)
                    )
                ) {
                    Text("Semua selesai — Kembali",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold)
                }
            }

            TextButton(
                onClick  = onOverview,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Lihat semua bagian",
                    color = Color.White.copy(alpha = 0.7f),
                    style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

// ── Section dot bar ───────────────────────────────────────────────────────────

@Composable
fun SectionDotBar(
    currentIndex: Int,
    dark:         Boolean = true
) {
    Row(
        modifier              = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment     = Alignment.CenterVertically
    ) {
        SOP_SECTIONS.forEachIndexed { i, _ ->
            val done   = i < currentIndex
            val active = i == currentIndex
            val color  = when {
                done   -> if (dark) BrandSecondary else Color.White.copy(alpha = 0.9f)
                active -> if (dark) OliveDarker    else Color.White
                else   -> if (dark) NeutralBorder  else Color.White.copy(alpha = 0.3f)
            }
            Surface(
                shape = RoundedCornerShape(100.dp),
                color = color,
                modifier = Modifier
                    .padding(horizontal = 2.dp)
                    .height(6.dp)
                    .then(if (active) Modifier.width(20.dp) else Modifier.width(6.dp))
            ) {}
        }
    }
}