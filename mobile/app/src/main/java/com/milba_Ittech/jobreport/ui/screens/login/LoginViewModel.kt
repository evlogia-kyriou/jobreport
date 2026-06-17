//LoginViewModel.kt
package com.milba_Ittech.jobreport.ui.screens.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.milba_Ittech.jobreport.domain.model.Technician
import com.milba_Ittech.jobreport.data.PreferencesManager
import com.milba_Ittech.jobreport.data.repository.AuthRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

enum class LoginStep { ENTER_ID, ENTER_PIN }

data class LoginUiState(
    val step:           LoginStep = LoginStep.ENTER_ID,
    val technicianId:       String    = "",
    val technicianName:     String    = "",
    val pin:            String    = "",
    val isLoading:      Boolean   = false,
    val error:          String?   = null,
    val failedAttempts: Int       = 0,
    val isLocked:       Boolean   = false,
    val foundTechnician:    Technician?   = null
)

class LoginViewModel(
    private val authRepo:    AuthRepository,
    private val preferences: PreferencesManager
) : ViewModel() {

    private val _state = MutableStateFlow(LoginUiState())
    val state = _state.asStateFlow()

    val loginSuccess = MutableSharedFlow<Technician>()

    // ── ID step ───────────────────────────────────────────────────────────────

    fun appendIdDigit(digit: String) {
        val current = _state.value.technicianId
        if (current.length >= 7) return
        _state.update { it.copy(technicianId = current + digit, error = null) }
    }

    fun backspaceId() {
        _state.update { it.copy(technicianId = it.technicianId.dropLast(1), error = null) }
    }

    fun confirmId() {
        val technicianId = _state.value.technicianId.trim()
        if (technicianId.length != 7) {
            _state.update { it.copy(error = "ID Teknisi harus tepat 7 digit") }
            return
        }
        _state.update {
            it.copy(
                step       = LoginStep.ENTER_PIN,
                pin        = "",
                error      = null,
                // Store technicianId for later use in login
                foundTechnician = null     // ← ensure null
            )
        }
    }

    // ── PIN step ──────────────────────────────────────────────────────────────

    fun appendPin(digit: String) {
        val current = _state.value.pin
        if (current.length >= 6) return
        val newPin = current + digit
        _state.update { it.copy(pin = newPin, error = null) }
        if (newPin.length == 6) attemptLogin(newPin)
    }

    fun backspacePin() {
        _state.update { it.copy(pin = it.pin.dropLast(1), error = null) }
    }

    fun backToId() {
        _state.update {
            it.copy(
                step        = LoginStep.ENTER_ID,
                technicianId    = "",           // ← clear ID
                pin         = "",
                error       = null,
                foundTechnician = null,
                technicianName  = "",
                failedAttempts = 0,         // ← reset attempts too
                isLocked    = false
            )
        }
    }

    private fun attemptLogin(pin: String) {
        val technicianId = _state.value.technicianId

        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                // Real Supabase login
                val loggedIn = authRepo.loginTechnician(technicianId, pin)
                preferences.saveLastTechnician(loggedIn.id, loggedIn.name)
                loginSuccess.emit(loggedIn)
            } catch (e: Exception) {
                val attempts = _state.value.failedAttempts + 1
                val isLocked = attempts >= 5
                _state.update {
                    it.copy(
                        isLoading      = false,
                        pin            = "",
                        // Generic error — doesn't reveal if ID or PIN was wrong
                        error          = if (isLocked)
                            "Akun terkunci. Hubungi admin."
                        else
                            "ID atau PIN salah. Sisa percobaan: ${5 - attempts}",
                        failedAttempts = attempts,
                        isLocked       = isLocked
                    )
                }
            }
        }
    }
    fun reset() {
        _state.value = LoginUiState(
            step           = LoginStep.ENTER_ID,
            technicianId       = "",
            technicianName     = "",
            pin            = "",
            isLoading      = false,
            error          = null,
            failedAttempts = 0,
            isLocked       = false,
            foundTechnician    = null
        )
    }
}