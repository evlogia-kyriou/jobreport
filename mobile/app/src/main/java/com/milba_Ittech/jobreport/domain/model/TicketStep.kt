package com.milba_Ittech.jobreport.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// Table: ticket_steps
// Key change from old schema:
//   ticket_id → ticket_id
//   is_flagged / flag_note removed (flags now at ticket level)
//   is_checked added (for checklist step types)
//   photo_required removed (inferred from step_type)

// ─── Step type enum ────────────────────────────────────────────────────────────

enum class StepType(val value: String) {
    NUMERIC_FORM_PHOTO("numeric_form_photo"),            // input_value + photo
    TEXT_CONDITIONAL_PHOTO("text_conditional_photo"),    // input_value + photo if abnormal
    CHECKLIST_ONLY("checklist_only"),                    // is_checked only
    CHECKLIST_PHOTO("checklist_photo"),                  // is_checked + photo
    CHECKLIST_CONDITIONAL_PHOTO("checklist_conditional_photo"), // is_checked + photo if abnormal
    DYNAMIC_FINDING("dynamic_finding");                  // input_value (description) + photo

    companion object {
        fun from(value: String) = entries.firstOrNull { it.value == value } ?: CHECKLIST_ONLY
    }

    val requiresPhoto: Boolean get() = when (this) {
        NUMERIC_FORM_PHOTO, CHECKLIST_PHOTO -> true
        else -> false
    }

    val photoIfAbnormal: Boolean get() = when (this) {
        TEXT_CONDITIONAL_PHOTO, CHECKLIST_CONDITIONAL_PHOTO -> true
        else -> false
    }

    val hasInputValue: Boolean get() = when (this) {
        NUMERIC_FORM_PHOTO, TEXT_CONDITIONAL_PHOTO, DYNAMIC_FINDING -> true
        else -> false
    }

    val isChecklist: Boolean get() = when (this) {
        CHECKLIST_ONLY, CHECKLIST_PHOTO, CHECKLIST_CONDITIONAL_PHOTO -> true
        else -> false
    }
}

// ─── SOP section enum ─────────────────────────────────────────────────────────

enum class SopSection(val value: String) {
    KEDATANGAN("kedatangan"),
    PENCUCIAN_INDOOR("pencucian_indoor"),
    PENCUCIAN_OUTDOOR("pencucian_outdoor"),
    PENYELESAIAN("penyelesaian"),
    LAPORAN_KERUSAKAN("laporan_kerusakan");

    companion object {
        fun from(value: String) = entries.firstOrNull { it.value == value } ?: KEDATANGAN
    }
}

// ─── TicketStep model ────────────────────────────────────────────────────────────

@Serializable
data class TicketStep(
    val id:                   String,
    @SerialName("ticket_id")
    val ticketId:             String,                   // was ticket_id
    @SerialName("ac_unit_id")
    val AcUnitId:             String,
    val section:              String,                   // SopSection.value
    @SerialName("order_number")
    val orderNumber:          Int,
    val description:          String,
    @SerialName("step_type")
    val stepType:             String,                   // StepType.value
    @SerialName("input_unit")
    val inputUnit:            String?  = null,          // "°C" | "bar" | "A"
    @SerialName("input_value")
    val inputValue:           String?  = null,          // filled by technician
    @SerialName("is_checked")
    val isChecked:            Boolean  = false,         // for checklist steps
    @SerialName("is_condition_abnormal")
    val isConditionAbnormal:  Boolean  = false,
    @SerialName("photo_url")
    val photoUrl:             String?  = null,          // Supabase Storage URL
    @SerialName("is_completed")
    val isCompleted:          Boolean  = false,
    @SerialName("completed_by")
    val completedBy:          String?  = null,
    @SerialName("completed_at")
    val completedAt:          String?  = null
) {
    val stepTypeEnum: StepType get() = StepType.from(stepType)
    val sectionEnum:  SopSection get() = SopSection.from(section)

    // Does this step need a photo right now?
    fun needsPhoto(): Boolean = when (stepTypeEnum) {
        StepType.NUMERIC_FORM_PHOTO,
        StepType.CHECKLIST_PHOTO        -> true
        StepType.TEXT_CONDITIONAL_PHOTO,
        StepType.CHECKLIST_CONDITIONAL_PHOTO -> isConditionAbnormal
        StepType.DYNAMIC_FINDING        -> true
        else                            -> false
    }
}