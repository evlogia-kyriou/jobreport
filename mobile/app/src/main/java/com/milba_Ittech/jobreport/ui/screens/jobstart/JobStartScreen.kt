package com.milba_Ittech.jobreport.ui.screens.jobstart

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.milba_Ittech.jobreport.data.AppState
import com.milba_Ittech.jobreport.data.repository.TicketRepository
import com.milba_Ittech.jobreport.domain.model.TicketAcUnit
import com.milba_Ittech.jobreport.domain.model.WorkTicketWithDetails
import com.milba_Ittech.jobreport.ui.components.AppTopBar
import com.milba_Ittech.jobreport.ui.components.OliveTitleBlock
import com.milba_Ittech.jobreport.ui.theme.*
import kotlinx.coroutines.launch

// ── JobStartScreen ─────────────────────────────────────────────────────────────
// Shown between TicketList and TicketDetail ✅
// Technician reviews job summary → taps "Mulai" or "Lanjutkan" ✅

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JobStartScreen(
    ticketId:      String,
    ticketNumber:  String,
    locationName:  String,
    technicianId:  String,
    onStart:       () -> Unit,   // navigates to TicketDetail ✅
    onBack:        () -> Unit
) {
    val ticketRepo     = remember { TicketRepository() }
    val coroutineScope = rememberCoroutineScope()

    var ticket    by remember { mutableStateOf<WorkTicketWithDetails?>(null) }
    var acUnits   by remember { mutableStateOf<List<TicketAcUnit>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var isStarting by remember { mutableStateOf(false) }
    var error     by remember { mutableStateOf<String?>(null) }

    // Load ticket details + AC units
    LaunchedEffect(ticketId) {
        isLoading = true
        try {
            ticket  = ticketRepo.getTicketById(ticketId)
            acUnits = ticketRepo.getTicketAcUnits(ticketId)
        } catch (e: Exception) {
            error = "Gagal memuat data tiket."
        } finally {
            isLoading = false
        }
    }

    // Compute progress for in_progress tickets
    val completedSteps = remember(ticketId) {
        AppState.stepInputValues.size // rough proxy — shows overall progress
    }

    val isInProgress = ticket?.status == "in_progress"
    val buttonLabel  = if (isInProgress) "Lanjutkan" else "Mulai"

    Scaffold(
        topBar = {
            AppTopBar(
                title = { OliveTitleBlock(title = ticketNumber, subtitle = locationName) },
                onBack = onBack
            )
        },
        bottomBar = {
            Surface(shadowElevation = 8.dp) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Button(
                        onClick = {
                            if (isInProgress) {
                                // Already started — go straight to work ✅
                                onStart()
                            } else {
                                // First time — call startTicket() ✅
                                isStarting = true
                                coroutineScope.launch {
                                    try {
                                        ticketRepo.startTicket(ticketId, technicianId)
                                        onStart()
                                    } catch (e: Exception) {
                                        error = "Gagal memulai pekerjaan. Coba lagi."
                                        isStarting = false
                                    }
                                }
                            }
                        },
                        enabled  = !isLoading && !isStarting,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        colors   = ButtonDefaults.buttonColors(
                            containerColor = if (isInProgress) BrandPrimary else BrandSecondary
                        )
                    ) {
                        if (isStarting) {
                            CircularProgressIndicator(
                                color       = androidx.compose.ui.graphics.Color.White,
                                modifier    = Modifier.size(20.dp),
                                strokeWidth = 2.dp
                            )
                            Spacer(Modifier.width(8.dp))
                            Text("Memulai...")
                        } else {
                            Icon(
                                imageVector = if (isInProgress)
                                    Icons.Default.PlayArrow
                                else
                                    Icons.Default.PlayArrow,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(
                                text       = buttonLabel,
                                style      = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }
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

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // ── Error ─────────────────────────────────────────────────────────
            error?.let {
                Surface(
                    shape  = RoundedCornerShape(10.dp),
                    color  = BrandError.copy(alpha = 0.08f)
                ) {
                    Text(
                        text     = it,
                        style    = MaterialTheme.typography.bodySmall,
                        color    = BrandError,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }

            // ── Status banner ─────────────────────────────────────────────────
            if (isInProgress) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = BrandPrimary.copy(alpha = 0.08f)
                ) {
                    Row(
                        modifier              = Modifier.padding(12.dp),
                        verticalAlignment     = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Icon(
                            Icons.Default.Info,
                            null,
                            tint     = BrandPrimary,
                            modifier = Modifier.size(18.dp)
                        )
                        Text(
                            text  = "Pekerjaan sedang berlangsung — tap Lanjutkan untuk melanjutkan.",
                            style = MaterialTheme.typography.bodySmall,
                            color = BrandPrimary
                        )
                    }
                }
            }

            // ── Job info card ─────────────────────────────────────────────────
            Surface(
                shape  = RoundedCornerShape(14.dp),
                color  = MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier            = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        "Detail Pekerjaan",
                        style      = MaterialTheme.typography.labelSmall,
                        color      = NeutralMid,
                        fontWeight = FontWeight.SemiBold
                    )

                    HorizontalDivider(color = NeutralBorder)

                    // Ticket number + type
                    InfoRow(
                        icon  = Icons.Default.ConfirmationNumber,
                        label = "Tiket",
                        value = ticket?.let { "${it.ticketNumber} · ${typeLabel(it.type)}" }
                            ?: ticketNumber
                    )

                    // Scheduled date + time
                    ticket?.let { t ->
                        InfoRow(
                            icon  = Icons.Default.CalendarToday,
                            label = "Jadwal",
                            value = "${formatDate(t.scheduledDate)} · ${t.scheduledTime.take(5)} WIB"
                        )
                    }

                    // Location
                    InfoRow(
                        icon  = Icons.Default.LocationOn,
                        label = "Lokasi",
                        value = ticket?.let {
                            buildString {
                                append(it.locationName)
                                if (it.locationAddr.isNotBlank()) append("\n${it.locationAddr}")
                            }
                        } ?: locationName
                    )
                }
            }

            // ── Access regulations — shown prominently before work starts ✅
            val regulations = ticket?.locationRegulations
            if (!regulations.isNullOrBlank()) {
                Surface(
                    shape    = RoundedCornerShape(14.dp),
                    color    = BrandWarning.copy(alpha = 0.08f),
                    border   = androidx.compose.foundation.BorderStroke(
                        1.dp, BrandWarning.copy(alpha = 0.4f)
                    ),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier            = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Row(
                            verticalAlignment     = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                Icons.Default.Warning, null,
                                tint     = BrandWarning,
                                modifier = Modifier.size(18.dp)
                            )
                            Text(
                                "Regulasi & aturan akses",
                                style      = MaterialTheme.typography.labelMedium,
                                color      = BrandWarning,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                        Text(
                            text  = regulations,
                            style = MaterialTheme.typography.bodySmall,
                            color = BrandWarning.copy(alpha = 0.85f)
                        )
                    }
                }
            }

            // ── AC units card ─────────────────────────────────────────────────
            Surface(
                shape    = RoundedCornerShape(14.dp),
                color    = MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier            = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        modifier              = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment     = Alignment.CenterVertically
                    ) {
                        Text(
                            "Unit AC",
                            style      = MaterialTheme.typography.labelSmall,
                            color      = NeutralMid,
                            fontWeight = FontWeight.SemiBold
                        )
                        Surface(
                            shape = RoundedCornerShape(100.dp),
                            color = BrandPrimary.copy(alpha = 0.12f)
                        ) {
                            Text(
                                "${acUnits.size} unit",
                                style    = MaterialTheme.typography.labelSmall,
                                color    = BrandPrimary,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }

                    HorizontalDivider(color = NeutralBorder)

                    if (acUnits.isEmpty()) {
                        Text(
                            "Tidak ada unit AC terdaftar.",
                            style = MaterialTheme.typography.bodySmall,
                            color = NeutralMid
                        )
                    } else {
                        acUnits.forEachIndexed { index, unit ->
                            Row(
                                modifier              = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment     = Alignment.CenterVertically
                            ) {
                                // Number badge
                                Surface(
                                    shape = RoundedCornerShape(100.dp),
                                    color = NeutralBorder
                                ) {
                                    Text(
                                        "${index + 1}",
                                        style    = MaterialTheme.typography.labelSmall,
                                        color    = NeutralMid,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                    )
                                }
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text       = unit.AcUnit.displayName,
                                        style      = MaterialTheme.typography.bodySmall,
                                        color      = NeutralDark,
                                        fontWeight = FontWeight.Medium
                                    )
                                    Text(
                                        text  = "${unit.AcUnit.type} · ${unit.AcUnit.capacityPk}",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = NeutralMid
                                    )
                                }
                            }
                            if (index < acUnits.size - 1) {
                                HorizontalDivider(
                                    color    = NeutralBorder,
                                    modifier = Modifier.padding(start = 36.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

@Composable
private fun InfoRow(
    icon:  androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment     = Alignment.Top
    ) {
        Icon(
            imageVector        = icon,
            contentDescription = null,
            tint               = NeutralMid,
            modifier           = Modifier.size(18.dp).padding(top = 1.dp)
        )
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                text  = label,
                style = MaterialTheme.typography.labelSmall,
                color = NeutralMid
            )
            Text(
                text       = value,
                style      = MaterialTheme.typography.bodySmall,
                color      = NeutralDark,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

private fun typeLabel(type: String) = when (type) {
    "cleaning"     -> "Cuci AC"
    "service"      -> "Servis"
    "installation" -> "Pasang"
    "Cuci"         -> "Cuci AC"
    else           -> type
}

private fun formatDate(dateStr: String): String {
    return try {
        val parts    = dateStr.split("-")
        val year     = parts[0]
        val month    = parts[1].toInt()
        val day      = parts[2].toInt()
        val months   = listOf("", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
            "Jul", "Agu", "Sep", "Okt", "Nov", "Des")
        "$day ${months[month]} $year"
    } catch (e: Exception) { dateStr }
}