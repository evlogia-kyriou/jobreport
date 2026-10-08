package com.milba_Ittech.jobreport.ui.screens.summary

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.milba_Ittech.jobreport.data.repository.TicketRepository
import com.milba_Ittech.jobreport.domain.model.TicketStep
import com.milba_Ittech.jobreport.ui.components.AppTopBar
import com.milba_Ittech.jobreport.ui.components.OliveTitleBlock
import com.milba_Ittech.jobreport.ui.theme.*

// ── 8 sections — updated to match SOP ✅ ──────────────────────────────────────
private val SECTION_ORDER = listOf(
    "kedatangan",
    "pengecekan_ac",
    "persiapan_pencucian",
    "pencucian_indoor",
    "pencucian_outdoor",
    "pengecekan_akhir",
    "dokumentasi_akhir",
    "laporan_kerusakan",
)

private fun sectionLabel(section: String) = when (section) {
    "kedatangan"          -> "Kedatangan"
    "pengecekan_ac"       -> "Pengecekan AC"
    "persiapan_pencucian" -> "Persiapan Pencucian"
    "pencucian_indoor"    -> "Cuci Indoor"
    "pencucian_outdoor"   -> "Cuci Outdoor"
    "pengecekan_akhir"    -> "Pengecekan Akhir"
    "dokumentasi_akhir"   -> "Dokumentasi Akhir"
    "laporan_kerusakan"   -> "Temuan & Kerusakan"
    else                  -> section
}

// ── Screen ────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StepListScreen(
    ticketId:        String,
    acUnitId:        String,
    unitLabel:       String,
    ticketNumber:    String,
    photoIndoorUrl:  String? = null,
    photoOutdoorUrl: String? = null,
    onBack:          () -> Unit
) {
    val ticketRepo = remember { TicketRepository() }
    var steps      by remember { mutableStateOf<List<TicketStep>>(emptyList()) }
    var isLoading  by remember { mutableStateOf(true) }

    LaunchedEffect(ticketId, acUnitId) {
        isLoading = true
        steps     = ticketRepo.getStepsByAcUnit(ticketId, acUnitId)
        isLoading = false
    }

    // Group steps by section in SOP order ✅
    val groupedSteps = SECTION_ORDER
        .mapNotNull { sectionKey ->
            val sectionSteps = steps.filter { it.section == sectionKey }
            if (sectionSteps.isEmpty()) null
            else sectionKey to sectionSteps.sortedBy { it.orderNumber }
        }

    val completedCount = steps.count { it.isCompleted }
    val totalCount     = steps.size

    Scaffold(
        topBar = {
            AppTopBar(
                title = {
                    OliveTitleBlock(
                        title    = unitLabel,
                        subtitle = "$ticketNumber · Laporan Lengkap"
                    )
                },
                onBack = onBack
            )
        }
    ) { padding ->

        if (isLoading) {
            Box(
                modifier         = Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = BrandPrimary)
            }
            return@Scaffold
        }

        LazyColumn(
            contentPadding      = PaddingValues(
                top    = padding.calculateTopPadding() + 12.dp,
                bottom = 24.dp,
                start  = 16.dp,
                end    = 16.dp
            ),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {

            // ── Progress header ───────────────────────────────────────────────
            item {
                Surface(
                    shape    = RoundedCornerShape(12.dp),
                    color    = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier            = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Row(
                            modifier              = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                "$completedCount dari $totalCount langkah selesai",
                                style = MaterialTheme.typography.bodySmall,
                                color = NeutralMid
                            )
                            Text(
                                "${if (totalCount > 0) (completedCount * 100 / totalCount) else 0}%",
                                style      = MaterialTheme.typography.bodySmall,
                                color      = NeutralDark,
                                fontWeight = FontWeight.Medium
                            )
                        }
                        LinearProgressIndicator(
                            progress   = { if (totalCount > 0) completedCount.toFloat() / totalCount else 0f },
                            modifier   = Modifier.fillMaxWidth().height(4.dp),
                            color      = BrandSecondary,
                            trackColor = NeutralBorder
                        )
                    }
                }
            }

            // ── Sections ──────────────────────────────────────────────────────
            groupedSteps.forEach { (sectionKey, sectionSteps) ->
                val doneInSection  = sectionSteps.count { it.isCompleted }
                val totalInSection = sectionSteps.size
                val allDone        = doneInSection == totalInSection

                // Section header
                item(key = "header_$sectionKey") {
                    Row(
                        modifier          = Modifier.fillMaxWidth().padding(top = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            sectionLabel(sectionKey),
                            style      = MaterialTheme.typography.labelMedium,
                            color      = if (allDone) BrandSecondary else NeutralMid,
                            fontWeight = FontWeight.SemiBold,
                            modifier   = Modifier.weight(1f)
                        )
                        Text(
                            "$doneInSection/$totalInSection",
                            style = MaterialTheme.typography.labelSmall,
                            color = if (allDone) BrandSecondary else NeutralMid
                        )
                    }
                }

                // Steps in section
                items(sectionSteps, key = { it.id }) { step ->
                    StepRow(step = step)
                }
            }
        }
    }
}

// ── Step row ──────────────────────────────────────────────────────────────────

@Composable
fun StepRow(step: TicketStep) {
    val isOk      = step.isCompleted && !step.isConditionAbnormal
    val isWarning = step.isCompleted && step.isConditionAbnormal
    val isPending = !step.isCompleted

    Surface(
        shape    = RoundedCornerShape(10.dp),
        color    = when {
            isWarning -> BrandWarning.copy(alpha = 0.06f)
            isOk      -> MaterialTheme.colorScheme.surface
            else      -> MaterialTheme.colorScheme.surfaceVariant
        },
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier          = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Status icon
            Text(
                text = when {
                    isWarning -> "⚠"
                    isOk      -> "✅"
                    else      -> "○"
                },
                style = MaterialTheme.typography.bodySmall
            )

            // Description
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text  = step.description,
                    style = MaterialTheme.typography.bodySmall,
                    color = if (isPending) NeutralMid else NeutralDark
                )
                // Show input value if present
                if (!step.inputValue.isNullOrBlank()) {
                    Text(
                        text  = "${step.inputValue} ${step.inputUnit ?: ""}".trim(),
                        style = MaterialTheme.typography.labelSmall,
                        color = if (isWarning) BrandWarning else BrandSecondary
                    )
                }
                // Show finding note if present
                if (isWarning && !step.inputValue.isNullOrBlank()) {
                    Text(
                        text  = "Kondisi tidak normal",
                        style = MaterialTheme.typography.labelSmall,
                        color = BrandWarning
                    )
                }
            }

            // Photo indicator
            if (!step.photoUrl.isNullOrBlank()) {
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = BrandPrimary.copy(alpha = 0.08f)
                ) {
                    Text(
                        "📷",
                        style    = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }
        }
    }
}