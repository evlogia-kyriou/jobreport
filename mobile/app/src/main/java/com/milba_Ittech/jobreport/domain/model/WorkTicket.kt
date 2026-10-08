package com.milba_Ittech.jobreport.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// ─── Base work ticket (from DB) ───────────────────────────────────────────────

@Serializable
data class WorkTicket(
    val id:                  String,
    @SerialName("ticket_number")
    val ticketNumber:        String,
    @SerialName("project_ticket_id")
    val projectTicketId:     String,
    val type:                String,
    val status:              String = "assigned",
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
    val arrivalAt:           String?  = null,
    @SerialName("departure_at")
    val departureAt:         String?  = null,
    @SerialName("is_flagged")
    val isFlagged:           Boolean  = false,
    @SerialName("submitted_at")
    val submittedAt:         String?  = null,
    @SerialName("approved_at")
    val approvedAt:          String?  = null,
    @SerialName("cancelled_at")
    val cancelledAt:         String?  = null,
    val notes:               String?  = null,
    // ── NEW: job start tracking ────────────────────────────────────────────────
    @SerialName("started_at")
    val startedAt:           String?  = null,   // when technician tapped "Mulai" ✅
    @SerialName("started_by")
    val startedBy:           String?  = null    // technician UUID ✅
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
    @SerialName("submitted_at")
    val submittedAt:         String? = null,
    @SerialName("approved_at")
    val approvedAt:          String? = null,
    @SerialName("cancelled_at")
    val cancelledAt:         String? = null,
    val notes:               String? = null,
    // ── NEW: job start tracking ────────────────────────────────────────────────
    @SerialName("started_at")
    val startedAt:           String? = null,    // ✅
    @SerialName("started_by")
    val startedBy:           String? = null,    // ✅
    // Joined
    @SerialName("project_tickets")
    val projectTicket:       ProjectTicketNested? = null,
    @SerialName("locations")
    val location:            LocationNested?      = null,
    @SerialName("customers")
    val customer:            CustomerNested?      = null
) {
    val locationName:         String  get() = location?.name               ?: ""
    val locationAddr:         String  get() = location?.address            ?: ""
    val locationRegulations:  String? get() = location?.accessRegulations
    val picName:       String get() = customer?.picName ?: ""
    val projectNumber: String get() = projectTicket?.projectNumber ?: ""
}

// ─── Nested join models ───────────────────────────────────────────────────────

@Serializable
data class ProjectTicketNested(
    @SerialName("project_number")
    val projectNumber: String
)

@Serializable
data class LocationNested(
    val name:      String,
    val address:   String,
    val kelurahan: String,
    @SerialName("postal_code")
    val postalCode: String = "",
    @SerialName("access_regulations")
    val accessRegulations: String? = null   // permanent access rules ✅
)

@Serializable
data class CustomerNested(
    @SerialName("pic_name")
    val picName: String
)

// ─── Lightweight model for status checks ─────────────────────────────────────

@Serializable
data class TicketStatusRow(
    val id:     String,
    val status: String
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

// ─── Flag types ───────────────────────────────────────────────────────────────

enum class FlagType(val value: String) {
    NO_CLIENT("no_client"),
    NO_PIC_SIGNATURE("no_pic_signature"),
    WORK_REOPENED("work_reopened"),
    UNIT_REPLACEMENT("unit_replacement");
    companion object {
        fun from(value: String?) = entries.firstOrNull { it.value == value }
    }
}