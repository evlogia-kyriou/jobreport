package com.milba_Ittech.jobreport.ui.screens.acunit

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.milba_Ittech.jobreport.domain.model.TicketAcUnit
import com.milba_Ittech.jobreport.domain.model.TicketStep
import com.milba_Ittech.jobreport.data.repository.TicketRepository
import com.milba_Ittech.jobreport.data.AppState
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class AcUnitUiState(
    val AcUnit:    TicketAcUnit?        = null,
    val steps:     List<TicketStep>     = emptyList(),
    val isLoading: Boolean              = true,
    val error:     String?          = null
)

class AcUnitViewModel(
    private val ticketRepo: TicketRepository
) : ViewModel() {

    private val _state = MutableStateFlow(AcUnitUiState())
    val state = _state.asStateFlow()

    // In AcUnitViewModel.load():
    fun load(ticketId: String, acUnitId: String) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            try {
                val steps = ticketRepo.getStepsByAcUnit(ticketId, acUnitId)
                _state.update { it.copy(steps = steps, isLoading = false) }

                // Store preceding step IDs for threshold validation
                steps.find { it.description == "Suhu Awal" }?.let {
                    AppState.suhuAwalStepIds[acUnitId] = it.id
                }
                steps.find { it.description == "Ampere Awal" }?.let {
                    AppState.ampereAwalStepIds[acUnitId] = it.id
                }

            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = "Gagal memuat langkah.") }
            }
        }
    }
}