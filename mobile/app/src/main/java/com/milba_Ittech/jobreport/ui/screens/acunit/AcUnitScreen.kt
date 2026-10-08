package com.milba_Ittech.jobreport.ui.screens.acunit

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.MenuAnchorType
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.milba_Ittech.jobreport.data.AppState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import com.milba_Ittech.jobreport.domain.model.AcUnitWithDisplay
import com.milba_Ittech.jobreport.domain.model.TicketStep
import com.milba_Ittech.jobreport.domain.model.ReplacementData
import com.milba_Ittech.jobreport.data.repository.TicketRepository
import com.milba_Ittech.jobreport.ui.components.AppTopBar
import com.milba_Ittech.jobreport.ui.components.OliveTitleBlock
import com.milba_Ittech.jobreport.ui.components.OliveWhiteSub
import com.milba_Ittech.jobreport.ui.theme.*
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AcUnitScreen(
    acUnitId:          String,
    ticketId:          String,
    acUnit:            AcUnitWithDisplay,
    onStepClick:       (TicketStep) -> Unit,   // kept for compatibility
    onBack:            () -> Unit,
    onStartSop:        () -> Unit,             // ← launches SopOverviewScreen ✅
    onAcUnitCompleted: (String) -> Unit
) {
    val ticketRepo = remember { TicketRepository() }
    val vm         = viewModel { AcUnitViewModel(ticketRepo) }
    val state      by vm.state.collectAsState()

    // ── UnitPhotoScreen gate REMOVED ──────────────────────────────────────────
    // Unit photos are now part of the SOP flow
    // (Kedatangan section, steps 1 + 2: Foto Indoor + Foto Outdoor) ✅

    LaunchedEffect(acUnitId) {
        vm.load(ticketId, acUnitId)
    }

    val steps         = state.steps
    val completedCount = steps.count { AppState.isCompleted(it.id) }
    val totalSteps    = steps.size.takeIf { it > 0 } ?: 26
    val allStepsDone  = completedCount == totalSteps && totalSteps > 0
    val hasStarted    = completedCount > 0

    // Replacement form state
    var showReplacementForm by remember { mutableStateOf(false) }

    if (showReplacementForm) {
        UnitReplacementSheet(
            ticketId    = ticketId,
            acUnitId    = acUnitId,
            acUnit      = acUnit,
            onDismiss   = { showReplacementForm = false },
            onSubmitted = { showReplacementForm = false }
        )
    }

    Scaffold(
        topBar = {
            AppTopBar(
                title = {
                    OliveTitleBlock(
                        title    = acUnit.displayName,
                        subtitle = listOfNotNull(acUnit.type, acUnit.capacityPk)
                            .joinToString(" · ")
                    )
                },
                onBack  = onBack,
                actions = {
                    TextButton(onClick = { showReplacementForm = true }) {
                        Text(
                            text  = "Unit diganti",
                            style = MaterialTheme.typography.labelSmall,
                            color = OliveWhiteSub
                        )
                    }
                }
            )
        },
        bottomBar = {
            // Show "Selesaikan Unit" button when all steps done
            if (allStepsDone && !AppState.isAcUnitCompleted(acUnitId)) {
                Surface(shadowElevation = 8.dp) {
                    Button(
                        onClick  = {
                            AppState.markAcUnitComplete(acUnitId)
                            onAcUnitCompleted(acUnitId)
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                            .height(52.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = BrandSecondary
                        )
                    ) {
                        Icon(Icons.Default.CheckCircle, null,
                            modifier = Modifier.size(18.dp))
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

            // ── SOP Launch button ─────────────────────────────────────────────
            item {
                Button(
                    onClick  = onStartSop,
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    colors   = ButtonDefaults.buttonColors(containerColor = OliveDarker)
                ) {
                    Icon(
                        imageVector = when {
                            allStepsDone -> Icons.Default.CheckCircle
                            hasStarted   -> Icons.Default.PlayArrow
                            else         -> Icons.Default.PlayArrow
                        },
                        contentDescription = null,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = when {
                            allStepsDone -> "SOP Selesai — Lihat Ringkasan"
                            hasStarted   -> "Lanjutkan SOP ($completedCount/$totalSteps)"
                            else         -> "Mulai SOP Cuci AC"
                        },
                        style      = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            // ── Progress bar ──────────────────────────────────────────────────
            item {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    LinearProgressIndicator(
                        progress   = { if (totalSteps > 0) completedCount.toFloat() / totalSteps else 0f },
                        modifier   = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(RoundedCornerShape(100.dp)),
                        color      = BrandSecondary,
                        trackColor = NeutralBorder
                    )
                    Text(
                        "$completedCount dari $totalSteps langkah selesai",
                        style = MaterialTheme.typography.labelSmall,
                        color = NeutralMid
                    )
                }
            }

            // ── Section summary cards ─────────────────────────────────────────
            // Shows completion per section — technician sees overview
            val sectionOrder = listOf(
                "kedatangan"          to "1. Kedatangan",
                "pengecekan_ac"       to "2. Pengecekan AC",
                "persiapan_pencucian" to "3. Persiapan Pencucian",
                "pencucian_indoor"    to "4. Pencucian Indoor",
                "pencucian_outdoor"   to "5. Pencucian Outdoor",
                "pengecekan_akhir"    to "6. Pengecekan Akhir",
                "dokumentasi_akhir"   to "7. Dokumentasi Akhir",
                "laporan_kerusakan"   to "8. Laporan Kerusakan",
            )

            sectionOrder.forEach { (sectionKey, sectionName) ->
                val sectionSteps     = steps.filter { it.section == sectionKey }
                    .sortedBy { it.orderNumber }
                if (sectionSteps.isEmpty()) return@forEach

                val doneInSection    = sectionSteps.count { AppState.isCompleted(it.id) }
                val totalInSection   = sectionSteps.size
                val isSectionDone    = doneInSection == totalInSection
                val isSectionStarted = doneInSection > 0 && !isSectionDone

                item(key = sectionKey) {
                    Surface(
                        shape    = RoundedCornerShape(10.dp),
                        color    = when {
                            isSectionDone    -> BrandSecondary.copy(alpha = 0.08f)
                            isSectionStarted -> BrandWarning.copy(alpha = 0.06f)
                            else             -> MaterialTheme.colorScheme.surfaceVariant
                        },
                        border   = BorderStroke(
                            0.5.dp,
                            when {
                                isSectionDone    -> BrandSecondary.copy(alpha = 0.4f)
                                isSectionStarted -> BrandWarning.copy(alpha = 0.4f)
                                else             -> NeutralBorder
                            }
                        ),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier              = Modifier.padding(12.dp),
                            verticalAlignment     = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                verticalAlignment     = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(
                                    imageVector = when {
                                        isSectionDone -> Icons.Default.CheckCircle
                                        isSectionStarted -> Icons.Default.RadioButtonChecked
                                        else          -> Icons.Default.RadioButtonUnchecked
                                    },
                                    contentDescription = null,
                                    tint = when {
                                        isSectionDone    -> BrandSecondary
                                        isSectionStarted -> BrandWarning
                                        else             -> NeutralMid
                                    },
                                    modifier = Modifier.size(18.dp)
                                )
                                Text(
                                    sectionName,
                                    style      = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.Medium,
                                    color      = when {
                                        isSectionDone    -> BrandSecondary
                                        isSectionStarted -> BrandWarning
                                        else             -> NeutralDark
                                    }
                                )
                            }
                            Surface(
                                shape = RoundedCornerShape(20.dp),
                                color = when {
                                    isSectionDone    -> BrandSecondary.copy(alpha = 0.15f)
                                    isSectionStarted -> BrandWarning.copy(alpha = 0.15f)
                                    else             -> NeutralBorder.copy(alpha = 0.3f)
                                }
                            ) {
                                Text(
                                    "$doneInSection/$totalInSection",
                                    style    = MaterialTheme.typography.labelSmall,
                                    color    = when {
                                        isSectionDone    -> BrandSecondary
                                        isSectionStarted -> BrandWarning
                                        else             -> NeutralMid
                                    },
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

// ── Unit Replacement Bottom Sheet ─────────────────────────────────────────────

private val AC_BRANDS = listOf(
    "e2aff6f7-36be-4ede-9655-54920dc1b4f6" to "Carrier",
    "1af0deb1-4006-4570-a6ce-3c62ec348353" to "Daikin",
    "87865d6f-f1d0-422c-b56f-f59b0e823142" to "Fujitsu",
    "dee5cc77-8108-481b-8c68-2a52a6d173c7" to "Gree",
    "7bba385d-f493-4dbc-9b9d-e73aa0973a2f" to "Haier",
    "6ed17992-9509-4269-9a9a-571cbf313dff" to "LG",
    "4fb12815-f2fe-4aa4-bf73-854b08d51493" to "Midea",
    "ff0a3521-0d2c-4dbc-bc99-0c883e14c758" to "Mitsubishi Electric",
    "1d244ad6-8afc-4e71-82bf-564ba81cf61b" to "Panasonic",
    "84ab7439-b139-4560-bc35-afa697eb04fc" to "Samsung",
    "77bb0141-a12f-4a94-9653-3535d7d3df60" to "Sharp",
    "11beb0de-a3a9-4207-ade8-be84c9cda59a" to "Toshiba",
    "5ad4ac0f-462e-4d54-9a77-329db97fd145" to "York",
)

private val AC_TYPES = listOf("Split","Cassette","Standing","Ducted","Window","Portable")
private val AC_PKS   = listOf("0.5 PK","0.75 PK","1 PK","1.5 PK","2 PK","2.5 PK","3 PK")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun UnitReplacementSheet(
    ticketId:    String,
    acUnitId:    String,
    acUnit:      AcUnitWithDisplay,
    onDismiss:   () -> Unit,
    onSubmitted: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope      = rememberCoroutineScope()

    var selectedType    by remember { mutableStateOf(acUnit.type) }
    var selectedBrandId by remember { mutableStateOf("") }
    var selectedPk      by remember { mutableStateOf("") }
    var isNew           by remember { mutableStateOf<Boolean?>(null) }
    var mfrYear         by remember { mutableStateOf("") }
    var serialNumber    by remember { mutableStateOf("") }
    var isSubmitting    by remember { mutableStateOf(false) }
    var error           by remember { mutableStateOf<String?>(null) }

    val isValid = selectedBrandId.isNotBlank() &&
            selectedPk.isNotBlank() &&
            isNew != null &&
            (isNew == true || mfrYear.isNotBlank())

    val ticketRepo = remember { TicketRepository() }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text("Unit AC Diganti",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold)
            Text("Isi detail unit AC baru yang terpasang di lokasi ini.",
                style = MaterialTheme.typography.bodySmall, color = NeutralMid)

            HorizontalDivider()

            DropdownField("Tipe AC Baru", AC_TYPES, selectedType) { selectedType = it }

            DropdownField(
                label    = "Merek AC Baru",
                options  = AC_BRANDS.map { it.second },
                selected = AC_BRANDS.find { it.first == selectedBrandId }?.second ?: "",
                onSelect = { name -> selectedBrandId = AC_BRANDS.find { it.second == name }?.first ?: "" }
            )

            DropdownField("Kapasitas (PK)", AC_PKS, selectedPk) { selectedPk = it }

            Text("Kondisi Unit *",
                style = MaterialTheme.typography.bodySmall, color = NeutralMid)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(true to "Baru", false to "Bekas").forEach { (value, label) ->
                    Surface(
                        onClick  = { isNew = value },
                        shape    = RoundedCornerShape(8.dp),
                        color    = if (isNew == value) BrandPrimary.copy(alpha = 0.1f)
                        else MaterialTheme.colorScheme.surface,
                        border   = BorderStroke(
                            if (isNew == value) 1.5.dp else 0.5.dp,
                            if (isNew == value) BrandPrimary else NeutralBorder
                        ),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(label,
                            style     = MaterialTheme.typography.bodySmall,
                            color     = if (isNew == value) BrandPrimary else NeutralMid,
                            fontWeight = if (isNew == value) FontWeight.SemiBold else FontWeight.Normal,
                            modifier  = Modifier.padding(vertical = 12.dp),
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                    }
                }
            }

            if (isNew == false) {
                OutlinedTextField(
                    value         = mfrYear,
                    onValueChange = { if (it.length <= 4) mfrYear = it.filter { c -> c.isDigit() } },
                    label         = { Text("Tahun Produksi *") },
                    placeholder   = { Text("Contoh: 2019") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine    = true,
                    modifier      = Modifier.fillMaxWidth()
                )
            }

            OutlinedTextField(
                value         = serialNumber,
                onValueChange = { serialNumber = it },
                label         = { Text("Nomor Seri (opsional)") },
                placeholder   = { Text("Contoh: INV-S-XXXXXX") },
                singleLine    = true,
                modifier      = Modifier.fillMaxWidth()
            )

            error?.let {
                Text(it, color = BrandError, style = MaterialTheme.typography.bodySmall)
            }

            Button(
                onClick  = {
                    if (!isValid) return@Button
                    isSubmitting = true
                    scope.launch {
                        try {
                            AppState.pendingReplacements[acUnitId] = ReplacementData(
                                type         = selectedType,
                                brandId      = selectedBrandId,
                                capacityPk   = selectedPk,
                                isNew        = isNew ?: true,
                                mfrYear      = mfrYear.toIntOrNull(),
                                serialNumber = serialNumber.ifBlank { null }
                            )
                            ticketRepo.flagUnitReplacement(ticketId, acUnitId)
                            onSubmitted()
                        } catch (e: Exception) {
                            error = "Gagal menyimpan. Coba lagi."
                        } finally {
                            isSubmitting = false
                        }
                    }
                },
                enabled  = isValid && !isSubmitting,
                modifier = Modifier.fillMaxWidth().height(52.dp)
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(
                        color       = androidx.compose.ui.graphics.Color.White,
                        modifier    = Modifier.size(20.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Simpan & Lanjutkan")
                }
            }

            Spacer(Modifier.height(16.dp))
        }
    }
}

// ── Dropdown helper ───────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DropdownField(
    label:    String,
    options:  List<String>,
    selected: String,
    onSelect: (String) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
        OutlinedTextField(
            value         = selected.ifBlank { "" },
            onValueChange = {},
            readOnly      = true,
            label         = { Text(label) },
            trailingIcon  = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
            modifier      = Modifier.fillMaxWidth()
                .menuAnchor(MenuAnchorType.PrimaryNotEditable, true)
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { option ->
                DropdownMenuItem(
                    text    = { Text(option) },
                    onClick = { onSelect(option); expanded = false }
                )
            }
        }
    }
}