package com.milba_Ittech.jobreport.data.repository

import android.util.Log
import com.milba_Ittech.jobreport.data.SupabaseClient
import com.milba_Ittech.jobreport.domain.model.*
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import io.github.jan.supabase.storage.storage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.datetime.Clock
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

// Replaces TicketRepository.kt
// Key changes:
//   table: "tickets"     → "tickets"
//   table: "ac_units" → "ticket_ac_units" JOIN "ac_units"
//   table: "ticket_steps".ticket_id → .ticket_id
//   table: "ticket_signatures".ticket_id → .ticket_id
//   storage bucket: "ticket-files" → "ticket-photos"
//   removed: finding_types, findings, location_logs, addAcUnit

class TicketRepository {

    private val client = SupabaseClient.client
    private val TAG    = "TicketRepository"

    // ── Ticket queries ────────────────────────────────────────────────────────

    // Technician sees: last 7 days (submitted/approved) + upcoming (assigned/in_progress)
    suspend fun getTechnicianTickets(technicianId: String): List<WorkTicketWithDetails> {
        return try {
            client.postgrest["tickets"]
                .select(Columns.raw("""
                    id, ticket_number, project_ticket_id, type, status,
                    customer_id, location_id, technician_id,
                    scheduled_date, scheduled_time, estimated_minutes,
                    arrival_at, departure_at, is_flagged, flag_type,
                    submitted_at, approved_at, cancelled_at, notes,
                    project_tickets(project_number),
                    locations(name, address, kelurahan, postal_code),
                    customers(pic_name)
                """.trimIndent())) {
                    filter {
                        eq("technician_id", technicianId)
                        or {
                            // Last 7 days of history
                            gte("scheduled_date", todayMinusDays(7))
                            // All active tickets regardless of date
                            isIn("status", listOf("assigned", "in_progress", "submitted"))
                        }
                    }
                    order("scheduled_date", Order.ASCENDING)
                    order("scheduled_time", Order.ASCENDING)
                }
                .decodeList()
        } catch (e: Exception) {
            Log.e(TAG, "getTechnicianTickets failed: ${e.message}")
            emptyList()
        }
    }

    suspend fun getTicketById(ticketId: String): WorkTicketWithDetails? {
        return try {
            client.postgrest["tickets"]
                .select(Columns.raw("""
                    id, ticket_number, project_ticket_id, type, status,
                    customer_id, location_id, technician_id,
                    scheduled_date, scheduled_time, estimated_minutes,
                    arrival_at, departure_at, is_flagged, flag_type,
                    submitted_at, approved_at, cancelled_at, notes,
                    project_tickets(project_number),
                    locations(name, address, kelurahan, postal_code),
                    customers(pic_name)
                """.trimIndent())) {
                    filter { eq("id", ticketId) }
                    limit(1)
                }
                .decodeList<WorkTicketWithDetails>()
                .firstOrNull()
        } catch (e: Exception) {
            Log.e(TAG, "getTicketById failed: ${e.message}")
            null
        }
    }

    // ── AC unit queries ───────────────────────────────────────────────────────

    // Gets AC units for a ticket via ticket_ac_units junction table
    // Includes building_unit display_name for technician display
    suspend fun getTicketAcUnits(ticketId: String): List<TicketAcUnit> {
        return try {
            client.postgrest["ticket_ac_units"]
                .select(Columns.raw("""
                    order_number,
                    ac_units(
                        id, ac_code, type, capacity_pk, unit_label,
                        access_notes,
                        building_units(display_name)
                    )
                """.trimIndent())) {
                    filter { eq("ticket_id", ticketId) }
                    order("order_number", Order.ASCENDING)
                }
                .decodeList()
        } catch (e: Exception) {
            Log.e(TAG, "getTicketAcUnits failed: ${e.message}")
            emptyList()
        }
    }

    // ── Step queries ──────────────────────────────────────────────────────────

    suspend fun getStepsByAcUnit(ticketId: String, AcUnitId: String): List<TicketStep> {
        return try {
            client.postgrest["ticket_steps"]
                .select {
                    filter {
                        eq("ticket_id", ticketId)
                        eq("ac_unit_id", AcUnitId)
                    }
                    order("order_number", Order.ASCENDING)
                }
                .decodeList()
        } catch (e: Exception) {
            Log.e(TAG, "getStepsByAcUnit failed: ${e.message}")
            emptyList()
        }
    }

    suspend fun getAllStepsForTicket(ticketId: String): List<TicketStep> {
        return try {
            client.postgrest["ticket_steps"]
                .select {
                    filter { eq("ticket_id", ticketId) }
                    order("ac_unit_id", Order.ASCENDING)
                    order("order_number", Order.ASCENDING)
                }
                .decodeList()
        } catch (e: Exception) {
            Log.e(TAG, "getAllStepsForTicket failed: ${e.message}")
            emptyList()
        }
    }

    // ── Step completion ───────────────────────────────────────────────────────

    suspend fun completeStep(
        stepId:              String,
        technicianId:        String,
        inputValue:          String?  = null,
        isChecked:           Boolean  = false,
        isConditionAbnormal: Boolean  = false,
        photoUrl:            String?  = null
    ) {
        client.postgrest["ticket_steps"]
            .update(buildJsonObject {
                put("is_completed",           true)
                put("is_checked",             isChecked)
                put("is_condition_abnormal",  isConditionAbnormal)
                put("completed_by",           technicianId)
                put("completed_at",           Clock.System.now().toString())
                if (inputValue != null) put("input_value", inputValue)
                if (photoUrl   != null) put("photo_url",   photoUrl)
            }) {
                filter { eq("id", stepId) }
            }
    }

    // ── Ticket status updates ─────────────────────────────────────────────────

    // Step 4: Technician taps "Mulai Pekerjaan" → arrival_at recorded
    suspend fun markArrival(ticketId: String) {
        client.postgrest["tickets"]
            .update(buildJsonObject {
                put("arrival_at", Clock.System.now().toString())
                put("status",     "in_progress")
            }) {
                filter { eq("id", ticketId) }
            }
    }

    // Step 9: Technician submits → departure_at recorded, status → submitted
    suspend fun submitTicket(ticketId: String) {
        client.postgrest["tickets"]
            .update(buildJsonObject {
                put("departure_at", Clock.System.now().toString())
                put("status",       "submitted")
                // submitted_at set by DB trigger (trg_ticket_approval)
            }) {
                filter { eq("id", ticketId) }
            }
    }

    // ── Photo upload ──────────────────────────────────────────────────────────

    // Uploads step photo to Supabase Storage, returns public URL
    // Path: photos/{ticketId}/{AcUnitId}/{stepId}.jpg
    suspend fun uploadStepPhoto(
        ticketId:   String,
        AcUnitId:   String,
        stepId:     String,
        imageBytes: ByteArray
    ): String = withContext(Dispatchers.IO) {
        val path   = "photos/$ticketId/$AcUnitId/$stepId.jpg"
        val bucket = client.storage["ticket-photos"]
        bucket.upload(path, imageBytes) { upsert = true }
        bucket.publicUrl(path)
    }

    // ── Signature upload + save ───────────────────────────────────────────────

    // Uploads signature image, returns public URL
    // Type: "technician" or "pic"
    suspend fun uploadSignature(
        ticketId:   String,
        type:       String,             // "technician" | "pic"
        imageBytes: ByteArray
    ): String = withContext(Dispatchers.IO) {
        val path   = "signatures/$ticketId/$type.png"
        val bucket = client.storage["ticket-photos"]
        bucket.upload(path, imageBytes) { upsert = true }
        bucket.publicUrl(path)
    }

    // Saves technician signature to ticket_signatures
    suspend fun saveTechnicianSignature(
        ticketId:     String,
        technicianId: String,
        picName:      String,           // pre-fill from customer.pic_name
        signatureUrl: String
    ) {
        client.postgrest["ticket_signatures"].upsert(
            buildJsonObject {
                put("ticket_id",                ticketId)
                put("technician_id",            technicianId)
                put("pic_name",                 picName)
                put("technician_signature_url", signatureUrl)
                put("technician_signed_at",     Clock.System.now().toString())
            }
        ) {
            // Upsert on ticket_id (UNIQUE constraint)
            onConflict = "ticket_id"
        }
    }

    // Saves PIC signature and submits the ticket
    suspend fun savePicSignatureAndSubmit(
        ticketId:    String,
        picName:     String,
        signatureUrl: String
    ) {
        // 1. Save PIC signature
        client.postgrest["ticket_signatures"]
            .update(buildJsonObject {
                put("pic_name",          picName)
                put("pic_signature_url", signatureUrl)
                put("pic_signed_at",     Clock.System.now().toString())
            }) {
                filter { eq("ticket_id", ticketId) }
            }

        // 2. Submit the ticket
        submitTicket(ticketId)
    }

    // ── Signature fetch ───────────────────────────────────────────────────────

    suspend fun getSignature(ticketId: String): TicketSignature? {
        return try {
            client.postgrest["ticket_signatures"]
                .select {
                    filter { eq("ticket_id", ticketId) }
                    limit(1)
                }
                .decodeList<TicketSignature>()
                .firstOrNull()
        } catch (e: Exception) {
            Log.e(TAG, "getSignature failed: ${e.message}")
            null
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun todayMinusDays(days: Int): String {
        val now      = Clock.System.now()
        val millis   = now.toEpochMilliseconds() - (days.toLong() * 24 * 60 * 60 * 1000)
        val instant  = kotlinx.datetime.Instant.fromEpochMilliseconds(millis)
        return instant.toString().substring(0, 10)  // "YYYY-MM-DD"
    }
}