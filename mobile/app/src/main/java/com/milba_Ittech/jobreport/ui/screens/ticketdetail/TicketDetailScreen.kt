@file:OptIn(ExperimentalMaterial3Api::class)

package com.milba_Ittech.jobreport.ui.screens.ticketdetail
import androidx.compose.runtime.derivedStateOf
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
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
    ticketId:           String,
    ticketTitle:        String,
    technician:          Technician,
    onAcUnitClick:   (String) -> Unit,
    onProceedToSign: () -> Unit,
    onBack:          () -> Unit
) {
    val state by viewModel.state.collectAsState()
    val isComplete by viewModel.isTicketComplete.collectAsState()

    LaunchedEffect(ticketId) { viewModel.loadTicket(ticketId) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = ticketTitle,
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        val done = state.AcUnits.count { AppState.isAcUnitCompleted(it.AcUnit.id) }
                        val total = state.AcUnits.size
                        Text(
                            text = "$done dari $total AC selesai",
                            style = MaterialTheme.typography.labelSmall,
                            color = NeutralMid
                        )
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
            if (isComplete) {
                Surface(shadowElevation = 8.dp) {
                    Button(
                        onClick = onProceedToSign,
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
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.padding(padding)
                ) {
                    // Progress bar
                    item {
                        val done = state.AcUnits.count { AppState.isAcUnitCompleted(it.AcUnit.id) }
                        val total = state.AcUnits.size
                        if (total > 0) {
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                LinearProgressIndicator(
                                    progress = { done.toFloat() / total.toFloat() },
                                    modifier = Modifier.fillMaxWidth().height(8.dp),
                                    color = BrandSecondary,
                                    trackColor = NeutralBorder
                                )
                                Text(
                                    "$done / $total unit selesai",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = NeutralMid
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AcUnitCard(
    unit:    TicketAcUnit,   // was AcUnit
    onClick: () -> Unit
    // Remove: onNotFound parameter
) {
    val isComplete = AppState.isAcUnitCompleted(unit.AcUnit.id)

    Surface(
        shape    = RoundedCornerShape(12.dp),
        border   = BorderStroke(1.dp, if (isComplete) BrandSecondary.copy(0.4f) else NeutralBorder),
        color    = if (isComplete) BrandSecondary.copy(0.05f) else Color.White,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier          = Modifier.fillMaxWidth()
            ) {
                Icon(
                    imageVector        = if (isComplete) Icons.Default.CheckCircle
                    else Icons.Default.RadioButtonUnchecked,
                    contentDescription = null,
                    tint               = if (isComplete) BrandSecondary else NeutralBorder,
                    modifier           = Modifier.size(20.dp)
                )
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text       = unit.AcUnit.displayName,     // name → displayName
                        style      = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium,
                        color      = NeutralDark
                    )
                    val detail = listOfNotNull(
                        unit.AcUnit.type,
                        unit.AcUnit.capacityPk                    // brand removed, pk → capacityPk
                    ).joinToString(" · ")
                    if (detail.isNotEmpty()) {
                        Text(detail, style = MaterialTheme.typography.labelSmall, color = NeutralMid)
                    }
                    unit.AcUnit.accessNotes?.let { notes ->
                        Text(
                            "⚠ $notes",
                            style = MaterialTheme.typography.labelSmall,
                            color = NeutralMid
                        )
                    }
                }
            }

            if (!isComplete) {
                Spacer(Modifier.height(12.dp))
                Button(
                    onClick  = onClick,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Mulai")
                }
                // Remove: "Tidak Ada" OutlinedButton
            }
        }
    }
}
