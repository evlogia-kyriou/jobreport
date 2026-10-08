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
import kotlin.time.Duration.Companion.days
import kotlinx.datetime.Clock
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class TicketRepository {

    private val client = SupabaseClient.client
    private val TAG    = "TicketRepository"

    // ── Ticket queries ────────────────────────────────────────────────────────

    suspend fun getTechnicianTickets(technicianId: String): List<WorkTicketWithDetails> {
        return try {
            client.postgrest["tickets"]
                .select(Columns.raw("""
                    id, ticket_number, project_ticket_id, type, status,
                    customer_id, location_id, technician_id,
                    scheduled_date, scheduled_time, estimated_minutes,
                    arrival_at, departure_at, is_flagged,
                    submitted_at, approved_at, cancelled_at, notes,
                    started_at, started_by,
                    project_tickets(project_number),
                    locations(name, address, kelurahan, postal_code, access_regulations),
                    customers(pic_name)
                """.trimIndent())) {
                    filter {
                        eq("technician_id", technicianId)
                        or {
                            isIn("status", listOf("assigned", "in_progress"))
                            and {
                                eq("status", "submitted")
                                gte("scheduled_date", todayMinusDays(7))
                            }
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
                    arrival_at, departure_at, is_flagged,
                    submitted_at, approved_at, cancelled_at, notes,
                    started_at, started_by,
                    project_tickets(project_number),
                    locations(name, address, kelurahan, postal_code, access_regulations),
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

    suspend fun getTicketAcUnits(ticketId: String): List<TicketAcUnit> {
        return try {
            client.postgrest["ticket_ac_units"]
                .select(Columns.raw("""
                    order_number,
                    photo_unit_indoor_url,
                    photo_unit_outdoor_url,
                    ac_units(
                        id, ac_code, type, capacity_pk, unit_label,
                        access_notes,
                        building_units(floor, room, zone_label)
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

    suspend fun startTicket(ticketId: String, technicianId: String) {
        client.postgrest["tickets"]
            .update(buildJsonObject {
                put("status",      "in_progress")
                put("started_at",  Clock.System.now().toString())
                put("started_by",  technicianId)
            }) {
                filter { eq("id", ticketId) }
            }
    }

    suspend fun markArrival(ticketId: String) {
        client.postgrest["tickets"]
            .update(buildJsonObject {
                put("arrival_at", Clock.System.now().toString())
                put("status",     "in_progress")
            }) {
                filter { eq("id", ticketId) }
            }
    }

    suspend fun submitTicket(ticketId: String) {
        client.postgrest["tickets"]
            .update(buildJsonObject {
                put("departure_at", Clock.System.now().toString())
                put("status",       "submitted")
            }) {
                filter { eq("id", ticketId) }
            }
    }

    // ── Unit timing (Phase D) ─────────────────────────────────────────────────

    // Record when technician opens first step for a unit ✅
    // AppState.hasUnitStartBeenRecorded() prevents duplicate calls ✅
    suspend fun recordUnitStarted(
        ticketId: String,
        acUnitId: String,
    ) {
        try {
            // AppState.hasUnitStartBeenRecorded() guards against duplicate calls ✅
            // so no isNull DB filter needed here ✅
            client.postgrest["ticket_ac_units"]
                .update(buildJsonObject {
                    put("unit_started_at", Clock.System.now().toString())
                }) {
                    filter {
                        eq("ticket_id",  ticketId)
                        eq("ac_unit_id", acUnitId)
                    }
                }
        } catch (e: Exception) {
            Log.w(TAG, "recordUnitStarted failed: ${e.message}")
        }
    }

    // Record when all steps for a unit are finished ✅
    // Called from StepViewModel after markStepComplete() ✅
    suspend fun recordUnitFinished(
        ticketId: String,
        acUnitId: String,
    ) {
        try {
            // AppState.areAllUnitStepsDone() guards against duplicate calls ✅
            // so no isNull DB filter needed here ✅
            client.postgrest["ticket_ac_units"]
                .update(buildJsonObject {
                    put("unit_finished_at", Clock.System.now().toString())
                }) {
                    filter {
                        eq("ticket_id",  ticketId)
                        eq("ac_unit_id", acUnitId)
                    }
                }
        } catch (e: Exception) {
            Log.w(TAG, "recordUnitFinished failed: ${e.message}")
        }
    }

    // ── Photo upload ──────────────────────────────────────────────────────────

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

    suspend fun uploadSignature(
        ticketId:   String,
        type:       String,
        imageBytes: ByteArray
    ): String = withContext(Dispatchers.IO) {
        val path   = "signatures/$ticketId/$type.png"
        val bucket = client.storage["ticket-signatures"]
        bucket.upload(path, imageBytes) { upsert = true }
        bucket.createSignedUrl(path, 3650.days)
    }

    suspend fun saveTechnicianSignature(
        ticketId:     String,
        technicianId: String,
        picName:      String,
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
            onConflict = "ticket_id"
        }
    }

    suspend fun savePicSignatureAndSubmit(
        ticketId:    String,
        picName:     String,
        signatureUrl: String
    ) {
        client.postgrest["ticket_signatures"]
            .update(buildJsonObject {
                put("pic_name",          picName)
                put("pic_signature_url", signatureUrl)
                put("pic_signed_at",     Clock.System.now().toString())
            }) {
                filter { eq("ticket_id", ticketId) }
            }
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

    // ── Project final signature ───────────────────────────────────────────────

    suspend fun checkAllTicketsSubmitted(projectId: String): Boolean {
        return try {
            val rows = client.postgrest["tickets"]
                .select(Columns.raw("id, status")) {
                    filter { eq("project_ticket_id", projectId) }
                }
                .decodeList<TicketStatusRow>()
            rows.isNotEmpty() && rows.all { it.status in listOf("submitted", "approved") }
        } catch (e: Exception) {
            Log.e(TAG, "checkAllTicketsSubmitted failed: ${e.message}")
            false
        }
    }

    suspend fun saveProjectFinalSignature(
        projectId:      String,
        technicianId:   String,
        picName:        String,
        signatureBytes: ByteArray
    ) {
        val path   = "signatures/project/$projectId/final_pic.png"
        val bucket = client.storage["ticket-signatures"]
        bucket.upload(path, signatureBytes) { upsert = true }
        val url    = bucket.createSignedUrl(path, 3650.days)

        client.postgrest["project_tickets"]
            .update(buildJsonObject {
                put("final_pic_signature_url",       url)
                put("final_pic_name",                picName)
                put("final_pic_signed_at",           Clock.System.now().toString())
                put("final_signed_collected_by",     technicianId)
                put("status",                        "awaiting_final_signature")
            }) {
                filter { eq("id", projectId) }
            }
    }

    // ── Unit identity photo upload ────────────────────────────────────────────

    suspend fun uploadUnitPhoto(
        ticketId:   String,
        acUnitId:   String,
        side:       String,
        imageBytes: ByteArray
    ): String = withContext(Dispatchers.IO) {
        val path   = "unit-photos/$ticketId/$acUnitId/$side.jpg"
        val bucket = client.storage["ticket-photos"]
        bucket.upload(path, imageBytes) { upsert = true }
        bucket.publicUrl(path)
    }

    suspend fun saveUnitPhotos(
        ticketId:    String,
        acUnitId:    String,
        indoorUrl:   String,
        outdoorUrl:  String
    ) {
        client.postgrest["ticket_ac_units"]
            .update(buildJsonObject {
                put("photo_unit_indoor_url",  indoorUrl)
                put("photo_unit_outdoor_url", outdoorUrl)
            }) {
                filter {
                    eq("ticket_id",  ticketId)
                    eq("ac_unit_id", acUnitId)
                }
            }
    }

    // ── Flag unit replacement ─────────────────────────────────────────────────

    suspend fun flagUnitReplacement(ticketId: String, acUnitId: String) {
        client.postgrest["ticket_flags"].insert(
            buildJsonObject {
                put("ticket_id", ticketId)
                put("flag_type", "unit_replacement")
            }
        )
    }

    suspend fun saveReplacementData(
        ticketId:     String,
        acUnitId:     String,
        type:         String,
        brandId:      String,
        capacityPk:   String,
        isNew:        Boolean,
        mfrYear:      Int?,
        serialNumber: String?,
        indoorUrl:    String?,
        outdoorUrl:   String?
    ) {
        client.postgrest["ticket_ac_units"]
            .update(buildJsonObject {
                put("replacement_type",              type)
                put("replacement_brand_id",          brandId)
                put("replacement_capacity_pk",       capacityPk)
                put("replacement_is_new",            isNew)
                if (mfrYear      != null) put("replacement_mfr_year",        mfrYear)
                if (serialNumber != null) put("replacement_serial_number",    serialNumber)
                if (indoorUrl    != null) put("replacement_photo_indoor_url",  indoorUrl)
                if (outdoorUrl   != null) put("replacement_photo_outdoor_url", outdoorUrl)
            }) {
                filter {
                    eq("ticket_id",  ticketId)
                    eq("ac_unit_id", acUnitId)
                }
            }
    }

    // ── History tickets ───────────────────────────────────────────────────────

    suspend fun getHistoryTickets(technicianId: String): List<WorkTicketWithDetails> {
        return try {
            client.postgrest["tickets"]
                .select(Columns.raw("""
                    id, ticket_number, project_ticket_id, type, status,
                    customer_id, location_id, technician_id,
                    scheduled_date, scheduled_time, estimated_minutes,
                    arrival_at, departure_at, is_flagged,
                    submitted_at, approved_at, cancelled_at, notes,
                    started_at, started_by,
                    project_tickets(project_number),
                    locations(name, address, kelurahan, postal_code, access_regulations),
                    customers(pic_name)
                """.trimIndent())) {
                    filter {
                        eq("technician_id", technicianId)
                        isIn("status", listOf("submitted", "approved"))
                    }
                    order("scheduled_date", Order.DESCENDING)
                }
                .decodeList<WorkTicketWithDetails>()
        } catch (e: Exception) {
            Log.e(TAG, "getHistoryTickets failed: ${e.message}")
            emptyList()
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun todayMinusDays(days: Int): String {
        val now     = Clock.System.now()
        val millis  = now.toEpochMilliseconds() - (days.toLong() * 24 * 60 * 60 * 1000)
        val instant = kotlinx.datetime.Instant.fromEpochMilliseconds(millis)
        return instant.toString().substring(0, 10)
    }
}