package com.milba_Ittech.jobreport.ui.screens.signature

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.delay
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

    // ── Technician signature ──────────────────────────────────────────────────

    fun saveTechnicianSignature(
        ticketId: String,      // ADD
        technicianId: String,      // ADD
        picName: String,      // ADD — pre-fill from customer.pic_name
        signatureBytes: ByteArray
    ) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                // Upload to Supabase Storage
                val url = ticketRepo.uploadSignature(ticketId, "technician", signatureBytes)

                // Save to Supabase (creates job_signatures row with picName pre-filled)
                ticketRepo.saveTechnicianSignature(ticketId, technicianId, picName, url)

                // Keep local copy for display
                val bitmap = android.graphics.BitmapFactory.decodeByteArray(
                    signatureBytes, 0, signatureBytes.size
                )
                AppState.saveTechnicianSignature(technicianId, bitmap)

                _state.update { it.copy(isLoading = false, step = SignatureStep.PIC) }
            } catch (e: Exception) {
                _state.update {
                    it.copy(
                        isLoading = false,
                        error = "Gagal menyimpan tanda tangan."
                    )
                }
            }
        }

    }

    // ── PIC signature + submit ────────────────────────────────────────────────

    fun savePicAndSubmit(
        ticketId: String,
        picName: String,
        signatureBytes: ByteArray
    ) {
        if (picName.trim().isEmpty()) {
            _state.update { it.copy(error = "Masukkan nama PIC terlebih dahulu") }
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                // Upload to Supabase Storage
                val url = ticketRepo.uploadSignature(ticketId, "pic", signatureBytes)

                // Save PIC signature + submit ticket (departure_at + status = submitted)
                ticketRepo.savePicSignatureAndSubmit(ticketId, picName.trim(), url)

                // Keep local copy for display
                val bitmap = android.graphics.BitmapFactory.decodeByteArray(
                    signatureBytes, 0, signatureBytes.size
                )
                AppState.savePicSignature(picName.trim(), bitmap)

                _state.update { it.copy(isLoading = false) }
                submissionComplete.emit(Unit)
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = "Gagal mengirim laporan.") }
            }
        }
    }


    fun proceedWithoutPic(ticketId: String) {     // ADD ticketId param
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            try {
                ticketRepo.submitTicket(ticketId)  // still submits for admin to review
                _state.update { it.copy(isLoading = false) }
                submissionComplete.emit(Unit)
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = "Gagal mengirim laporan.") }
            }
        }
    }
}