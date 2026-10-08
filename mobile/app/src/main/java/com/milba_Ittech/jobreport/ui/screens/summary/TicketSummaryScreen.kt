package com.milba_Ittech.jobreport.ui.screens.summary

import android.util.Log
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.milba_Ittech.jobreport.data.repository.TicketRepository
import com.milba_Ittech.jobreport.domain.model.TicketAcUnit
import com.milba_Ittech.jobreport.domain.model.TicketStep
import com.milba_Ittech.jobreport.domain.model.WorkTicketWithDetails
import com.milba_Ittech.jobreport.ui.components.AppTopBar
import com.milba_Ittech.jobreport.ui.components.OliveTitleBlock
import com.milba_Ittech.jobreport.ui.theme.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

// ── Thresholds ────────────────────────────────────────────────────────────────
private const val SUHU_MAX     = 12f
private const val ARUS_MIN_PCT = 3f

// ── Date formatter ────────────────────────────────────────────────────────────
private fun formatFullDate(dateStr: String): String {
    return try {
        val date = LocalDate.parse(dateStr)
        val dayName = when (date.dayOfWeek.value) {
            1 -> "Senin"; 2 -> "Selasa"; 3 -> "Rabu"; 4 -> "Kamis"
            5 -> "Jumat"; 6 -> "Sabtu"; else -> "Minggu"
        }
        val fmt = DateTimeFormatter.ofPattern("d MMMM yyyy", Locale("id", "ID"))
        "$dayName, ${date.format(fmt)}"
    } catch (e: Exception) { dateStr }
}

// ── TicketSummaryScreen ───────────────────────────────────────────────────────

@Composable
fun TicketSummaryScreen(
    ticketId:   String,
    onBack:     () -> Unit,
    onStepList: (ticketId: String, acUnitId: String, unitLabel: String,
                 ticketNumber: String, photoIndoorUrl: String?,
                 photoOutdoorUrl: String?) -> Unit
) {
    val ticketRepo = remember { TicketRepository() }
    var ticket    by remember { mutableStateOf<WorkTicketWithDetails?>(null) }
    var steps     by remember { mutableStateOf<List<TicketStep>>(emptyList()) }
    var acUnits   by remember { mutableStateOf<List<TicketAcUnit>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(ticketId) {
        isLoading = true
        try {
            ticket  = ticketRepo.getTicketById(ticketId)
            steps   = ticketRepo.getAllStepsForTicket(ticketId)
            acUnits = ticketRepo.getTicketAcUnits(ticketId)
            Log.d("TicketSummary", "Steps: ${steps.size} AcUnits: ${acUnits.size}")
        } catch (e: Exception) {
            Log.e("TicketSummary", "Failed: ${e.message}")
        } finally {
            isLoading = false
        }
    }

    val t      = ticket
    val header = if (t != null)
        "${formatFullDate(t.scheduledDate)} · ${t.picName}" else ""

    // ── Single-expand accordion state ─────────────────────────────────────────
    var expandedUnitId by remember { mutableStateOf<String?>(null) }
    val listState      = rememberLazyListState()
    val scope          = rememberCoroutineScope()

    val stepsByUnit = steps.groupBy { it.AcUnitId }

    Scaffold(
        topBar = {
            AppTopBar(
                title = {
                    OliveTitleBlock(
                        title    = t?.locationName ?: "Memuat...",
                        subtitle = header
                    )
                },
                onBack = onBack
            )
        }
    ) { padding ->

        if (isLoading) {
            Box(Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = BrandPrimary)
            }
            return@Scaffold
        }
        if (t == null) {
            Box(Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center) {
                Text("Tiket tidak ditemukan", color = NeutralMid)
            }
            return@Scaffold
        }

        // Items: 0 = ticket header, 1..N = unit cards
        val unitList = acUnits.sortedBy { it.orderNumber }

        LazyColumn(
            state          = listState,
            contentPadding = PaddingValues(
                top    = padding.calculateTopPadding() + 12.dp,
                bottom = 24.dp, start = 16.dp, end = 16.dp
            ),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Ticket header
            item(key = "ticket_header") {
                Surface(
                    shape    = RoundedCornerShape(12.dp),
                    color    = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment     = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(t.ticketNumber,
                                style = MaterialTheme.typography.labelSmall,
                                color = NeutralMid)
                            Text(t.type.replaceFirstChar { it.uppercase() },
                                style = MaterialTheme.typography.labelSmall,
                                color = NeutralMid)
                        }
                        StatusChip(t.status)
                    }
                }
            }

            // Unit cards — iterate acUnits to include not-started units
            itemsIndexed(unitList, key = { _, u -> u.AcUnit.id }) { idx, ticketAcUnit ->
                val unitId    = ticketAcUnit.AcUnit.id
                val unitSteps = stepsByUnit[unitId] ?: emptyList()
                val isExpanded = expandedUnitId == unitId

                // Determine state
                val notStarted = unitSteps.none { it.isCompleted }
                val isApproved = t.status == "approved" // simplified — ideally per-unit

                // Measurements
                val suhuAwal  = unitSteps.find { it.description == "Suhu Awal" }
                val suhuAkhir = unitSteps.find { it.description == "Suhu Akhir" }
                val arusAwal  = unitSteps.find { it.description == "Ampere Awal" }
                val arusAkhir = unitSteps.find { it.description == "Ampere Akhir" }
                val suhuB     = suhuAwal?.inputValue?.toFloatOrNull()
                val suhuA     = suhuAkhir?.inputValue?.toFloatOrNull()
                val arusB     = arusAwal?.inputValue?.toFloatOrNull()
                val arusA     = arusAkhir?.inputValue?.toFloatOrNull()
                val suhuPass  = suhuA != null && suhuA < SUHU_MAX
                val arusPass  = arusB != null && arusA != null &&
                        ((arusB - arusA) / arusB * 100f) >= ARUS_MIN_PCT
                val findings  = unitSteps.filter {
                    it.isConditionAbnormal ||
                            (it.stepType == "dynamic_finding" && !it.inputValue.isNullOrBlank())
                }
                val hasIssue  = findings.isNotEmpty()
                val allPass   = suhuPass && arusPass && !hasIssue
                val unitLabel = ticketAcUnit.AcUnit.displayName.ifBlank { "Unit AC" }

                // L1 subtitle: "Suhu 28→9°C Lulus · Arus 3.2→3.15A Perlu Perhatian"
                val subtitle = buildString {
                    if (suhuB != null && suhuA != null) {
                        append("Suhu ${suhuB.toInt()}→${suhuA.toInt()}°C ")
                        append(if (suhuPass) "Lulus" else "Tidak Lulus")
                    }
                    if (arusB != null && arusA != null) {
                        if (isNotEmpty()) append(" · ")
                        val pct = (arusB - arusA) / arusB * 100f
                        append("Arus ${"%.1f".format(arusB)}→${"%.1f".format(arusA)}A ")
                        append(if (arusPass) "Baik" else "Perlu Perhatian")
                    }
                    if (notStarted) append("Belum dikerjakan")
                }

                // Card alpha
                val cardAlpha = if (notStarted) 0.6f else 1f

                // Border
                val borderColor = when {
                    notStarted -> NeutralBorder.copy(alpha = 0.5f)
                    hasIssue   -> BrandError.copy(alpha = 0.5f)
                    allPass    -> BrandSecondary.copy(alpha = 0.4f)
                    else       -> NeutralBorder
                }

                Surface(
                    shape    = RoundedCornerShape(12.dp),
                    color    = MaterialTheme.colorScheme.surface,
                    border   = BorderStroke(0.5.dp, borderColor),
                    modifier = Modifier.fillMaxWidth().alpha(cardAlpha)
                ) {
                    Column {
                        // ── L1 Header ─────────────────────────────────────────
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .then(
                                    if (!notStarted)
                                        Modifier.clickable {
                                            val newExpanded =
                                                if (expandedUnitId == unitId) null else unitId
                                            expandedUnitId = newExpanded
                                            if (newExpanded != null) {
                                                scope.launch {
                                                    // +1 for ticket header item
                                                    listState.animateScrollToItem(idx + 1)
                                                }
                                            }
                                        }
                                    else Modifier
                                )
                                .padding(12.dp),
                            verticalAlignment     = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            // Status icon
                            Icon(
                                imageVector = when {
                                    notStarted -> Icons.Default.Schedule
                                    allPass    -> Icons.Default.CheckCircle
                                    hasIssue   -> Icons.Default.Warning
                                    else       -> Icons.Default.RadioButtonUnchecked
                                },
                                contentDescription = null,
                                tint = when {
                                    notStarted -> NeutralMid
                                    allPass    -> BrandSecondary
                                    hasIssue   -> BrandError
                                    else       -> NeutralMid
                                },
                                modifier = Modifier.size(18.dp)
                            )

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    buildString {
                                        append(unitLabel)
                                        val typeStr = listOfNotNull(
                                            ticketAcUnit.AcUnit.type,
                                            ticketAcUnit.AcUnit.capacityPk
                                        ).joinToString(" · ")
                                        if (typeStr.isNotBlank()) append("  $typeStr")
                                    },
                                    style      = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.SemiBold,
                                    color      = NeutralDark
                                )
                                if (subtitle.isNotBlank()) {
                                    Text(
                                        subtitle,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = when {
                                            notStarted -> NeutralMid
                                            hasIssue   -> BrandError
                                            !allPass   -> BrandWarning
                                            else       -> BrandSecondary
                                        }
                                    )
                                }
                            }

                            // Right: badge + chevron
                            if (notStarted) {
                                UnitBadge("Belum", NeutralMid)
                            } else {
                                if (!notStarted && !isExpanded) {
                                    if (hasIssue) UnitBadge("Temuan", BrandError)
                                }
                                Icon(
                                    if (isExpanded) Icons.Default.KeyboardArrowUp
                                    else Icons.Default.KeyboardArrowDown,
                                    null,
                                    tint     = NeutralMid,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }

                        // ── L2 Expanded Body ──────────────────────────────────
                        if (isExpanded && !notStarted) {
                            HorizontalDivider(color = NeutralBorder.copy(alpha = 0.5f))
                            Column(
                                modifier            = Modifier.padding(14.dp),
                                verticalArrangement = Arrangement.spacedBy(14.dp)
                            ) {

                                // 1. Foto unit AC
                                UnitPhotosSection(
                                    indoorUrl  = ticketAcUnit.photoIndoorUrl,
                                    outdoorUrl = ticketAcUnit.photoOutdoorUrl
                                )

                                // 2. Kondisi sebelum/sesudah
                                val pcbIn   = unitSteps.find { it.description == "PCB Indoor terlindungi" }
                                val pcbOut  = unitSteps.find { it.description == "PCB Outdoor terlindungi" }
                                val areaIn  = unitSteps.find { it.description == "Area Indoor dirapikan" }
                                val areaOut = unitSteps.find { it.description == "Area Outdoor dirapikan" }
                                KondisiSection(pcbIn, pcbOut, areaIn, areaOut)

                                // 3. Pengukuran
                                PengukuranSection(
                                    suhuAwal  = suhuAwal,
                                    suhuAkhir = suhuAkhir,
                                    arusAwal  = arusAwal,
                                    arusAkhir = arusAkhir,
                                    suhuPass  = suhuPass,
                                    arusPass  = arusPass,
                                    suhuB     = suhuB,
                                    suhuA     = suhuA,
                                    arusB     = arusB,
                                    arusA     = arusA
                                )

                                // 4. Temuan
                                if (findings.isNotEmpty()) {
                                    TemuanSection(findings)
                                }

                                // 5. Action button
                                OutlinedButton(
                                    onClick  = {
                                        onStepList(
                                            ticketId, unitId, unitLabel, t.ticketNumber,
                                            ticketAcUnit.photoIndoorUrl,
                                            ticketAcUnit.photoOutdoorUrl
                                        )
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape    = RoundedCornerShape(8.dp)
                                ) {
                                    Icon(Icons.Default.List, null,
                                        modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text("Lihat semua langkah",
                                        style = MaterialTheme.typography.labelMedium)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ── L2 Sections ───────────────────────────────────────────────────────────────

@Composable
private fun UnitPhotosSection(indoorUrl: String?, outdoorUrl: String?) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        SectionLabel("Foto unit AC")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            PhotoBox("Indoor",  indoorUrl,  Modifier.weight(1f))
            PhotoBox("Outdoor", outdoorUrl, Modifier.weight(1f))
        }
    }
}

@Composable
private fun KondisiSection(
    pcbIn:   TicketStep?,
    pcbOut:  TicketStep?,
    areaIn:  TicketStep?,
    areaOut: TicketStep?
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        SectionLabel("Kondisi unit — sebelum vs sesudah")
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            // Before column
            Column(
                modifier            = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text("Sebelum dicuci",
                    style = MaterialTheme.typography.labelSmall,
                    color = NeutralMid, fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(bottom = 2.dp))
                PhotoBox("PCB indoor",  pcbIn?.photoUrl,  Modifier.fillMaxWidth())
                PhotoBox("PCB outdoor", pcbOut?.photoUrl, Modifier.fillMaxWidth())
            }
            // Arrow column
            Column(
                modifier            = Modifier.width(24.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Spacer(Modifier.height(20.dp))
                Icon(Icons.Default.ArrowForward, null,
                    tint = NeutralMid.copy(alpha = 0.5f),
                    modifier = Modifier.size(14.dp))
                Spacer(Modifier.height(48.dp))
                Icon(Icons.Default.ArrowForward, null,
                    tint = NeutralMid.copy(alpha = 0.5f),
                    modifier = Modifier.size(14.dp))
            }
            // After column
            Column(
                modifier            = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text("Sesudah dicuci",
                    style = MaterialTheme.typography.labelSmall,
                    color = NeutralMid, fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(bottom = 2.dp))
                PhotoBox("Area indoor",  areaIn?.photoUrl,  Modifier.fillMaxWidth())
                PhotoBox("Area outdoor", areaOut?.photoUrl, Modifier.fillMaxWidth())
            }
        }
    }
}

@Composable
private fun PengukuranSection(
    suhuAwal:  TicketStep?,
    suhuAkhir: TicketStep?,
    arusAwal:  TicketStep?,
    arusAkhir: TicketStep?,
    suhuPass:  Boolean,
    arusPass:  Boolean,
    suhuB:     Float?,
    suhuA:     Float?,
    arusB:     Float?,
    arusA:     Float?
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        SectionLabel("Pengukuran")

        // Suhu
        if (suhuAwal != null || suhuAkhir != null) {
            Text("Suhu unit AC",
                style = MaterialTheme.typography.labelSmall,
                color = NeutralMid, fontWeight = FontWeight.Medium)
            Meas3Col(
                beforeVal   = suhuAwal?.inputValue?.let { "${it}°C" } ?: "—",
                afterVal    = suhuAkhir?.inputValue?.let { "${it}°C" } ?: "—",
                beforePhoto = suhuAwal?.photoUrl,
                afterPhoto  = suhuAkhir?.photoUrl,
                deltaText   = if (suhuB != null && suhuA != null)
                    "↓${"%.0f".format(Math.abs(suhuB - suhuA))}°C" else "—",
                pass        = suhuPass
            )
            if (suhuB != null && suhuA != null) {
                AssessRow(
                    text  = if (suhuPass) "Suhu akhir ${suhuA}°C di bawah batas ${SUHU_MAX.toInt()}°C"
                    else "Suhu akhir ${suhuA}°C melebihi batas ${SUHU_MAX.toInt()}°C",
                    label = if (suhuPass) "Lulus ✓" else "Tidak Lulus ✗",
                    pass  = suhuPass,
                    warn  = false
                )
            }
        }

        if ((suhuAwal != null || suhuAkhir != null) &&
            (arusAwal != null || arusAkhir != null)) {
            HorizontalDivider(color = NeutralBorder.copy(alpha = 0.4f))
        }

        // Arus
        if (arusAwal != null || arusAkhir != null) {
            Text("Arus listrik",
                style = MaterialTheme.typography.labelSmall,
                color = NeutralMid, fontWeight = FontWeight.Medium)
            val pct = if (arusB != null && arusA != null)
                (arusB - arusA) / arusB * 100f else null
            Meas3Col(
                beforeVal   = arusAwal?.inputValue?.let { "${it}A" } ?: "—",
                afterVal    = arusAkhir?.inputValue?.let { "${it}A" } ?: "—",
                beforePhoto = arusAwal?.photoUrl,
                afterPhoto  = arusAkhir?.photoUrl,
                deltaText   = if (pct != null) "↓${"%.2f".format(pct)}%" else "—",
                pass        = arusPass
            )
            if (pct != null) {
                AssessRow(
                    text  = if (arusPass) "Turun ${"%.2f".format(pct)}% — memenuhi standar minimum 3%"
                    else "Turun ${"%.2f".format(pct)}% — di bawah minimum 3%",
                    label = if (arusPass) "Baik ✓" else "Perlu Perhatian !",
                    pass  = arusPass,
                    warn  = !arusPass
                )
            }
        }
    }
}

@Composable
private fun TemuanSection(findings: List<TicketStep>) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        SectionLabel("Temuan & masalah")
        Surface(
            shape    = RoundedCornerShape(8.dp),
            color    = BrandError.copy(alpha = 0.06f),
            border   = BorderStroke(0.5.dp, BrandError.copy(alpha = 0.3f)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier            = Modifier.padding(10.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                findings.forEachIndexed { idx, f ->
                    if (idx > 0) HorizontalDivider(
                        color = BrandError.copy(alpha = 0.2f))
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment     = Alignment.Top
                    ) {
                        Surface(
                            shape    = RoundedCornerShape(5.dp),
                            color    = MaterialTheme.colorScheme.surface,
                            border   = BorderStroke(0.5.dp, BrandError.copy(alpha = 0.4f)),
                            modifier = Modifier.size(width = 46.dp, height = 38.dp)
                        ) {
                            if (!f.photoUrl.isNullOrBlank()) {
                                AsyncImage(model = f.photoUrl, contentDescription = null,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize()
                                        .clip(RoundedCornerShape(5.dp)))
                            } else {
                                Box(Modifier.fillMaxSize(), Alignment.Center) {
                                    Icon(Icons.Default.CameraAlt, null,
                                        tint = BrandError.copy(alpha = 0.4f),
                                        modifier = Modifier.size(14.dp))
                                }
                            }
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Text(f.description,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.SemiBold, color = BrandError)
                            if (!f.inputValue.isNullOrBlank()) {
                                Text(f.inputValue,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = BrandError.copy(alpha = 0.8f))
                            }
                        }
                    }
                }
            }
        }
    }
}

// ── Atomic helpers ────────────────────────────────────────────────────────────

@Composable
private fun Meas3Col(
    beforeVal:   String,
    afterVal:    String,
    beforePhoto: String?,
    afterPhoto:  String?,
    deltaText:   String,
    pass:        Boolean
) {
    Row(
        modifier              = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment     = Alignment.CenterVertically
    ) {
        // Before
        Row(
            modifier          = Modifier.weight(1f),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            PhotoThumb(beforePhoto)
            Column {
                Text(beforeVal,
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.SemiBold,
                    color = NeutralDark)
                Text("Sebelum",
                    style = MaterialTheme.typography.labelSmall,
                    color = NeutralMid)
            }
        }
        // Delta center
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Icon(Icons.Default.ArrowForward, null,
                tint = NeutralMid.copy(alpha = 0.5f),
                modifier = Modifier.size(12.dp))
            Surface(
                shape = RoundedCornerShape(100.dp),
                color = if (pass) BrandSecondary.copy(alpha = 0.12f)
                else BrandWarning.copy(alpha = 0.12f)
            ) {
                Text(deltaText,
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = if (pass) BrandSecondary else BrandWarning,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
            }
        }
        // After
        Row(
            modifier          = Modifier.weight(1f),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            PhotoThumb(afterPhoto)
            Column {
                Text(afterVal,
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.SemiBold,
                    color = if (pass) BrandSecondary else BrandWarning)
                Text("Sesudah",
                    style = MaterialTheme.typography.labelSmall,
                    color = NeutralMid)
            }
        }
    }
}

@Composable
private fun AssessRow(text: String, label: String, pass: Boolean, warn: Boolean) {
    val color = when {
        pass -> BrandSecondary
        warn -> BrandWarning
        else -> BrandError
    }
    Surface(
        shape    = RoundedCornerShape(7.dp),
        color    = color.copy(alpha = 0.08f),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment     = Alignment.CenterVertically
        ) {
            Text(text,
                style = MaterialTheme.typography.labelSmall,
                color = color, modifier = Modifier.weight(1f))
            Text(label,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.SemiBold, color = color)
        }
    }
}

@Composable
private fun PhotoThumb(photoUrl: String?) {
    Surface(
        shape    = RoundedCornerShape(5.dp),
        color    = MaterialTheme.colorScheme.surfaceVariant,
        border   = BorderStroke(0.5.dp, NeutralBorder),
        modifier = Modifier.size(width = 44.dp, height = 36.dp)
    ) {
        if (!photoUrl.isNullOrBlank()) {
            AsyncImage(model = photoUrl, contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(5.dp)))
        } else {
            Box(Modifier.fillMaxSize(), Alignment.Center) {
                Icon(Icons.Default.CameraAlt, null,
                    tint = NeutralMid.copy(alpha = 0.35f),
                    modifier = Modifier.size(14.dp))
            }
        }
    }
}

@Composable
private fun PhotoBox(label: String, photoUrl: String?, modifier: Modifier = Modifier) {
    Column(modifier = modifier) {
        Surface(
            shape    = RoundedCornerShape(7.dp),
            color    = MaterialTheme.colorScheme.surfaceVariant,
            border   = BorderStroke(0.5.dp, NeutralBorder),
            modifier = Modifier.fillMaxWidth().aspectRatio(4f / 3f)
        ) {
            if (!photoUrl.isNullOrBlank()) {
                AsyncImage(model = photoUrl, contentDescription = label,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(7.dp)))
            } else {
                Box(Modifier.fillMaxSize(), Alignment.Center) {
                    Icon(Icons.Default.CameraAlt, null,
                        tint = NeutralMid.copy(alpha = 0.3f),
                        modifier = Modifier.size(18.dp))
                }
            }
        }
        Text(label,
            style = MaterialTheme.typography.labelSmall,
            color = NeutralMid,
            modifier = Modifier.padding(top = 3.dp))
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(text.uppercase(),
        style         = MaterialTheme.typography.labelSmall,
        color         = NeutralMid,
        fontWeight    = FontWeight.SemiBold,
        letterSpacing = 0.5.sp)
}

@Composable
private fun UnitBadge(text: String, color: androidx.compose.ui.graphics.Color) {
    Surface(
        shape = RoundedCornerShape(100.dp),
        color = color.copy(alpha = 0.1f)
    ) {
        Text(text,
            style    = MaterialTheme.typography.labelSmall,
            color    = color,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
    }
}

@Composable
private fun StatusChip(status: String) {
    val (label, color) = when (status) {
        "approved"    -> "Disetujui"   to BrandSecondary
        "submitted"   -> "Menunggu"    to BrandWarning
        "in_progress" -> "Berlangsung" to BrandPrimary
        else          -> "Terkirim"    to NeutralMid
    }
    Surface(shape = RoundedCornerShape(100.dp), color = color.copy(alpha = 0.1f)) {
        Text(label,
            style      = MaterialTheme.typography.labelSmall,
            color      = color,
            fontWeight = FontWeight.SemiBold,
            modifier   = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
    }
}

@Composable
private fun MiniMeasChip(value: String, pass: Boolean) {
    Surface(
        shape = RoundedCornerShape(100.dp),
        color = if (pass) BrandSecondary.copy(alpha = 0.1f)
        else BrandWarning.copy(alpha = 0.1f)
    ) {
        Text(value,
            style  = MaterialTheme.typography.labelSmall,
            color  = if (pass) BrandSecondary else BrandWarning,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
    }
}
@Composable
private fun L3Card(
    label:      String,
    labelColor: androidx.compose.ui.graphics.Color = NeutralMid,
    badge:      String? = null,
    badgeColor: androidx.compose.ui.graphics.Color = NeutralMid,
    content:    @Composable ColumnScope.() -> Unit
) {
    Surface(
        shape    = RoundedCornerShape(12.dp),
        color    = MaterialTheme.colorScheme.surface,
        border   = BorderStroke(0.5.dp, NeutralBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surfaceVariant)
                    .padding(horizontal = 14.dp, vertical = 9.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment     = Alignment.CenterVertically
            ) {
                Text(label.uppercase(),
                    style = MaterialTheme.typography.labelSmall,
                    color = labelColor, fontWeight = FontWeight.SemiBold,
                    letterSpacing = 0.5.sp)
                badge?.let {
                    Surface(shape = RoundedCornerShape(100.dp),
                        color = badgeColor.copy(alpha = 0.1f)) {
                        Text(it,
                            style = MaterialTheme.typography.labelSmall,
                            color = badgeColor,
                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp))
                    }
                }
            }
            Column(modifier = Modifier.padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                content = content)
        }
    }
}

@Composable
private fun MeasSide(
    label:    String,
    value:    String,
    photoUrl: String?,
    good:     Boolean,
    modifier: Modifier = Modifier
) {
    Row(
        modifier          = modifier,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Surface(
            shape    = RoundedCornerShape(5.dp),
            color    = MaterialTheme.colorScheme.surfaceVariant,
            border   = BorderStroke(0.5.dp, NeutralBorder),
            modifier = Modifier.size(width = 48.dp, height = 40.dp)
        ) {
            if (!photoUrl.isNullOrBlank()) {
                AsyncImage(model = photoUrl, contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(5.dp)))
            } else {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.CameraAlt, null,
                        tint = NeutralMid.copy(alpha = 0.4f),
                        modifier = Modifier.size(16.dp))
                }
            }
        }
        Column {
            Text(value,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.SemiBold,
                color = if (good) BrandSecondary else BrandWarning)
            Text(label,
                style = MaterialTheme.typography.labelSmall,
                color = NeutralMid)
        }
    }
}

@Composable
private fun AssessBar(note: String, delta: String, pass: Boolean) {
    val color = if (pass) BrandSecondary else BrandWarning
    Surface(shape = RoundedCornerShape(7.dp),
        color = color.copy(alpha = 0.08f),
        modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment     = Alignment.CenterVertically
        ) {
            Text(note, style = MaterialTheme.typography.labelSmall,
                color = color, modifier = Modifier.weight(1f))
            Text(delta, style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.SemiBold, color = color)
        }
    }
}