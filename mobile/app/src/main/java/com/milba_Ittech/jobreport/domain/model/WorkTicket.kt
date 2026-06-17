package com.milba_Ittech.jobreport.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// Replaces Ticket.kt
// Table: tickets (work-level ticket, one technician per time slot)
// Joined from: project_tickets, locations, customers

// ─── Base work ticket (from DB) ──────────────────────────────────────────────

@Serializable
data class WorkTicket(
    val id:                  String,
    @SerialName("ticket_number")
    val ticketNumber:        String,
    @SerialName("project_ticket_id")
    val projectTicketId:     String,
    val type:                String,                    // cleaning | install | service
    val status:              String  = "assigned",      // assigned | in_progress | submitted | approved | cancelled
    @SerialName("customer_id")
    val customerId:          String,
    @SerialName("location_id")
    val locationId:          String,
    @SerialName("technician_id")
    val technicianId:        String,
    @SerialName("scheduled_date")
    val scheduledDate:       String,                    // "2024-05-20"
    @SerialName("scheduled_time")
    val scheduledTime:       String,                    // "08:00:00"
    @SerialName("estimated_minutes")
    val estimatedMinutes:    Int,
    @SerialName("arrival_at")
    val arrivalAt:           String? = null,
    @SerialName("departure_at")
    val departureAt:         String? = null,
    @SerialName("is_flagged")
    val isFlagged:           Boolean = false,
    @SerialName("flag_type")
    val flagType:            String? = null,            // no_client | no_pic_signature | work_reopened
    @SerialName("flag_notes")
    val flagNotes:           String? = null,
    @SerialName("submitted_at")
    val submittedAt:         String? = null,
    @SerialName("approved_at")
    val approvedAt:          String? = null,
    @SerialName("cancelled_at")
    val cancelledAt:         String? = null,
    val notes:               String? = null
)

// ─── Work ticket with joined details (for list & detail screens) ─────────────

@Serializable
data class WorkTicketWithDetails(
    val id:                  String,
    @SerialName("ticket_number")
    val ticketNumber:        String,
    @SerialName("project_ticket_id")
    val projectTicketId:     String,
    val type:                String,
    val status:              String  = "assigned",
    @SerialName("customer_id")
    val customerId:          String,
    @SerialName("location_id")
    val locationId:          String,
    @SerialName("technician_id")
    val technicianId:        String,
    @SerialName("scheduled_date")
    val scheduledDate:       String,
    @SerialName("scheduled_time")
    val scheduledTime:       String,
    @SerialName("estimated_minutes")
    val estimatedMinutes:    Int,
    @SerialName("arrival_at")
    val arrivalAt:           String? = null,
    @SerialName("departure_at")
    val departureAt:         String? = null,
    @SerialName("is_flagged")
    val isFlagged:           Boolean = false,
    @SerialName("flag_type")
    val flagType:            String? = null,
    @SerialName("submitted_at")
    val submittedAt:         String? = null,
    @SerialName("approved_at")
    val approvedAt:          String? = null,
    @SerialName("cancelled_at")
    val cancelledAt:         String? = null,
    val notes:               String? = null,

    // Joined: project_tickets
    @SerialName("project_tickets")
    val projectTicket:       ProjectTicketNested?  = null,

    // Joined: locations
    @SerialName("locations")
    val location:            LocationNested?       = null,

    // Joined: customers
    @SerialName("customers")
    val customer:            CustomerNested?       = null
) {
    // Convenience helpers
    val locationName:  String get() = location?.name    ?: ""
    val locationAddr:  String get() = location?.address ?: ""
    val picName:       String get() = customer?.picName ?: ""
    val projectNumber: String get() = projectTicket?.projectNumber ?: ""
}

// ─── Nested join models (Supabase foreign table expansion) ───────────────────

@Serializable
data class ProjectTicketNested(
    @SerialName("project_number")
    val projectNumber: String
)

@Serializable
data class LocationNested(
    val name:       String,
    val address:    String,
    val kelurahan:  String,
    @SerialName("postal_code")
    val postalCode: String = ""
)

@Serializable
data class CustomerNested(
    @SerialName("pic_name")
    val picName: String
)

// ─── Status helpers ───────────────────────────────────────────────────────────

enum class TicketStatus(val value: String) {
    ASSIGNED("assigned"),
    IN_PROGRESS("in_progress"),
    SUBMITTED("submitted"),
    APPROVED("approved"),
    CANCELLED("cancelled");

    companion object {
        fun from(value: String) = entries.firstOrNull { it.value == value } ?: ASSIGNED
    }
}

enum class TicketType(val value: String) {
    CLEANING("cleaning"),
    INSTALL("install"),
    SERVICE("service");

    companion object {
        fun from(value: String) = entries.firstOrNull { it.value == value } ?: CLEANING
    }
}

enum class FlagType(val value: String) {
    NO_CLIENT("no_client"),
    NO_PIC_SIGNATURE("no_pic_signature"),
    WORK_REOPENED("work_reopened");

    companion object {
        fun from(value: String?) = entries.firstOrNull { it.value == value }
    }
}