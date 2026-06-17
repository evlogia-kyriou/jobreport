package com.milba_Ittech.jobreport.data

import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import android.graphics.Bitmap

object AppState {
    // Stores IDs of completed steps across the session
    val completedSteps = mutableStateListOf<String>()
    val completedAcUnits = mutableStateListOf<String>()
    val submittedTickets    = mutableStateListOf<String>()

    // ── Signatures ────────────────────────────────────────────────────────────
    var technicianName      = mutableStateOf("")
    var technicianSignature = mutableStateOf<Bitmap?>(null)
    var picName             = mutableStateOf("")
    var picSignature        = mutableStateOf<Bitmap?>(null)

    fun saveTechnicianSignature(name: String, bitmap: Bitmap) {
        technicianName.value      = name
        technicianSignature.value = bitmap
    }

    fun savePicSignature(name: String, bitmap: Bitmap) {
        picName.value      = name
        picSignature.value = bitmap
    }
    // Store photo per step ID
    val stepPhotos       = mutableStateMapOf<String, Bitmap>()

    // Store input value per step ID
    val stepInputValues  = mutableStateMapOf<String, String>()

    // Store condition per step ID
    val stepConditions   = mutableStateMapOf<String, Boolean>()

    // Store checked state per step ID
    val stepChecked      = mutableStateMapOf<String, Boolean>()
    val submittedAt     = mutableStateMapOf<String, String>()

    fun markStepComplete(stepId: String) {
        if (!completedSteps.contains(stepId)) completedSteps.add(stepId)
    }

    fun markAcUnitComplete(AcUnitId: String) {
        if (!completedAcUnits.contains(AcUnitId)) completedAcUnits.add(AcUnitId)
    }
    fun markComplete(stepId: String) {
        if (!completedSteps.contains(stepId)) {
            completedSteps.add(stepId)
        }
    }

    /*fun isAcUnitCompleted(AcUnitId: String): Boolean {
        return completedAcUnits.contains(AcUnitId)
    }*/

    fun submitTicket(ticketId: String) {
        if (!submittedTickets.contains(ticketId)) {
            submittedTickets.add(ticketId)
            submittedAt[ticketId] = java.time.LocalDateTime.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm"))
        }
    }

    fun isCompleted(stepId: String)         = completedSteps.contains(stepId)
    fun isAcUnitCompleted(AcUnitId: String) = completedAcUnits.contains(AcUnitId)
    fun isTicketSubmitted(ticketId: String)       = submittedTickets.contains(ticketId)

    fun areAllStepsDone(AcUnitId: String): Boolean {
        return isAcUnitCompleted(AcUnitId)
    }

    fun saveStepPhoto(stepId: String, bitmap: Bitmap) {
        stepPhotos[stepId] = bitmap
    }

    fun saveStepInput(stepId: String, value: String) {
        stepInputValues[stepId] = value
    }

    /*fun isCompleted(stepId: String): Boolean {
        return completedSteps.contains(stepId)
    }*/

    fun saveStepCondition(stepId: String, isAbnormal: Boolean) {
        stepConditions[stepId] = isAbnormal
    }

    fun saveStepChecked(stepId: String, checked: Boolean) {
        stepChecked[stepId] = checked
    }

    fun reset() {
        completedSteps.clear()
        completedAcUnits.clear()
        submittedTickets.clear()
        submittedAt.clear()
        stepPhotos.clear()
        stepInputValues.clear()
        stepConditions.clear()
        stepChecked.clear()
        technicianName.value      = ""
        technicianSignature.value = null
        picName.value             = ""
        picSignature.value        = null
    }
}