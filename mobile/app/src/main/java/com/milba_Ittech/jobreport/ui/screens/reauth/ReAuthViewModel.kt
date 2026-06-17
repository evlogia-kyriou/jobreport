package com.milba_Ittech.jobreport.ui.screens.reauth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.milba_Ittech.jobreport.data.repository.AuthRepository
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ReAuthUiState(
    val isLoading:      Boolean = false,
    val error:          String? = null,
    val failedAttempts: Int     = 0,
    val isLockedOut:    Boolean = false
)

class ReAuthViewModel(
    private val authRepo: AuthRepository
) : ViewModel() {

    private val _state = MutableStateFlow(ReAuthUiState())
    val state = _state.asStateFlow()

    val authSuccess = MutableSharedFlow<Unit>()

    fun verifyPin(technicianId: String, pin: String) {
        if (_state.value.isLockedOut) return

        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                authRepo.loginTechnician(technicianId, pin)
                _state.update { it.copy(isLoading = false) }
                authSuccess.emit(Unit)
            } catch (e: Exception) {
                val attempts  = _state.value.failedAttempts + 1
                val lockedOut = attempts >= 5
                _state.update {
                    it.copy(
                        isLoading      = false,
                        error          = if (lockedOut)
                            "Terlalu banyak percobaan. Silahkan login ulang."
                        else
                            "PIN salah. Periksa kembali PIN Anda.",
                        failedAttempts = attempts,
                        isLockedOut    = lockedOut
                    )
                }
            }
        }
    }

    fun reset() {
        _state.value = ReAuthUiState()
    }
}