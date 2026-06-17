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
import kotlinx.coroutines.withContext
import android.content.Context
import java.io.File
import java.io.FileOutputStream

data class StepUiState(
    val inputValue:          String               = "",
    val isConditionAbnormal: Boolean              = false,
    val isChecked:           Boolean              = false,
    val capturedPhoto:       Bitmap?              = null,
    val photoQuality:        PhotoQuality.Result? = null,
    val showCamera:          Boolean              = false,
    val isLoading:           Boolean              = false,
    val error:               String?              = null
)

class StepViewModel(
    private val ticketRepo: TicketRepository
) : ViewModel() {

    private val _state = MutableStateFlow(StepUiState())
    val state = _state.asStateFlow()

    // ── Load saved state for this step ────────────────────────────────────────

    fun loadStep(stepId: String) {
        _state.value = StepUiState(
            inputValue          = AppState.stepInputValues[stepId] ?: "",
            isConditionAbnormal = AppState.stepConditions[stepId]  ?: false,
            isChecked           = AppState.stepChecked[stepId]      ?: false,
            capturedPhoto       = AppState.stepPhotos[stepId],
            photoQuality        = if (AppState.stepPhotos[stepId] != null)
                PhotoQuality.Result.Good
            else null
        )
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


    /*fun savePhotoToFile(bitmap: Bitmap, context: Context): File {
        val file = File(context.cacheDir, "step_photo_${System.currentTimeMillis()}.jpg")
        FileOutputStream(file).use { out ->
            bitmap.compress(Bitmap.CompressFormat.JPEG, 85, out)
        }
        return file
    }*/

    fun reset() {
        _state.value = StepUiState()
    }

    /*// ── Input ─────────────────────────────────────────────────────────────────

    fun updateInputValue(value: String) {
        _state.update { it.copy(inputValue = value, error = null) }
    }

    fun setConditionAbnormal(isAbnormal: Boolean) {
        _state.update {
            it.copy(
                isConditionAbnormal = isAbnormal,
                // Clear photo when switching condition
                capturedPhoto = if (!isAbnormal) null else it.capturedPhoto,
                photoQuality  = if (!isAbnormal) null else it.photoQuality
            )
        }
    }

    fun setChecked(checked: Boolean) {
        _state.update { it.copy(isChecked = checked) }
    }*/

    // ── Camera ────────────────────────────────────────────────────────────────

    /*fun openCamera() {
        _state.update { it.copy(showCamera = true) }
    }

    fun closeCamera() {
        _state.update { it.copy(showCamera = false) }
    }*/
    // ── Camera ────────────────────────────────────────────────────────────────

    fun openCamera()  = _state.update { it.copy(showCamera = true) }
    fun closeCamera() = _state.update { it.copy(showCamera = false) }

    /*fun onPhotoCaptured(bitmap: Bitmap) {
        val quality = PhotoQuality.check(bitmap)
        _state.update {
            it.copy(
                capturedPhoto = bitmap,
                photoQuality  = quality,
                showCamera    = false
            )
        }
    }

    fun retakePhoto() {
        _state.update {
            it.copy(
                capturedPhoto = null,
                photoQuality  = null,
                showCamera    = true
            )
        }
    }*/
    fun onPhotoCaptured(stepId: String, bitmap: Bitmap) {
        val quality = PhotoQuality.check(bitmap)
        _state.update {
            it.copy(
                capturedPhoto = bitmap,
                photoQuality  = quality,
                showCamera    = false
            )
        }
        // Save to AppState regardless of quality
        // so technician can see what they took
        AppState.saveStepPhoto(stepId, bitmap)
    }

    fun retakePhoto(stepId: String) {
        _state.update {
            it.copy(
                capturedPhoto = null,
                photoQuality  = null,
                showCamera    = true
            )
        }
        AppState.stepPhotos.remove(stepId)
    }

    // ── Validation ────────────────────────────────────────────────────────────

    fun canComplete(stepType: String): Boolean {
        val s = _state.value
        /*val photoOk = s.capturedPhoto != null &&
                s.photoQuality is PhotoQuality.Result.Good*/
        val hasPhoto = s.capturedPhoto != null

        return when (stepType) {
            "numeric_form_photo"          -> s.inputValue.isNotBlank() && /*photoOk*/ hasPhoto
            "text_conditional_photo"      -> if (s.isConditionAbnormal) /*photoOk*/ hasPhoto else true
            "checklist_only"              -> s.isChecked
            "checklist_photo"             -> s.isChecked && /*photoOk*/ hasPhoto
            "checklist_conditional_photo" -> if (!s.isChecked) /*photoOk*/ hasPhoto else true
            else                          -> true
        }
    }
    suspend fun savePhotoToFile(bitmap: Bitmap, context: Context): File {
        return withContext(Dispatchers.IO) {
            val file = File(
                context.cacheDir,
                "step_photo_${System.currentTimeMillis()}.jpg"
            )
            FileOutputStream(file).use { out ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, 85, out)
            }
            file
        }
    }
}