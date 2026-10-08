package com.milba_Ittech.jobreport.data

import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import com.milba_Ittech.jobreport.domain.model.ReplacementData
import android.graphics.Bitmap

object AppState {
    // Stores IDs of completed steps across the session
    val completedSteps    = mutableStateListOf<String>()
    val completedAcUnits  = mutableStateListOf<String>()
    val submittedTickets  = mutableStateListOf<String>()

    // ── NEW: unit timing tracking (Phase D) ───────────────────────────────────
    // Prevents duplicate unit_started_at writes ✅
    val unitStartedRecorded = mutableSetOf<String>() // acUnitId

    // Maps acUnitId → all step IDs for that unit ✅
    // Populated when steps are loaded in TicketDetailViewModel ✅
    val unitStepIds: MutableMap<String, List<String>> = mutableMapOf()

    fun setUnitStepIds(acUnitId: String, stepIds: List<String>) {
        unitStepIds[acUnitId] = stepIds
    }

    fun hasUnitStartBeenRecorded(acUnitId: String): Boolean =
        unitStartedRecorded.contains(acUnitId)

    fun markUnitStartRecorded(acUnitId: String) {
        unitStartedRecorded.add(acUnitId)
    }

    // Returns true if ALL steps for this unit are complete ✅
    fun areAllUnitStepsDone(acUnitId: String): Boolean {
        val stepIds = unitStepIds[acUnitId] ?: return false
        if (stepIds.isEmpty()) return false
        return stepIds.all { completedSteps.contains(it) }
    }
    // ── END Phase D additions ─────────────────────────────────────────────────

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

    val stepPhotos      = mutableStateMapOf<String, Bitmap>()
    val stepInputValues = mutableStateMapOf<String, String>()
    val stepConditions  = mutableStateMapOf<String, Boolean>()
    val stepChecked     = mutableStateMapOf<String, Boolean>()
    val submittedAt     = mutableStateMapOf<String, String>()

    val unitIndoorPhotos:     MutableMap<String, Bitmap>         = mutableMapOf()
    val unitOutdoorPhotos:    MutableMap<String, Bitmap>         = mutableMapOf()
    val unitProfilePhotos:    MutableMap<String, Bitmap>         = mutableMapOf()
    val arusAutoFindings:     MutableMap<String, String>         = mutableMapOf()
    val pendingReplacements:  MutableMap<String, ReplacementData> = mutableMapOf()
    val suhuAwalStepIds:      MutableMap<String, String>         = mutableMapOf()
    val ampereAwalStepIds:    MutableMap<String, String>         = mutableMapOf()

    fun markStepComplete(stepId: String) {
        if (!completedSteps.contains(stepId)) completedSteps.add(stepId)
    }

    fun markAcUnitComplete(AcUnitId: String) {
        if (!completedAcUnits.contains(AcUnitId)) completedAcUnits.add(AcUnitId)
    }

    fun markComplete(stepId: String) {
        if (!completedSteps.contains(stepId)) completedSteps.add(stepId)
    }

    fun submitTicket(ticketId: String) {
        if (!submittedTickets.contains(ticketId)) {
            submittedTickets.add(ticketId)
            submittedAt[ticketId] = java.time.LocalDateTime.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm"))
        }
    }

    fun isCompleted(stepId: String)           = completedSteps.contains(stepId)
    fun isAcUnitCompleted(AcUnitId: String)   = completedAcUnits.contains(AcUnitId)
    fun isTicketSubmitted(ticketId: String)   = submittedTickets.contains(ticketId)

    fun areAllStepsDone(AcUnitId: String): Boolean = isAcUnitCompleted(AcUnitId)

    fun saveStepPhoto(stepId: String, bitmap: Bitmap)         { stepPhotos[stepId]      = bitmap  }
    fun saveStepInput(stepId: String, value: String)          { stepInputValues[stepId] = value   }
    fun saveStepCondition(stepId: String, isAbnormal: Boolean){ stepConditions[stepId]  = isAbnormal }
    fun saveStepChecked(stepId: String, checked: Boolean)     { stepChecked[stepId]     = checked }

    fun reset() {
        completedSteps.clear()
        completedAcUnits.clear()
        submittedTickets.clear()
        submittedAt.clear()
        stepPhotos.clear()
        stepInputValues.clear()
        stepConditions.clear()
        stepChecked.clear()
        unitStartedRecorded.clear()   // ← NEW ✅
        unitStepIds.clear()           // ← NEW ✅
        technicianName.value      = ""
        technicianSignature.value = null
        picName.value             = ""
        picSignature.value        = null
    }
}