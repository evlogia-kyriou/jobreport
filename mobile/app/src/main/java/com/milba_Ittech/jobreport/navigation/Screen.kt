package com.milba_Ittech.jobreport.navigation

sealed class Screen {
    object Login           : Screen()
    object TicketList         : Screen()
    object ReAuth          : Screen()
    data class TicketDetail(val ticketId: String)                 : Screen()
    data class AcUnit(val ticketId: String, val AcUnitId: String) : Screen()
    data class Step(
        val ticketId:    String,
        val AcUnitId: String,
        val stepId:   String
    ) : Screen()
    data class Finding(val ticketId: String, val AcUnitId: String) : Screen()
    data class Signature(val ticketId: String)                 : Screen()
    object SubmitConfirmation : Screen()
    data class TicketSummary(val ticketId: String)                  : Screen()
}