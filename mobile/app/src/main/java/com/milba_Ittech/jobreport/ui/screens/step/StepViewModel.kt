package com.milba_Ittech.jobreport.ui.screens.step

import android.graphics.Bitmap
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.milba_Ittech.jobreport.data.AppState
import com.milba_Ittech.jobreport.util.PhotoQuality
import com.milba_Ittech.jobreport.data.repository.TicketRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import android.content.Context
import java.io.File
import java.io.FileOutputStream

// ── Thresholds (mirrors ref_thresholds in DB) ─────────────────────────────────
private const val SUHU_AKHIR_MAX    = 12.0   // °C
private const val ARUS_DROP_MIN_PCT = 3.0    // %

data class StepUiState(
    val inputValue:          String               = "",
    val isConditionAbnormal: Boolean              = false,
    val isChecked:           Boolean              = false,
    val capturedPhoto:       Bitmap?              = null,
    val photoQuality:        PhotoQuality.Result? = null,
    val showCamera:          Boolean              = false,
    val isLoading:           Boolean              = false,
    val error:               String?              = null,
    val thresholdError:      String?              = null,
    val thresholdWarning:    String?              = null
)

class StepViewModel(
    private val ticketRepo: TicketRepository
) : ViewModel() {

    private val _state = MutableStateFlow(StepUiState())
    val state = _state.asStateFlow()

    // ── Load saved state ──────────────────────────────────────────────────────

    fun loadStep(stepId: String) {
        _state.value = StepUiState(
            inputValue          = AppState.stepInputValues[stepId] ?: "",
            isConditionAbnormal = AppState.stepConditions[stepId]  ?: false,
            isChecked           = AppState.stepChecked[stepId]      ?: false,
            capturedPhoto       = AppState.stepPhotos[stepId],
            photoQuality        = if (AppState.stepPhotos[stepId] != null)
                PhotoQuality.Result.Good else null
        )
    }

    fun reset() {
        _state.value = StepUiState()
    }

    // ── Input ─────────────────────────────────────────────────────────────────

    fun updateInputValue(stepId: String, value: String) {
        _state.update { it.copy(inputValue = value, error = null) }
        AppState.saveStepInput(stepId, value)
    }

    fun setConditionAbnormal(stepId: String, isAbnormal: Boolean) {
        _state.update {
            it.copy(
                isConditionAbnormal = isAbnormal,
                capturedPhoto       = if (!isAbnormal) null else it.capturedPhoto,
                photoQuality        = if (!isAbnormal) null else it.photoQuality
            )
        }
        AppState.saveStepCondition(stepId, isAbnormal)
        if (!isAbnormal) AppState.stepPhotos.remove(stepId)
    }

    fun setChecked(stepId: String, checked: Boolean) {
        _state.update { it.copy(isChecked = checked) }
        AppState.saveStepChecked(stepId, checked)
    }

    // ── Threshold validation ──────────────────────────────────────────────────

    fun validateThreshold(
        stepDescription:  String,
        previousValueStr: String?,
        acUnitId:         String
    ) {
        val value = _state.value.inputValue.toDoubleOrNull() ?: run {
            _state.update { it.copy(thresholdError = null, thresholdWarning = null) }
            return
        }

        when (stepDescription) {
            "Suhu Akhir" -> {
                if (value >= SUHU_AKHIR_MAX) {
                    _state.update {
                        it.copy(
                            thresholdError   = "Suhu akhir ${value}°C belum memenuhi standar. " +
                                    "Harus di bawah ${SUHU_AKHIR_MAX.toInt()}°C. Ulangi pencucian.",
                            thresholdWarning = null
                        )
                    }
                } else {
                    _state.update { it.copy(thresholdError = null, thresholdWarning = null) }
                }
            }

            "Ampere Akhir" -> {
                val prevValue = previousValueStr?.toDoubleOrNull()
                if (prevValue != null && prevValue > 0) {
                    val dropPct = (prevValue - value) / prevValue * 100
                    if (dropPct < ARUS_DROP_MIN_PCT) {
                        val warningText =
                            "Penurunan arus ${String.format("%.1f", dropPct)}% di bawah " +
                                    "batas minimum ${ARUS_DROP_MIN_PCT.toInt()}%. " +
                                    "Kemungkinan kompresor outdoor bermasalah, perlu pengecekan lebih lanjut."
                        _state.update {
                            it.copy(thresholdWarning = warningText, thresholdError = null)
                        }
                        AppState.arusAutoFindings[acUnitId] = warningText
                    } else {
                        _state.update { it.copy(thresholdWarning = null, thresholdError = null) }
                        AppState.arusAutoFindings.remove(acUnitId)
                    }
                }
            }
        }
    }

    fun loadFindingWithAutoText(stepId: String, acUnitId: String) {
        val existing = AppState.stepInputValues[stepId] ?: ""
        val autoText = AppState.arusAutoFindings[acUnitId]
        val combined = when {
            autoText == null            -> existing
            existing.isBlank()          -> autoText
            existing.contains(autoText) -> existing
            else                        -> "$existing\n---\n$autoText"
        }
        _state.update { it.copy(inputValue = combined) }
        if (combined != existing) AppState.saveStepInput(stepId, combined)
    }

    // ── Camera ────────────────────────────────────────────────────────────────

    fun openCamera()  = _state.update { it.copy(showCamera = true) }
    fun closeCamera() = _state.update { it.copy(showCamera = false) }

    fun onPhotoCaptured(stepId: String, bitmap: Bitmap) {
        val quality = PhotoQuality.check(bitmap)
        _state.update {
            it.copy(capturedPhoto = bitmap, photoQuality = quality, showCamera = false)
        }
        AppState.saveStepPhoto(stepId, bitmap)
    }

    fun retakePhoto(stepId: String) {
        _state.update { it.copy(capturedPhoto = null, photoQuality = null, showCamera = true) }
        AppState.stepPhotos.remove(stepId)
    }

    // ── Validation ────────────────────────────────────────────────────────────

    fun canComplete(stepType: String): Boolean {
        val s        = _state.value
        val hasPhoto = s.capturedPhoto != null
        if (s.thresholdError != null) return false
        return when (stepType) {
            "numeric_form_photo"          -> s.inputValue.isNotBlank() && hasPhoto
            "text_conditional_photo"      -> if (s.isConditionAbnormal) hasPhoto else true
            "checklist_only"              -> s.isChecked
            "checklist_photo"             -> s.isChecked && hasPhoto
            "checklist_conditional_photo" -> if (!s.isChecked) hasPhoto else true
            "dynamic_finding_photo"       -> if (s.inputValue.isNotBlank()) hasPhoto else true
            else                          -> true
        }
    }

    // ── Unit timing (Phase D) ─────────────────────────────────────────────────

    // Called from StepScreen when technician opens first step of a unit ✅
    fun recordUnitStartedIfFirst(
        ticketId: String,
        acUnitId: String,
    ) {
        if (AppState.hasUnitStartBeenRecorded(acUnitId)) return
        AppState.markUnitStartRecorded(acUnitId)
        viewModelScope.launch {
            try {
                ticketRepo.recordUnitStarted(ticketId, acUnitId)
            } catch (e: Exception) {
                android.util.Log.w("StepViewModel",
                    "recordUnitStarted skipped: ${e.message}")
            }
        }
    }

    // ── Save and complete ─────────────────────────────────────────────────────

    fun saveAndComplete(
        stepId:       String,
        ticketId:     String,
        acUnitId:     String,
        technicianId: String,
        onCompleted:  (String) -> Unit
    ) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val s = _state.value

                // 1. Upload photo if exists ✅
                var photoUrl: String? = null
                s.capturedPhoto?.let { bitmap ->
                    val bytes = java.io.ByteArrayOutputStream()
                        .also { out -> bitmap.compress(
                            android.graphics.Bitmap.CompressFormat.JPEG, 85, out)
                        }.toByteArray()
                    photoUrl = ticketRepo.uploadStepPhoto(
                        ticketId, acUnitId, stepId, bytes
                    )
                }

                // 2. Save to DB ✅
                ticketRepo.completeStep(
                    stepId              = stepId,
                    technicianId        = technicianId,
                    inputValue          = s.inputValue.ifBlank { null },
                    isChecked           = s.isChecked,
                    isConditionAbnormal = s.isConditionAbnormal,
                    photoUrl            = photoUrl
                )

                // 3. Mark in AppState ✅
                AppState.markStepComplete(stepId)

                // 4. Phase D: check if ALL unit steps done → record finish ✅
                if (AppState.areAllUnitStepsDone(acUnitId)) {
                    try {
                        ticketRepo.recordUnitFinished(ticketId, acUnitId)
                    } catch (e: Exception) {
                        android.util.Log.w("StepViewModel",
                            "recordUnitFinished skipped: ${e.message}")
                    }
                }

                _state.update { it.copy(isLoading = false) }
                onCompleted(stepId)

            } catch (e: Exception) {
                android.util.Log.e("StepViewModel", "saveAndComplete failed: ${e.message}")
                _state.update {
                    it.copy(
                        isLoading = false,
                        error     = "Gagal menyimpan langkah. Coba lagi."
                    )
                }
            }
        }
    }

    // ── File helpers ──────────────────────────────────────────────────────────

    suspend fun savePhotoToFile(bitmap: Bitmap, context: Context): File {
        return withContext(Dispatchers.IO) {
            val file = File(context.cacheDir, "step_photo_${System.currentTimeMillis()}.jpg")
            FileOutputStream(file).use { out ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, 85, out)
            }
            file
        }
    }
}