package com.milba_Ittech.jobreport.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// ─── TicketSignature ─────────────────────────────────────────────────────────────
// Table: ticket_signatures
// Key change: ticket_id → ticket_id
// pic_name stored here (auto-suggested from customer.pic_name by app)

@Serializable
data class TicketSignature(
    val id:                       String  = "",
    @SerialName("ticket_id")
    val ticketId:                 String,
    @SerialName("technician_id")
    val technicianId:             String,
    @SerialName("technician_signature_url")
    val technicianSignatureUrl:   String? = null,
    @SerialName("technician_signed_at")
    val technicianSignedAt:       String? = null,
    @SerialName("pic_name")
    val picName:                  String,
    @SerialName("pic_signature_url")
    val picSignatureUrl:          String? = null,
    @SerialName("pic_signed_at")
    val picSignedAt:              String? = null
) {
    val technicianSigned: Boolean get() = technicianSignatureUrl != null
    val picSigned:        Boolean get() = picSignatureUrl != null
    val bothSigned:       Boolean get() = technicianSigned && picSigned
}

// ─── TechnicianShift ──────────────────────────────────────────────────────────
// Table: technician_attendance
// Captures where technician starts their day (GPS on "Mulai Shift")
// Used for route optimization and transport time calculation (future)

@Serializable
data class TechnicianShift(
    val id:            String  = "",
    @SerialName("technician_id")
    val technicianId:  String,
    @SerialName("attendance_date")
    val shiftDate:     String,                      // "2024-05-20"
    @SerialName("start_lat")
    val startLat:      Double? = null,
    @SerialName("start_lng")
    val startLng:      Double? = null,
    @SerialName("clock_in_at")
    val startedAt:     String  = ""
) {
    val hasLocation: Boolean get() = startLat != null && startLng != null
}