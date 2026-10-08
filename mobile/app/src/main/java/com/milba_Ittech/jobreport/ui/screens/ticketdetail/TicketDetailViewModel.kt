package com.milba_Ittech.jobreport.ui.screens.ticketdetail

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.milba_Ittech.jobreport.domain.model.TicketAcUnit
import com.milba_Ittech.jobreport.data.repository.TicketRepository
import com.milba_Ittech.jobreport.data.AppState
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class TicketDetailUiState(
    val AcUnits:   List<TicketAcUnit> = emptyList(),
    val isLoading: Boolean            = true,
    val error:     String?            = null,
)

class TicketDetailViewModel(
    private val ticketRepo: TicketRepository
) : ViewModel() {

    private val _state = MutableStateFlow(TicketDetailUiState())
    val state: StateFlow<TicketDetailUiState> = _state.asStateFlow()

    val isTicketComplete: StateFlow<Boolean> = _state
        .map { s ->
            s.AcUnits.isNotEmpty() &&
                    s.AcUnits.all { AppState.isAcUnitCompleted(it.AcUnit.id) }
        }
        .stateIn(viewModelScope, SharingStarted.Lazily, false)

    fun loadTicket(ticketId: String) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            try {
                val acUnits = ticketRepo.getTicketAcUnits(ticketId)
                _state.update { it.copy(AcUnits = acUnits, isLoading = false) }

                // Phase D: populate AppState.unitStepIds for each unit ✅
                // Enables "all steps done" check in StepViewModel ✅
                loadUnitStepIds(ticketId, acUnits)

            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = "Gagal memuat data.") }
            }
        }
    }

    // ── Phase D: load step IDs per unit ──────────────────────────────────────
    // Runs after AC units are loaded ✅
    // Non-critical: failure is logged but does not affect ticket display ✅
    private suspend fun loadUnitStepIds(
        ticketId: String,
        acUnits:  List<TicketAcUnit>
    ) {
        for (unit in acUnits) {
            try {
                val steps = ticketRepo.getStepsByAcUnit(ticketId, unit.AcUnit.id)
                AppState.setUnitStepIds(
                    acUnitId = unit.AcUnit.id,
                    stepIds  = steps.map { it.id }
                )
            } catch (e: Exception) {
                android.util.Log.w(
                    "TicketDetailViewModel",
                    "loadUnitStepIds failed for ${unit.AcUnit.id}: ${e.message}"
                )
            }
        }
    }
}