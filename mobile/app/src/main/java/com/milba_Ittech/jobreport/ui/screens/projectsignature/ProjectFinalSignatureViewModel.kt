package com.milba_Ittech.jobreport.ui.screens.projectsignature

import android.graphics.Bitmap
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.milba_Ittech.jobreport.data.repository.TicketRepository
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream

data class ProjectFinalSignatureUiState(
    val picName:   String  = "",
    val isLoading: Boolean = false,
    val error:     String? = null
)

class ProjectFinalSignatureViewModel(
    private val ticketRepo: TicketRepository
) : ViewModel() {

    private val _state = MutableStateFlow(ProjectFinalSignatureUiState())
    val state = _state.asStateFlow()

    // Emitted when the project signature is saved successfully
    val signatureComplete = MutableSharedFlow<Unit>()

    fun updatePicName(name: String) {
        _state.update { it.copy(picName = name, error = null) }
    }

    // Saves the final project-level PIC signature.
    // technicianId = the technician collecting the signature on behalf of the project.
    fun saveProjectSignature(
        projectId:    String,
        technicianId: String,
        bitmap:       Bitmap
    ) {
        val picName = _state.value.picName.trim()
        if (picName.isEmpty()) {
            _state.update { it.copy(error = "Masukkan nama PIC terlebih dahulu") }
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val bytes = bitmapToBytes(bitmap)
                ticketRepo.saveProjectFinalSignature(
                    projectId      = projectId,
                    technicianId   = technicianId,
                    picName        = picName,
                    signatureBytes = bytes
                )
                _state.update { it.copy(isLoading = false) }
                signatureComplete.emit(Unit)
            } catch (e: Exception) {
                _state.update {
                    it.copy(
                        isLoading = false,
                        error     = "Gagal menyimpan tanda tangan proyek. Coba lagi."
                    )
                }
            }
        }
    }

    private fun bitmapToBytes(bitmap: Bitmap): ByteArray {
        val out = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
        return out.toByteArray()
    }
}