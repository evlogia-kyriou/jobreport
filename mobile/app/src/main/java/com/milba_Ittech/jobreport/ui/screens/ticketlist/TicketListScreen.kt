package com.milba_Ittech.jobreport.ui.screens.ticketlist

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import com.milba_Ittech.jobreport.ui.components.AppTopBar
import com.milba_Ittech.jobreport.ui.components.OliveTitleBlock
import com.milba_Ittech.jobreport.ui.components.OliveWhiteSub
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.milba_Ittech.jobreport.domain.model.Technician
import com.milba_Ittech.jobreport.domain.model.WorkTicketWithDetails
import com.milba_Ittech.jobreport.ui.theme.*
import com.milba_Ittech.jobreport.data.repository.TicketRepository
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import android.util.Log

// ── Screen ────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TicketListScreen(
    viewModel:            TicketListViewModel,
    technician:           Technician,
    onTicketClick:        (id: String, ticketNumber: String, ticketType: String, scheduledTime: String, locationName: String) -> Unit,
    onHistoryTicketClick: (id: String) -> Unit,
    onLogout:             () -> Unit
) {
    val state        by viewModel.state.collectAsState()
    val ticketGroups by viewModel.ticketGroups.collectAsState()

    var selectedTab by remember { mutableStateOf(0) }

    LaunchedEffect(technician.id) {
        viewModel.loadTickets(technician)
    }

    Scaffold(
        topBar = {
            Column {
                AppTopBar(
                    title = {
                        OliveTitleBlock(
                            title    = technician.name,
                            subtitle = "Selamat datang"
                        )
                    },
                    actions = {
                        TextButton(onClick = onLogout) {
                            Text("Keluar", color = OliveWhiteSub)
                        }
                    }
                )
                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor   = OliveDarker,
                    contentColor     = Color.White,
                    indicator        = { tabPositions ->
                        TabRowDefaults.SecondaryIndicator(
                            modifier = Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                            color    = Color.White
                        )
                    }
                ) {
                    Tab(
                        selected = selectedTab == 0,
                        onClick  = { selectedTab = 0 },
                        text     = {
                            Text(
                                "Aktif",
                                style      = MaterialTheme.typography.labelMedium,
                                fontWeight = if (selectedTab == 0) FontWeight.SemiBold
                                else FontWeight.Normal
                            )
                        }
                    )
                    Tab(
                        selected = selectedTab == 1,
                        onClick  = { selectedTab = 1 },
                        text     = {
                            Text(
                                "Riwayat",
                                style      = MaterialTheme.typography.labelMedium,
                                fontWeight = if (selectedTab == 1) FontWeight.SemiBold
                                else FontWeight.Normal
                            )
                        }
                    )
                }
            }
        }
    ) { padding ->

        if (selectedTab == 0) {
            // ── Aktif tab ─────────────────────────────────────────────────────
            when {
                state.isLoading -> Box(
                    Modifier.fillMaxSize().padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = BrandPrimary)
                }

                state.error != null -> Box(
                    Modifier.fillMaxSize().padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(state.error!!, color = BrandError)
                        Spacer(Modifier.height(12.dp))
                        Button(onClick = { viewModel.refresh() }) {
                            Text("Coba Lagi")
                        }
                    }
                }

                ticketGroups.isEmpty() -> Box(
                    Modifier.fillMaxSize().padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.CheckCircle, null,
                            tint     = BrandSecondary,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(Modifier.height(12.dp))
                        Text(
                            "Tidak ada pekerjaan",
                            style = MaterialTheme.typography.bodyLarge,
                            color = NeutralMid
                        )
                    }
                }

                else -> {
                    // ── Detect in_progress ticket ─────────────────────────────
                    val allTickets       = ticketGroups.flatMap { it.tickets }
                    val inProgressTicket = allTickets.firstOrNull { it.status == "in_progress" }
                    val hasActiveJob     = inProgressTicket != null  // ← lock flag ✅

                    val mainGroups    = ticketGroups.filter { !it.isLainnya }
                    val lainnyaGroups = ticketGroups.filter { it.isLainnya }
                    val lainnyaTotal  = lainnyaGroups.sumOf { it.tickets.size }

                    LazyColumn(
                        contentPadding = PaddingValues(
                            top    = padding.calculateTopPadding() + 8.dp,
                            bottom = 24.dp,
                            start  = 16.dp,
                            end    = 16.dp
                        ),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {

                        // ── Pinned in_progress ticket at top ──────────────────
                        if (inProgressTicket != null) {
                            item(key = "active_banner") {
                                ActiveJobBanner(
                                    ticket  = inProgressTicket,
                                    onClick = {
                                        onTicketClick(
                                            inProgressTicket.id,
                                            inProgressTicket.ticketNumber,
                                            inProgressTicket.type,
                                            inProgressTicket.scheduledTime,
                                            inProgressTicket.locationName
                                        )
                                    }
                                )
                                Spacer(Modifier.height(8.dp))
                            }
                        }

                        // ── Other ticket groups ───────────────────────────────
                        mainGroups.forEach { group ->
                            // Skip the in_progress ticket from its original group ✅
                            val visibleTickets = group.tickets.filter {
                                it.id != inProgressTicket?.id
                            }
                            if (visibleTickets.isEmpty()) return@forEach

                            item(key = "header_${group.label}") {
                                GroupHeader(group = group)
                            }
                            items(items = visibleTickets, key = { it.id }) { ticket ->
                                val isLocked = hasActiveJob && ticket.status == "assigned"
                                TicketCard(
                                    ticket    = ticket,
                                    isOverdue = group.isOverdue,
                                    isLocked  = isLocked,   // ← pass lock flag ✅
                                    onClick   = {
                                        if (!isLocked) {
                                            onTicketClick(
                                                ticket.id,
                                                ticket.ticketNumber,
                                                ticket.type,
                                                ticket.scheduledTime,
                                                ticket.locationName
                                            )
                                        }
                                    }
                                )
                            }
                            item(key = "spacer_${group.label}") {
                                Spacer(Modifier.height(8.dp))
                            }
                        }

                        if (lainnyaGroups.isNotEmpty()) {
                            item(key = "lainnya_header") {
                                LainnyaHeader(
                                    totalTickets  = lainnyaTotal,
                                    dayCount      = lainnyaGroups.size,
                                    groups        = lainnyaGroups,
                                    hasActiveJob  = hasActiveJob,
                                    activeId      = inProgressTicket?.id,
                                    onTicketClick = onTicketClick
                                )
                            }
                        }
                    }
                }
            }
        } else {
            // ── Riwayat tab ───────────────────────────────────────────────────
            HistoryTabContent(
                technicianId         = technician.id,
                topPadding           = padding.calculateTopPadding(),
                onHistoryTicketClick = onHistoryTicketClick
            )
        }
    }
}

// ── Active job banner (pinned in_progress card) ───────────────────────────────

@Composable
fun ActiveJobBanner(
    ticket:  WorkTicketWithDetails,
    onClick: () -> Unit
) {
    Surface(
        onClick  = onClick,
        shape    = RoundedCornerShape(14.dp),
        color    = BrandPrimary.copy(alpha = 0.08f),
        border   = androidx.compose.foundation.BorderStroke(1.dp, BrandPrimary.copy(alpha = 0.4f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            // "Sedang Berlangsung" label
            Row(
                verticalAlignment     = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Surface(
                    shape = RoundedCornerShape(100.dp),
                    color = BrandPrimary
                ) {
                    Text(
                        "● Sedang Berlangsung",
                        style      = MaterialTheme.typography.labelSmall,
                        color      = Color.White,
                        fontWeight = FontWeight.SemiBold,
                        modifier   = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }
            Spacer(Modifier.height(10.dp))
            Text(
                ticket.locationName,
                style      = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                color      = NeutralDark
            )
            Spacer(Modifier.height(2.dp))
            Text(
                ticket.locationAddr,
                style    = MaterialTheme.typography.labelSmall,
                color    = NeutralMid,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(Modifier.height(8.dp))
            // Lanjutkan button
            Row(
                modifier              = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End
            ) {
                Surface(
                    shape = RoundedCornerShape(100.dp),
                    color = BrandPrimary
                ) {
                    Row(
                        modifier          = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            Icons.Default.PlayArrow, null,
                            tint     = Color.White,
                            modifier = Modifier.size(14.dp)
                        )
                        Text(
                            "Lanjutkan",
                            style      = MaterialTheme.typography.labelSmall,
                            color      = Color.White,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }
        }
    }
}

// ── History tab ───────────────────────────────────────────────────────────────

@Composable
fun HistoryTabContent(
    technicianId:         String,
    topPadding:           androidx.compose.ui.unit.Dp = 0.dp,
    onHistoryTicketClick: (id: String) -> Unit
) {
    val ticketRepo = remember { TicketRepository() }
    val tickets    = remember { mutableStateListOf<WorkTicketWithDetails>() }
    var isLoading  by remember { mutableStateOf(true) }
    var error      by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(technicianId) {
        Log.d("HistoryTab", "Loading history for ID: $technicianId")
        isLoading = true
        tickets.clear()
        error = null
        try {
            val result = ticketRepo.getHistoryTickets(technicianId)
            Log.d("HistoryTab", "Found ${result.size} tickets")
            tickets.addAll(result)
        } catch (e: Exception) {
            Log.e("HistoryTab", "Failed: ${e.message}")
            error = "Gagal memuat riwayat."
        } finally {
            isLoading = false
        }
    }

    when {
        isLoading -> Box(
            modifier         = Modifier.fillMaxSize().padding(top = topPadding),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(color = BrandPrimary)
        }

        error != null -> Box(
            modifier         = Modifier.fillMaxSize().padding(top = topPadding, start = 24.dp, end = 24.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(error!!, style = MaterialTheme.typography.bodySmall, color = BrandError)
        }

        tickets.isEmpty() -> Box(
            modifier         = Modifier.fillMaxSize().padding(top = topPadding, start = 24.dp, end = 24.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(Icons.Default.History, null, tint = NeutralMid, modifier = Modifier.size(40.dp))
                Text("Belum ada riwayat pekerjaan", style = MaterialTheme.typography.bodySmall, color = NeutralMid)
            }
        }

        else -> LazyColumn(
            modifier            = Modifier.fillMaxSize(),
            contentPadding      = PaddingValues(top = topPadding + 8.dp, bottom = 24.dp, start = 16.dp, end = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(tickets, key = { it.id }) { ticket ->
                HistoryTicketCard(
                    ticket      = ticket,
                    onCardClick = { onHistoryTicketClick(ticket.id) }
                )
            }
        }
    }
}

// ── History ticket card ───────────────────────────────────────────────────────

@Composable
fun HistoryTicketCard(
    ticket:      WorkTicketWithDetails,
    onCardClick: () -> Unit
) {
    val isApproved = ticket.status == "approved"
    val badgeColor = if (isApproved) BrandSecondary else BrandWarning
    val badgeLabel = if (isApproved) "Disetujui" else "Menunggu"
    val dateLabel  = formatHistoryDate(ticket.scheduledDate)

    Surface(
        onClick  = onCardClick,
        shape    = RoundedCornerShape(12.dp),
        color    = if (isApproved)
            BrandSecondary.copy(alpha = 0.03f)
        else MaterialTheme.colorScheme.surface,
        border   = androidx.compose.foundation.BorderStroke(
            if (isApproved) 1.dp else 0.5.dp,
            if (isApproved) BrandSecondary.copy(alpha = 0.5f) else BrandWarning.copy(alpha = 0.4f)
        ),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier              = Modifier.padding(14.dp),
            verticalAlignment     = Alignment.Top,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    ticket.locationName,
                    style      = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.SemiBold,
                    color      = NeutralDark
                )
                if (!ticket.locationAddr.isNullOrBlank()) {
                    Text(
                        ticket.locationAddr,
                        style    = MaterialTheme.typography.labelSmall,
                        color    = NeutralMid,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    "$dateLabel · ${ticket.picName}",
                    style = MaterialTheme.typography.labelSmall,
                    color = NeutralMid
                )
            }
            Spacer(Modifier.width(8.dp))
            Surface(
                shape = RoundedCornerShape(100.dp),
                color = badgeColor.copy(alpha = 0.12f)
            ) {
                Text(
                    text       = badgeLabel,
                    style      = MaterialTheme.typography.labelSmall,
                    color      = badgeColor,
                    fontWeight = FontWeight.SemiBold,
                    modifier   = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
        }
    }
}

private fun formatHistoryDate(dateStr: String): String {
    return try {
        val date    = java.time.LocalDate.parse(dateStr)
        val dayName = when (date.dayOfWeek.value) {
            1 -> "Senin"; 2 -> "Selasa"; 3 -> "Rabu"; 4 -> "Kamis"
            5 -> "Jumat"; 6 -> "Sabtu"; else -> "Minggu"
        }
        val fmt = java.time.format.DateTimeFormatter.ofPattern(
            "d MMMM yyyy", java.util.Locale("id", "ID"))
        "$dayName, ${date.format(fmt)}"
    } catch (e: Exception) { dateStr }
}

// ── Group header ──────────────────────────────────────────────────────────────

@Composable
fun GroupHeader(group: TicketGroup) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            if (group.isOverdue) {
                Icon(Icons.Default.Warning, null, tint = BrandError, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(4.dp))
            }
            Text(
                text       = group.label,
                style      = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
                color      = if (group.isOverdue) BrandError else NeutralDark
            )
            Spacer(Modifier.weight(1f))
            Text(
                "${group.tickets.size} pekerjaan",
                style = MaterialTheme.typography.labelSmall,
                color = NeutralMid
            )
        }
        group.completionSummary?.let { summary ->
            Spacer(Modifier.height(2.dp))
            Text("✅ $summary", style = MaterialTheme.typography.labelSmall, color = BrandSecondary)
        }
        Spacer(Modifier.height(6.dp))
    }
}

// ── Lainnya collapsible section ───────────────────────────────────────────────

@Composable
fun LainnyaHeader(
    totalTickets:  Int,
    dayCount:      Int,
    groups:        List<TicketGroup>,
    hasActiveJob:  Boolean,
    activeId:      String?,
    onTicketClick: (id: String, ticketNumber: String, ticketType: String, scheduledTime: String, locationName: String) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    Column {
        Surface(
            onClick  = { expanded = !expanded },
            shape    = RoundedCornerShape(12.dp),
            color    = MaterialTheme.colorScheme.surfaceVariant,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = if (expanded) Icons.Default.KeyboardArrowUp
                    else Icons.Default.KeyboardArrowDown,
                    null,
                    tint     = NeutralMid,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(Modifier.width(8.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        "Pekerjaan Lainnya",
                        style      = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.SemiBold,
                        color      = NeutralDark
                    )
                    Text(
                        "$totalTickets pekerjaan · $dayCount hari ke depan",
                        style = MaterialTheme.typography.labelSmall,
                        color = NeutralMid
                    )
                }
            }
        }
        AnimatedVisibility(visible = expanded) {
            Column(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier            = Modifier.padding(top = 8.dp)
            ) {
                groups.forEach { group ->
                    val visibleTickets = group.tickets.filter { it.id != activeId }
                    if (visibleTickets.isEmpty()) return@forEach
                    GroupHeader(group = group)
                    visibleTickets.forEach { ticket ->
                        val isLocked = hasActiveJob && ticket.status == "assigned"
                        TicketCard(
                            ticket    = ticket,
                            isOverdue = false,
                            isLocked  = isLocked,
                            onClick   = {
                                if (!isLocked) {
                                    onTicketClick(
                                        ticket.id,
                                        ticket.ticketNumber,
                                        ticket.type,
                                        ticket.scheduledTime,
                                        ticket.locationName
                                    )
                                }
                            }
                        )
                    }
                    Spacer(Modifier.height(4.dp))
                }
            }
        }
    }
}

// ── Ticket card ───────────────────────────────────────────────────────────────

@Composable
fun TicketCard(
    ticket:   WorkTicketWithDetails,
    isOverdue: Boolean,
    isLocked:  Boolean = false,    // ← new: greyed out when job active ✅
    onClick:  () -> Unit
) {
    val isSubmitted = ticket.status in setOf("submitted", "approved")

    Surface(
        onClick         = onClick,
        shape           = RoundedCornerShape(12.dp),
        color           = when {
            isLocked    -> NeutralLight                          // greyed out ✅
            isOverdue   -> BrandError.copy(alpha = 0.06f)
            isSubmitted -> BrandSecondary.copy(alpha = 0.06f)
            else        -> Color.White
        },
        shadowElevation = if (isLocked || isSubmitted || isOverdue) 0.dp else 2.dp,
        modifier        = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier          = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    StatusDot(ticket.status, isOverdue, isLocked)
                    Spacer(Modifier.width(6.dp))
                    Text(
                        formatTime(ticket.scheduledTime),
                        style      = MaterialTheme.typography.labelMedium,
                        color      = if (isLocked) NeutralMid.copy(alpha = 0.5f)
                        else if (isOverdue) BrandError else NeutralMid,
                        fontWeight = FontWeight.Medium
                    )
                }
                Spacer(Modifier.weight(1f))
                if (isLocked) {
                    // Lock icon instead of status badge ✅
                    Icon(
                        Icons.Default.Lock, null,
                        tint     = NeutralMid.copy(alpha = 0.4f),
                        modifier = Modifier.size(16.dp)
                    )
                } else {
                    StatusBadge(ticket.status, isOverdue)
                }
            }
            Spacer(Modifier.height(6.dp))
            Text(
                ticket.locationName,
                style      = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                color      = if (isLocked) NeutralDark.copy(alpha = 0.4f) else NeutralDark,
                maxLines   = 1,
                overflow   = TextOverflow.Ellipsis
            )
            Spacer(Modifier.height(2.dp))
            Text(
                ticket.locationAddr,
                style    = MaterialTheme.typography.labelSmall,
                color    = if (isLocked) NeutralMid.copy(alpha = 0.4f) else NeutralMid,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            // Lock hint text ✅
            if (isLocked) {
                Spacer(Modifier.height(6.dp))
                Text(
                    "Ada pekerjaan aktif yang belum selesai",
                    style  = MaterialTheme.typography.labelSmall,
                    color  = NeutralMid.copy(alpha = 0.5f)
                )
            }
        }
    }
}

// ── Sub-composables ───────────────────────────────────────────────────────────

@Composable
fun StatusDot(status: String, isOverdue: Boolean, isLocked: Boolean = false) {
    val color = when {
        isLocked               -> NeutralBorder.copy(alpha = 0.4f)
        isOverdue              -> BrandError
        status == "submitted"  -> BrandSecondary
        status == "approved"   -> BrandSecondary
        status == "in_progress"-> BrandPrimary
        else                   -> NeutralBorder
    }
    Surface(shape = RoundedCornerShape(50), color = color, modifier = Modifier.size(8.dp)) {}
}

@Composable
fun StatusBadge(status: String, isOverdue: Boolean) {
    val (label, color) = when {
        isOverdue               -> "Terlambat"   to BrandError
        status == "submitted"   -> "Terkirim"    to BrandSecondary
        status == "approved"    -> "Disetujui"   to BrandSecondary
        status == "in_progress" -> "Berlangsung" to BrandPrimary
        status == "cancelled"   -> "Dibatalkan"  to NeutralMid
        else                    -> "Belum Mulai" to NeutralMid
    }
    Surface(shape = RoundedCornerShape(100), color = color.copy(alpha = 0.12f)) {
        Text(
            text       = label,
            style      = MaterialTheme.typography.labelSmall,
            color      = color,
            fontWeight = FontWeight.SemiBold,
            modifier   = Modifier.padding(horizontal = 10.dp, vertical = 3.dp)
        )
    }
}

private fun formatTime(time: String?): String {
    if (time.isNullOrBlank()) return "—"
    val parts = time.split(":")
    return if (parts.size >= 2) "${parts[0]}:${parts[1]} WIB" else time
}