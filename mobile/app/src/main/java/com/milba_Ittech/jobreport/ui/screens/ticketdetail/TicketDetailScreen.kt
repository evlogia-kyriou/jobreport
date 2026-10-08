package com.milba_Ittech.jobreport.ui.screens.ticketdetail

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import com.milba_Ittech.jobreport.ui.components.AppTopBar
import com.milba_Ittech.jobreport.ui.components.OliveTitleBlock
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.milba_Ittech.jobreport.domain.model.TicketAcUnit
import com.milba_Ittech.jobreport.domain.model.Technician
import com.milba_Ittech.jobreport.data.AppState
import com.milba_Ittech.jobreport.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TicketDetailScreen(
    viewModel:       TicketDetailViewModel,
    ticketId:        String,
    ticketNumber:    String,
    ticketType:      String,
    scheduledTime:   String,
    locationName:    String,
    technician:      Technician,
    onAcUnitClick:   (String) -> Unit,
    onProceedToSign: () -> Unit,
    onBack:          () -> Unit
) {
    val state      by viewModel.state.collectAsState()
    val isComplete by viewModel.isTicketComplete.collectAsState()

    val done  = state.AcUnits.count { AppState.isAcUnitCompleted(it.AcUnit.id) }
    val total = state.AcUnits.size

    LaunchedEffect(ticketId) { viewModel.loadTicket(ticketId) }

    Scaffold(
        topBar = {
            AppTopBar(
                title = {
                    OliveTitleBlock(
                        title    = locationName,
                        subtitle = buildSubtitle(ticketNumber, ticketType, scheduledTime)
                    )
                },
                onBack = onBack
            )
        },
        bottomBar = {
            if (isComplete) {
                Surface(shadowElevation = 8.dp) {
                    Button(
                        onClick  = onProceedToSign,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                            .height(52.dp)
                    ) {
                        Text("Lanjut ke Tanda Tangan")
                    }
                }
            }
        }
    ) { padding ->

        when {
            state.isLoading -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = BrandPrimary)
                }
            }

            state.error != null -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(state.error!!, color = BrandError)
                }
            }

            else -> {
                LazyColumn(
                    contentPadding      = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier            = Modifier.padding(padding)
                ) {
                    // Progress bar
                    if (total > 0) {
                        item {
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                LinearProgressIndicator(
                                    progress   = { done.toFloat() / total.toFloat() },
                                    modifier   = Modifier
                                        .fillMaxWidth()
                                        .height(6.dp),
                                    color      = BrandSecondary,
                                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                                )
                                Text(
                                    "$done / $total unit AC selesai",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    // AC unit cards
                    items(state.AcUnits, key = { it.AcUnit.id }) { unit ->
                        AcUnitCard(
                            unit    = unit,
                            onClick = { onAcUnitClick(unit.AcUnit.id) }
                        )
                    }
                }
            }
        }
    }
}


// ── Header helpers ────────────────────────────────────────────────────────────

private fun typeLabel(type: String): String = when (type) {
    "cleaning"     -> "Cuci"
    "service"      -> "Servis"
    "installation" -> "Pasang"
    else           -> type.replaceFirstChar { it.uppercase() }
}

private fun buildSubtitle(ticketNumber: String, type: String, time: String): String {
    val timePart = if (time.isNotBlank()) {
        val parts = time.split(":")
        if (parts.size >= 2) "${parts[0]}:${parts[1]} WIB" else time
    } else ""
    return listOfNotNull(
        ticketNumber,
        typeLabel(type),
        timePart.ifBlank { null }
    ).joinToString(" · ")
}

// ── AC Unit Card ──────────────────────────────────────────────────────────────

@Composable
fun AcUnitCard(
    unit:    TicketAcUnit,
    onClick: () -> Unit
) {
    val isComplete = AppState.isAcUnitCompleted(unit.AcUnit.id)

    Surface(
        shape           = RoundedCornerShape(12.dp),
        border          = BorderStroke(
            0.5.dp,
            if (isComplete) BrandSecondary.copy(alpha = 0.4f)
            else            MaterialTheme.colorScheme.outlineVariant
        ),
        color           = if (isComplete)
            BrandSecondary.copy(alpha = 0.06f)
        else
            MaterialTheme.colorScheme.surface,
        modifier        = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {

            // Row 1: status icon + location in building
            Row(
                verticalAlignment = Alignment.Top,
                modifier          = Modifier.fillMaxWidth()
            ) {
                // ✅ or ☐ icon
                Icon(
                    imageVector        = if (isComplete) Icons.Default.CheckCircle
                    else            Icons.Default.RadioButtonUnchecked,
                    contentDescription = if (isComplete) "Selesai" else "Belum selesai",
                    tint               = if (isComplete) BrandSecondary
                    else            MaterialTheme.colorScheme.outlineVariant,
                    modifier           = Modifier
                        .size(20.dp)
                        .padding(top = 1.dp)
                )
                Spacer(Modifier.width(10.dp))

                Column(modifier = Modifier.weight(1f)) {
                    // Location in building (primary identifier)
                    Text(
                        text       = unit.AcUnit.displayName,
                        style      = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                        color      = if (isComplete)
                            MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        else
                            MaterialTheme.colorScheme.onSurface
                    )

                    Spacer(Modifier.height(2.dp))

                    // AC specs
                    Text(
                        text  = buildSpecLine(unit),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    // Access notes warning (if any)
                    unit.AcUnit.accessNotes?.let { notes ->
                        Spacer(Modifier.height(4.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Warning,
                                null,
                                tint     = BrandWarning,
                                modifier = Modifier.size(13.dp)
                            )
                            Spacer(Modifier.width(3.dp))
                            Text(
                                text  = notes,
                                style = MaterialTheme.typography.labelSmall,
                                color = BrandWarning
                            )
                        }
                    }
                }
            }

            // [Mulai] button — only shown when not complete
            if (!isComplete) {
                Spacer(Modifier.height(10.dp))
                Button(
                    onClick  = onClick,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(40.dp)
                ) {
                    Text("Mulai", style = MaterialTheme.typography.labelLarge)
                    Spacer(Modifier.width(4.dp))
                    Icon(
                        Icons.Default.ChevronRight,
                        null,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}

// ── Helper ────────────────────────────────────────────────────────────────────

private fun buildSpecLine(unit: TicketAcUnit): String {
    return listOfNotNull(
        unit.AcUnit.type,
        unit.AcUnit.capacityPk,
        unit.AcUnit.acCode
    ).joinToString(" · ")
}