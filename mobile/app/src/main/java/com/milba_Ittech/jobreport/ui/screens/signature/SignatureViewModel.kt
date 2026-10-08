package com.milba_Ittech.jobreport.ui.screens.signature

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import android.util.Log
import com.milba_Ittech.jobreport.data.AppState
import com.milba_Ittech.jobreport.data.repository.TicketRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

enum class SignatureStep { TECHNICIAN, PIC }

data class SignatureUiState(
    val step:      SignatureStep = SignatureStep.TECHNICIAN,
    val picName:   String       = "",
    val isLoading: Boolean      = false,
    val error:     String?      = null
)

class SignatureViewModel(
    private val ticketRepo: TicketRepository
) : ViewModel() {

    private val _state = MutableStateFlow(SignatureUiState())
    val state = _state.asStateFlow()

    val submissionComplete = MutableSharedFlow<Unit>()

    fun updatePicName(name: String) {
        _state.update { it.copy(picName = name, error = null) }
    }

    // Clears the error so the user can retry without navigating away
    fun clearError() {
        _state.update { it.copy(error = null) }
    }

    // ── Technician signature ──────────────────────────────────────────────────

    fun saveTechnicianSignature(
        ticketId:       String,
        technicianId:   String,
        picName:        String,
        signatureBytes: ByteArray
    ) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val url = ticketRepo.uploadSignature(ticketId, "technician", signatureBytes)
                ticketRepo.saveTechnicianSignature(ticketId, technicianId, picName, url)

                val bitmap = android.graphics.BitmapFactory.decodeByteArray(
                    signatureBytes, 0, signatureBytes.size
                )
                AppState.saveTechnicianSignature(technicianId, bitmap)

                _state.update { it.copy(isLoading = false, step = SignatureStep.PIC) }
            } catch (e: Exception) {
                Log.e("SignatureViewModel", "saveTechnicianSignature failed", e)
                _state.update {
                    it.copy(
                        isLoading = false,
                        // error is set — UI shows retry button, signature pad stays accessible
                        error = "Gagal menyimpan tanda tangan: ${e.message}"
                    )
                }
            }
        }
    }

    // ── PIC signature + submit ────────────────────────────────────────────────

    fun savePicAndSubmit(
        ticketId:       String,
        picName:        String,
        signatureBytes: ByteArray
    ) {
        if (picName.trim().isEmpty()) {
            _state.update { it.copy(error = "Masukkan nama PIC terlebih dahulu") }
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val url = ticketRepo.uploadSignature(ticketId, "pic", signatureBytes)
                ticketRepo.savePicSignatureAndSubmit(ticketId, picName.trim(), url)

                val bitmap = android.graphics.BitmapFactory.decodeByteArray(
                    signatureBytes, 0, signatureBytes.size
                )
                AppState.savePicSignature(picName.trim(), bitmap)

                _state.update { it.copy(isLoading = false) }
                submissionComplete.emit(Unit)
            } catch (e: Exception) {
                Log.e("SignatureViewModel", "savePicAndSubmit failed", e)
                _state.update {
                    it.copy(
                        isLoading = false,
                        error     = "Gagal mengirim laporan: ${e.message}"
                    )
                }
            }
        }
    }

    // ── Proceed without PIC ───────────────────────────────────────────────────

    fun proceedWithoutPic(ticketId: String) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                ticketRepo.submitTicket(ticketId)
                _state.update { it.copy(isLoading = false) }
                submissionComplete.emit(Unit)
            } catch (e: Exception) {
                Log.e("SignatureViewModel", "proceedWithoutPic failed", e)
                _state.update {
                    it.copy(
                        isLoading = false,
                        error     = "Gagal mengirim laporan: ${e.message}"
                    )
                }
            }
        }
    }
}