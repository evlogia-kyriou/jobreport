package com.milba_Ittech.jobreport.ui.screens.ticketdetail

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.milba_Ittech.jobreport.domain.model.TicketAcUnit
import com.milba_Ittech.jobreport.data.repository.TicketRepository
import com.milba_Ittech.jobreport.data.AppState
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class TicketDetailUiState(
    val AcUnits:            List<TicketAcUnit> = emptyList(),
    val isLoading:          Boolean      = true,
    val error:              String?      = null,
)

class TicketDetailViewModel(
    private val ticketRepo: TicketRepository
) : ViewModel() {

    private val _state = MutableStateFlow(TicketDetailUiState())
    val state: StateFlow<TicketDetailUiState> = _state.asStateFlow()

    val isTicketComplete: StateFlow<Boolean> = _state
        .map { s ->
            s.AcUnits.isNotEmpty() &&
                    s.AcUnits.all {
                        // Check AppState — not AC unit status from mock
                        AppState.isAcUnitCompleted(it.AcUnit.id)
                    }
        }
        .stateIn(viewModelScope, SharingStarted.Lazily, false)

    fun loadTicket(ticketId: String) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            // ── HARDCODED FOR TESTING ──────────────────────────
            /*val mockUnits = MockData.AcUnits.filter { it.ticketId == ticketId }
            _state.update { it.copy(AcUnits = mockUnits, isLoading = false) }
            // ── END HARDCODE ───────────────────────────────────*/
            try {
                val AcUnits = ticketRepo.getTicketAcUnits(ticketId)
                _state.update { it.copy(AcUnits = AcUnits, isLoading = false) }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = "Gagal memuat data.") }
            }
        }
    }
}