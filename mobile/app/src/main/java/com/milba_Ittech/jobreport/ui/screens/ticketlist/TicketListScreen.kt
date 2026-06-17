package com.milba_Ittech.jobreport.ui.screens.ticketlist

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.milba_Ittech.jobreport.ui.theme.*
import com.milba_Ittech.jobreport.data.AppState
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import com.milba_Ittech.jobreport.domain.model.Technician
import com.milba_Ittech.jobreport.domain.model.WorkTicketWithDetails

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TicketListScreen(
    viewModel:   TicketListViewModel,
    technician:      Technician,
    onTicketClick:  (String) -> Unit,
    onLogout:    () -> Unit
) {
    val state     by viewModel.state.collectAsState()
    val ticketGroups by viewModel.ticketGroups.collectAsState()
    val refreshState = rememberPullToRefreshState()

    LaunchedEffect(technician) { viewModel.loadTickets(technician) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text  = "Selamat datang, ${technician.name}",
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text  = "Pekerjaan hari ini",
                            style = MaterialTheme.typography.labelSmall,
                            color = NeutralMid
                        )
                    }
                },
                actions = {
                    IconButton(onClick = onLogout) {
                        Icon(Icons.Default.Logout, "Keluar")
                    }
                }
            )
        }
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.isLoading,
            onRefresh    = viewModel::refresh,
            modifier     = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when {
                state.isLoading && state.tickets.isEmpty() -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = BrandPrimary)
                    }
                }

                state.error != null -> {
                    Column(
                        modifier            = Modifier.fillMaxSize().padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(Icons.Default.CloudOff, null, tint = NeutralMid)
                        Spacer(Modifier.height(8.dp))
                        Text(state.error!!, color = NeutralMid, style = MaterialTheme.typography.bodySmall)
                        Spacer(Modifier.height(12.dp))
                        Button(onClick = viewModel::refresh) { Text("Coba Lagi") }
                    }
                }

                ticketGroups.isEmpty() -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                null,
                                tint     = BrandSecondary,
                                modifier = Modifier.size(48.dp)
                            )
                            Spacer(Modifier.height(8.dp))
                            Text(
                                "Semua pekerjaan selesai!",
                                style = MaterialTheme.typography.bodyLarge,
                                color = NeutralDark,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }

                else -> {
                    LazyColumn(
                        contentPadding     = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        ticketGroups.forEach { group ->
                            item {
                                Text(
                                    text  = group.label,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = NeutralMid,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.padding(vertical = 8.dp)
                                )
                            }
                            items(group.tickets) { ticket ->
                                TicketCard(
                                    ticket     = ticket,
                                    onClick = { onTicketClick(ticket.id) }
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
fun TicketCard(ticket: WorkTicketWithDetails, onClick: () -> Unit) {
    val isOverdue = false
    val isSubmitted = AppState.isTicketSubmitted(ticket.id)

    if (isSubmitted) {
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = BrandSecondary.copy(alpha = 0.1f)
        ) {
            Row(
                modifier          = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Icon(
                    Icons.Default.CheckCircle,
                    null,
                    tint     = BrandSecondary,
                    modifier = Modifier.size(12.dp)
                )
                Text(
                    text  = "Selesai · ${AppState.submittedAt[ticket.id] ?: ""}",
                    style = MaterialTheme.typography.labelSmall,
                    color = BrandSecondary
                )
            }
        }
    }


    Surface(
        onClick   = onClick,
        shape     = RoundedCornerShape(12.dp),
        border    = BorderStroke(
            1.dp,
            if (isOverdue) BrandError.copy(alpha = 0.3f) else NeutralBorder
        ),
        color     = if (isOverdue) BrandError.copy(alpha = 0.05f) else Color.White,
        modifier  = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier            = Modifier.padding(16.dp),
            verticalAlignment   = Alignment.CenterVertically
        ) {
            // Status indicator
            val statusColor = when (ticket.status) {
                "in_progress" -> BrandPrimary
                "overdue"     -> BrandError
                "submitted"   -> BrandSecondary
                "approved"    -> BrandSecondary
                else          -> NeutralMid
            }

            Box(
                modifier = Modifier
                    .size(10.dp)
                    .background(statusColor, shape = androidx.compose.foundation.shape.CircleShape)
            )

            Spacer(Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text       = ticket.locationName,
                    style      = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium,
                    color      = NeutralDark
                )
                Text(
                    text  = "${ticket.scheduledDate} · ${formatTime(ticket.scheduledTime)}",
                    style = MaterialTheme.typography.labelSmall,
                    color = if (isOverdue) BrandError else NeutralMid
                )
                Text(
                    text  = statusLabel(ticket.status),
                    style = MaterialTheme.typography.labelSmall,
                    color = statusColor
                )
            }

            Icon(
                imageVector        = Icons.Default.ChevronRight,
                contentDescription = null,
                tint               = NeutralMid
            )
        }
    }
}

private fun statusLabel(status: String) = when (status) {
    "assigned"         -> "Belum dimulai"
    "in_progress"      -> "Berlangsung"
    "submitted"        -> "Dikirim"
    "approved"         -> "Disetujui"
    "overdue"          -> "Terlambat"
    else               -> status
}

private fun formatTime(time: String): String {
    return try {
        time.substring(0, 5).replace(":", ".") + " WIB"  // "08:00:00" → "08.00 WIB"
    } catch (e: Exception) { time }
}