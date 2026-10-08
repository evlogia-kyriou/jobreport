package com.milba_Ittech.jobreport.ui.screens.ticketlist

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import com.milba_Ittech.jobreport.domain.model.Technician
import com.milba_Ittech.jobreport.domain.model.WorkTicketWithDetails
import com.milba_Ittech.jobreport.data.repository.TicketRepository

// ── UI State ──────────────────────────────────────────────────────────────────

data class TicketListUiState(
    val tickets:    List<WorkTicketWithDetails> = emptyList(),
    val isLoading:  Boolean                     = true,
    val error:      String?                     = null,
    val technician: Technician?                 = null
)

// ── Ticket Group ──────────────────────────────────────────────────────────────

data class TicketGroup(
    val label:             String,                        // "Hari Ini, 5 Agustus"
    val tickets:           List<WorkTicketWithDetails>,
    val isOverdue:         Boolean = false,               // → red header
    val isLainnya:         Boolean = false,               // → collapsible
    val completionSummary: String? = null                 // "Mencuci 4 unit · Servis 1 unit"
)

// ── ViewModel ─────────────────────────────────────────────────────────────────

class TicketListViewModel(
    private val ticketRepo: TicketRepository
) : ViewModel() {

    private val _state = MutableStateFlow(TicketListUiState())
    val state = _state.asStateFlow()

    val ticketGroups: StateFlow<List<TicketGroup>> = _state
        .map { groupTickets(it.tickets) }
        .stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    // ── Load ─────────────────────────────────────────────────────────────────

    fun loadTickets(technician: Technician) {
        _state.update { it.copy(technician = technician, isLoading = true, error = null) }
        viewModelScope.launch {
            try {
                val tickets = ticketRepo.getTechnicianTickets(technician.id)
                _state.update { it.copy(tickets = tickets, isLoading = false) }
            } catch (e: Exception) {
                android.util.Log.e("TicketListVM", "loadTickets failed", e)
                _state.update { it.copy(isLoading = false, error = "Gagal memuat pekerjaan.") }
            }
        }
    }

    fun refresh() {
        _state.value.technician?.let { loadTickets(it) }
    }

    // ── Grouping ──────────────────────────────────────────────────────────────

    private fun groupTickets(tickets: List<WorkTicketWithDetails>): List<TicketGroup> {
        val today    = LocalDate.now()
        val tomorrow = today.plusDays(1)
        val lusa     = today.plusDays(2)

        // Statuses that mean "done — go to history screen"
        val doneStatuses     = setOf("approved")
        val activeStatuses   = setOf("assigned", "in_progress", "submitted")

        // Only show tickets that are NOT approved (those go to history screen)
        val visible = tickets.filter { it.status !in doneStatuses }

        // ── Overdue: past date AND not submitted/approved ─────────────────────
        val overdue = visible.filter {
            val d = parseDate(it.scheduledDate) ?: return@filter false
            d.isBefore(today) && it.status in setOf("assigned", "in_progress")
        }.sortedBy { it.scheduledDate }

        // ── Today ─────────────────────────────────────────────────────────────
        val todayTickets = visible.filter {
            parseDate(it.scheduledDate) == today
        }.sortedBy { it.scheduledTime }

        // ── Tomorrow ──────────────────────────────────────────────────────────
        val tomorrowTickets = visible.filter {
            parseDate(it.scheduledDate) == tomorrow
        }.sortedBy { it.scheduledTime }

        // ── Lusa (day after tomorrow) ─────────────────────────────────────────
        val lusaTickets = visible.filter {
            parseDate(it.scheduledDate) == lusa
        }.sortedBy { it.scheduledTime }

        // ── Lainnya: day 3+ into the future, grouped by date ─────────────────
        val lainnyaByDate = visible
            .filter {
                val d = parseDate(it.scheduledDate) ?: return@filter false
                d.isAfter(lusa)
            }
            .sortedWith(compareBy({ it.scheduledDate }, { it.scheduledTime }))
            .groupBy { it.scheduledDate }

        // ── Build groups ──────────────────────────────────────────────────────
        return buildList {

            // 1. Terlambat (always first if any)
            if (overdue.isNotEmpty()) {
                add(TicketGroup(
                    label     = "Terlambat",
                    tickets   = overdue,
                    isOverdue = true
                ))
            }

            // 2. Hari Ini
            if (todayTickets.isNotEmpty()) {
                add(TicketGroup(
                    label             = "Hari Ini, ${formatDate(today)}",
                    tickets           = todayTickets,
                    completionSummary = buildCompletionSummary(todayTickets)
                ))
            }

            // 3. Besok
            if (tomorrowTickets.isNotEmpty()) {
                add(TicketGroup(
                    label   = "Besok, ${formatDate(tomorrow)}",
                    tickets = tomorrowTickets
                ))
            }

            // 4. Lusa
            if (lusaTickets.isNotEmpty()) {
                add(TicketGroup(
                    label   = "Lusa, ${formatDate(lusa)}",
                    tickets = lusaTickets
                ))
            }

            // 5. Lainnya — one sub-group per date, all marked isLainnya
            lainnyaByDate.forEach { (dateStr, dayTickets) ->
                val date = parseDate(dateStr)
                add(TicketGroup(
                    label     = date?.let { dayOfWeekLabel(it) + ", " + formatDate(it) } ?: dateStr,
                    tickets   = dayTickets,
                    isLainnya = true
                ))
            }
        }
    }

    // ── Completion summary ────────────────────────────────────────────────────

    /**
     * Returns "Mencuci 4 unit · Servis 1 unit" for submitted/completed tickets.
     * Returns null if no tickets are done yet (section shows no summary line).
     */
    private fun buildCompletionSummary(tickets: List<WorkTicketWithDetails>): String? {
        val done = tickets.filter { it.status in setOf("submitted", "approved") }
        if (done.isEmpty()) return null

        val parts = done
            .groupBy { it.type }
            .map { (type, group) ->
                val count = group.size
                when (type) {
                    "cleaning"     -> "Mencuci $count tiket"
                    "service"      -> "Servis $count tiket"
                    "installation" -> "Memasang $count tiket"
                    else           -> "${type.replaceFirstChar { it.uppercase() }} $count tiket"
                }
            }

        return parts.joinToString(" · ")
    }

    // ── Date helpers ──────────────────────────────────────────────────────────

    private fun parseDate(dateStr: String?): LocalDate? = try {
        dateStr?.let { LocalDate.parse(it) }
    } catch (e: Exception) { null }

    private val monthFormatter = DateTimeFormatter.ofPattern("d MMMM", Locale("id", "ID"))

    /** "5 Agustus" */
    private fun formatDate(date: LocalDate): String = date.format(monthFormatter)

    /** "Senin" / "Selasa" etc */
    private fun dayOfWeekLabel(date: LocalDate): String {
        return when (date.dayOfWeek.value) {
            1 -> "Senin"
            2 -> "Selasa"
            3 -> "Rabu"
            4 -> "Kamis"
            5 -> "Jumat"
            6 -> "Sabtu"
            7 -> "Minggu"
            else -> ""
        }
    }
}