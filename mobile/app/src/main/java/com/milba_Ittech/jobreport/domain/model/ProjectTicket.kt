package com.milba_Ittech.jobreport.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// Table: project_tickets (client-level ticket)
// Mobile app only reads this — admin creates it on web
// Technician needs: project_number (for reference only)

@Serializable
data class ProjectTicket(
    val id:                  String,
    @SerialName("project_number")
    val projectNumber:       String,
    @SerialName("customer_id")
    val customerId:          String,
    @SerialName("location_id")
    val locationId:          String,
    val type:                String,
    val status:              String  = "in_progress",
    @SerialName("is_flagged")
    val isFlagged:           Boolean = false,
    @SerialName("total_ac_units")
    val totalAcUnits:        Int
)