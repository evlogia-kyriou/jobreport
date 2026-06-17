package com.milba_Ittech.jobreport.ui.screens.acunit

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.milba_Ittech.jobreport.domain.model.TicketAcUnit
import com.milba_Ittech.jobreport.domain.model.TicketStep
import com.milba_Ittech.jobreport.data.repository.TicketRepository
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

    fun load(ticketId: String, AcUnitId: String) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            try {
                val steps = ticketRepo.getStepsByAcUnit(ticketId, AcUnitId)
                _state.update { it.copy(steps = steps, isLoading = false) }
            } catch (e: Exception) {
                _state.update {
                    it.copy(isLoading = false, error = "Gagal memuat langkah.")
                }
            }
        }
    }
}