package com.milba_Ittech.jobreport.navigation

sealed class Screen {
    object Login              : Screen()
    object TicketList         : Screen()
    object ReAuth             : Screen()

    // ── NEW: Job start summary screen ─────────────────────────────────────────
    // Shown between TicketList and TicketDetail ✅
    // Technician sees job overview + taps "Mulai" or "Lanjutkan"
    data class JobStart(
        val ticketId:      String,
        val ticketNumber:  String,
        val ticketType:    String,
        val scheduledDate: String,
        val scheduledTime: String,
        val locationName:  String
    ) : Screen()

    data class TicketDetail(
        val ticketId:     String,
        val locationName: String,
        val ticketType:    String,
        val scheduledTime: String,
        val ticketNumber: String = ""
    )                                                         : Screen()
    data class AcUnit(val ticketId: String, val AcUnitId: String) : Screen()
    data class Step(
        val ticketId:       String,
        val AcUnitId:       String,
        val stepId:         String,
        val sectionKey:     String,         // e.g. "kedatangan"
        val stepIndex:      Int,            // 0-based index within section
        val sectionStepIds: List<String>,   // all step IDs in this section in order
        val sectionIndex:   Int,            // 0-based section index (0-7)
    ) : Screen()
    data class Finding(val ticketId: String, val AcUnitId: String) : Screen()
    data class Signature(val ticketId: String)                 : Screen()
    data class SubmitConfirmation(val projectId: String)       : Screen()
    data class TicketSummary(val ticketId: String)             : Screen()
    data class StepList(
        val ticketId:        String,
        val acUnitId:        String,
        val unitLabel:       String,
        val ticketNumber:    String,
        val photoIndoorUrl:  String? = null,
        val photoOutdoorUrl: String? = null
    ) : Screen()
    data class ProjectFinalSignature(val projectId: String)    : Screen()

    data class SopOverview(
        val ticketId: String,
        val acUnitId: String
    ) : Screen()

    data class SectionIntro(
        val ticketId:     String,
        val acUnitId:     String,
        val sectionIndex: Int,
    ) : Screen()

    data class SectionDone(
        val ticketId:     String,
        val acUnitId:     String,
        val sectionIndex: Int,
        val stepSummary:  List<String>,
    ) : Screen()
}