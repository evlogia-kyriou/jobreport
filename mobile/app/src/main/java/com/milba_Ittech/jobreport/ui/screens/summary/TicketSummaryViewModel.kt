package com.milba_Ittech.jobreport.ui.screens.summary

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.milba_Ittech.jobreport.data.AppState
import com.milba_Ittech.jobreport.data.repository.TicketRepository
import com.milba_Ittech.jobreport.domain.model.AcUnitWithDisplay
import com.milba_Ittech.jobreport.domain.model.TicketStep
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

// ── AcUnitSummary ────────────────────────────────────────────────────────────
// Pairs a completed AC unit's display info with the steps recorded for it,
// so the summary screen can render the same level of detail (values,
// conditions, photos) that was captured during the SOP.

data class AcUnitSummary(
    val AcUnit: AcUnitWithDisplay,
    val steps:  List<TicketStep> = emptyList()
)

data class TicketSummaryUiState(
    val AcUnitSummaries: List<AcUnitSummary> = emptyList(),
    val isLoading:       Boolean             = true,
    val error:           String?             = null
)

class TicketSummaryViewModel(
    private val ticketRepo: TicketRepository
) : ViewModel() {

    private val _state = MutableStateFlow(TicketSummaryUiState())
    val state: StateFlow<TicketSummaryUiState> = _state.asStateFlow()

    fun load(ticketId: String) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val completedIds = AppState.completedAcUnits.toSet()

                // Only summarize units the technician actually completed —
                // reuses the same joined query TicketDetailViewModel uses,
                // so display name / type / capacity come along for free.
                val completedUnits = ticketRepo.getTicketAcUnits(ticketId)
                    .filter { it.AcUnit.id in completedIds }

                val summaries = completedUnits.map { ticketAcUnit ->
                    val steps = ticketRepo.getStepsByAcUnit(ticketId, ticketAcUnit.AcUnit.id)
                    AcUnitSummary(AcUnit = ticketAcUnit.AcUnit, steps = steps)
                }

                _state.update { it.copy(AcUnitSummaries = summaries, isLoading = false) }
            } catch (e: Exception) {
                _state.update {
                    it.copy(isLoading = false, error = "Gagal memuat ringkasan laporan.")
                }
            }
        }
    }
}