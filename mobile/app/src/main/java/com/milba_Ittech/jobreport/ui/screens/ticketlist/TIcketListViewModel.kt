package com.milba_Ittech.jobreport.ui.screens.ticketlist

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import com.milba_Ittech.jobreport.domain.model.Technician
import com.milba_Ittech.jobreport.domain.model.WorkTicketWithDetails
import com.milba_Ittech.jobreport.data.repository.TicketRepository

data class TicketListUiState(
    val tickets:       List<WorkTicketWithDetails>   = emptyList(),
    val isLoading:  Boolean     = true,
    val error:      String?     = null,
    val technician:     Technician?     = null
)

// Group tickets by date proximity
data class TicketGroup(
    val label: String,
    val tickets:  List<WorkTicketWithDetails>
)

class TicketListViewModel(
    private val ticketRepo: TicketRepository
) : ViewModel() {

    private val _state = MutableStateFlow(TicketListUiState())
    val state = _state.asStateFlow()

    val ticketGroups = _state.map { state ->
        groupTickets(state.tickets)
    }.stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    fun loadTickets(technician: Technician) {
        _state.update { it.copy(technician = technician, isLoading = true) }
        viewModelScope.launch {
            /*// ── HARDCODED FOR TESTING ──────────────────────────
            val mockTickets = MockData.tickets.filter { // mock data need to be changed later
                it.technician1Id == technician.id || it.technician2Id == technician.id
            }
            _state.update { it.copy(tickets = mockTickets, isLoading = false) }
            // ── END HARDCODE ───────────────────────────────────*/
            try {
                val tickets = ticketRepo.getTechnicianTickets(technician.id)
                _state.update { it.copy(tickets = tickets, isLoading = false) }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = "Gagal memuat pekerjaan.") }
            }
        }
    }

    fun refresh() {
        val technician = _state.value.technician ?: return
        loadTickets(technician)
    }

    private fun groupTickets(tickets: List<WorkTicketWithDetails>): List<TicketGroup> {
        val today    = LocalDate.now()
        val tomorrow = today.plusDays(1)

        val todayTickets    = tickets.filter { it.scheduledDate == today.toString() }
        val tomorrowTickets = tickets.filter { it.scheduledDate == tomorrow.toString() }
        val laterTickets    = tickets.filter {
            it.scheduledDate != today.toString() &&
                    it.scheduledDate != tomorrow.toString()
        }
        val completedTickets = tickets.filter { it.status == "approved" }

        return buildList {
            if (todayTickets.isNotEmpty())    add(TicketGroup("Hari ini — ${todayTickets.size} pekerjaan", todayTickets))
            if (tomorrowTickets.isNotEmpty()) add(TicketGroup("Besok", tomorrowTickets))
            if (laterTickets.isNotEmpty())    add(TicketGroup("Minggu ini", laterTickets))
            if (completedTickets.isNotEmpty()) add(TicketGroup("Selesai", completedTickets))
        }
    }
}