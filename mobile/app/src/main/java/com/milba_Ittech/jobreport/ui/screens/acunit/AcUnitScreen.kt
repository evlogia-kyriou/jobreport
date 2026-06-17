package com.milba_Ittech.jobreport.ui.screens.acunit

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.milba_Ittech.jobreport.data.AppState
import com.milba_Ittech.jobreport.domain.model.AcUnitWithDisplay
import com.milba_Ittech.jobreport.domain.model.TicketStep
import com.milba_Ittech.jobreport.data.repository.TicketRepository
import com.milba_Ittech.jobreport.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AcUnitScreen(
    AcUnitId            : String,
    ticketId            : String,
    AcUnit              : AcUnitWithDisplay,
    onStepClick         : (TicketStep) -> Unit,
    onBack              : () -> Unit,
    onAcUnitCompleted   : (String) -> Unit   // ← add this parameter
) {
    val ticketRepo = remember { TicketRepository() }
    val vm      = viewModel { AcUnitViewModel(ticketRepo) }
    val state   by vm.state.collectAsState()

    // Load steps from Supabase
    LaunchedEffect(AcUnitId) {
        vm.load( ticketId, AcUnitId)
    }

    val steps        = state.steps
    val allStepsDone = steps.isNotEmpty() && steps.all { AppState.isCompleted(it.id) }

    val sections = linkedMapOf<String, List<TicketStep>>()
    listOf(
        "kedatangan",
        "pencucian_indoor",
        "pencucian_outdoor",
        "penyelesaian",
        "laporan_kerusakan"
    ).forEach { section ->
        val sectionSteps = steps.filter { it.section == section }
        if (sectionSteps.isNotEmpty()) sections[section] = sectionSteps
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = AcUnit.displayName,
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.SemiBold
                        )
                        val detail = listOfNotNull(AcUnit.type, AcUnit.capacityPk).joinToString(" · ")
                        if (detail.isNotEmpty()) {
                            Text(
                                text = detail,
                                style = MaterialTheme.typography.labelSmall,
                                color = NeutralMid
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Kembali")
                    }
                }
            )
        },
        bottomBar = {
            // Show complete button only when all steps done
            if (allStepsDone && !AppState.isAcUnitCompleted(AcUnitId)) {
                Surface(shadowElevation = 8.dp) {
                    Button(
                        onClick  = {
                            AppState.markAcUnitComplete(AcUnitId)
                            onAcUnitCompleted(AcUnitId)
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                            .height(52.dp),
                        colors   = ButtonDefaults.buttonColors(
                            containerColor = BrandSecondary
                        )
                    ) {
                        Icon(
                            Icons.Default.CheckCircle,
                            null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(Modifier.width(8.dp))
                        Text("Selesaikan Unit AC Ini ✓")
                    }
                }
            }
        }
    ) { padding ->
        LazyColumn(
            contentPadding      = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier            = Modifier.padding(padding)
        ) {
            // Progress
            item {
                val done  = steps.count { AppState.isCompleted(it.id) }
                val total = steps.size
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    LinearProgressIndicator(
                        progress   = { if (total > 0) done.toFloat() / total else 0f },
                        modifier   = Modifier.fillMaxWidth().height(8.dp),
                        color      = BrandSecondary,
                        trackColor = NeutralBorder
                    )
                    Text(
                        "$done / $total langkah selesai",
                        style = MaterialTheme.typography.labelSmall,
                        color = NeutralMid
                    )
                }
            }

            // Sections and steps
            sections.forEach { (sectionKey, sectionSteps) ->
                item {
                    val doneInSection  = sectionSteps.count { AppState.isCompleted(it.id) }
                    val totalInSection = sectionSteps.size
                    val isComplete     = doneInSection == totalInSection

                    Surface(
                        shape    = RoundedCornerShape(8.dp),
                        color    = if (isComplete) BrandSecondary.copy(alpha = 0.1f)
                        else BrandPrimary.copy(alpha = 0.08f),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier              = Modifier.padding(
                                horizontal = 12.dp, vertical = 8.dp
                            ),
                            verticalAlignment     = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text       = sectionLabel(sectionKey),
                                style      = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.SemiBold,
                                color      = if (isComplete) BrandSecondary else BrandPrimary
                            )
                            Surface(
                                shape = RoundedCornerShape(20.dp),
                                color = if (isComplete) BrandSecondary.copy(alpha = 0.2f)
                                else BrandPrimary.copy(alpha = 0.15f)
                            ) {
                                Text(
                                    text     = "$doneInSection / $totalInSection",
                                    style    = MaterialTheme.typography.labelSmall,
                                    color    = if (isComplete) BrandSecondary else BrandPrimary,
                                    modifier = Modifier.padding(
                                        horizontal = 8.dp, vertical = 2.dp
                                    )
                                )
                            }
                        }
                    }
                }

                items(sectionSteps.sortedBy { it.orderNumber }) { step ->
                    val isCompleted = AppState.isCompleted(step.id)

                    Surface(
                        shape    = RoundedCornerShape(10.dp),
                        border   = BorderStroke(
                            1.dp,
                            if (isCompleted) BrandSecondary.copy(alpha = 0.3f)
                            else             NeutralBorder
                        ),
                        color    = if (isCompleted) BrandSecondary.copy(alpha = 0.05f)
                        else             Color.White,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable(enabled = !isCompleted) { onStepClick(step) }
                    ) {
                        Row(
                            modifier          = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Icon(
                                imageVector        = if (isCompleted)
                                    Icons.Default.CheckCircle
                                else
                                    Icons.Default.RadioButtonUnchecked,
                                contentDescription = null,
                                tint               = if (isCompleted) BrandSecondary
                                else             NeutralBorder,
                                modifier           = Modifier.size(20.dp)
                            )
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text       = "${step.orderNumber}. ${step.description}",
                                    style      = MaterialTheme.typography.bodySmall,
                                    color      = if (isCompleted) NeutralMid else NeutralDark,
                                    fontWeight = if (isCompleted) FontWeight.Normal
                                    else FontWeight.Medium
                                )
                                Text(
                                    text  = stepTypeLabel(step.stepType),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = NeutralMid
                                )
                            }
                            if (!isCompleted) {
                                Icon(
                                    imageVector        = Icons.AutoMirrored.Filled.ArrowForward,
                                    contentDescription = null,
                                    tint               = NeutralMid,
                                    modifier           = Modifier.size(16.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun sectionLabel(section: String) = when (section) {
    "kedatangan"        -> "1. Kedatangan"
    "pencucian_indoor"  -> "2. Pencucian — Indoor"
    "pencucian_outdoor" -> "3. Pencucian — Outdoor"
    "penyelesaian"      -> "4. Penyelesaian"
    "laporan_kerusakan" -> "5. Laporan Kerusakan"
    else                -> section
}

private fun stepTypeLabel(stepType: String) = when (stepType) {
    "numeric_form_photo"          -> "Isi nilai + foto"
    "text_conditional_photo"      -> "Kondisi + foto jika abnormal"
    "checklist_only"              -> "Checklist"
    "checklist_photo"             -> "Checklist + foto"
    "checklist_conditional_photo" -> "Checklist + foto jika bermasalah"
    "dynamic_finding"             -> "Laporan temuan"
    else                          -> stepType
}