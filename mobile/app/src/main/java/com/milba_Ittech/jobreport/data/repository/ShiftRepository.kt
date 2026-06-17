package com.milba_Ittech.jobreport.data.repository

import android.annotation.SuppressLint
import android.content.Context
import android.util.Log
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import com.milba_Ittech.jobreport.data.SupabaseClient
import com.milba_Ittech.jobreport.domain.model.TechnicianShift
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.tasks.await
import kotlinx.datetime.Clock
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

// Replaces LocationRepository.kt for shift-start tracking
// Key changes:
//   location_logs table → removed (not in new schema)
//   GPS now only captured once at shift start ("Mulai Shift")
//   Arrival/departure stored as timestamps on tickets (no GPS)
//
// LocationRepository.kt can be deleted — its GPS capture logic
// is kept here (getCurrentLocation) for shift start only.

data class GpsLocation(
    val latitude:  Double,
    val longitude: Double,
    val accuracy:  Float
)

class ShiftRepository(private val context: Context) {

    private val client      = SupabaseClient.client
    private val fusedClient = LocationServices.getFusedLocationProviderClient(context)
    private val TAG         = "ShiftRepository"

    // ── GPS capture ───────────────────────────────────────────────────────────

    @SuppressLint("MissingPermission")
    suspend fun getCurrentLocation(): GpsLocation? {
        return try {
            val cts      = CancellationTokenSource()
            val location = fusedClient.getCurrentLocation(
                Priority.PRIORITY_BALANCED_POWER_ACCURACY,
                cts.token
            ).await()

            location?.let { GpsLocation(it.latitude, it.longitude, it.accuracy) }
        } catch (e: Exception) {
            Log.e(TAG, "GPS capture failed: ${e.message}")
            null
        }
    }

    // ── Shift start ───────────────────────────────────────────────────────────

    // Called when technician taps "Mulai Shift"
    // Captures GPS and inserts technician_shifts record
    // UNIQUE(technician_id, shift_date) — safe to call once per day
    suspend fun startShift(technicianId: String): TechnicianShift? {
        val today    = todayString()
        val location = getCurrentLocation()

        return try {
            val inserted = client.postgrest["technician_shifts"]
                .upsert(buildJsonObject {
                    put("technician_id", technicianId)
                    put("shift_date",    today)
                    put("started_at",    Clock.System.now().toString())
                    if (location != null) {
                        put("start_lat", location.latitude)
                        put("start_lng", location.longitude)
                    }
                }) {
                    onConflict = "technician_id,shift_date"
                }
                .decodeList<TechnicianShift>()
                .firstOrNull()

            Log.d(TAG, "Shift started for $technicianId on $today")
            inserted
        } catch (e: Exception) {
            Log.e(TAG, "startShift failed: ${e.message}")
            null
        }
    }

    // ── Shift query ───────────────────────────────────────────────────────────

    // Check if technician already started shift today
    suspend fun getTodayShift(technicianId: String): TechnicianShift? {
        return try {
            client.postgrest["technician_shifts"]
                .select {
                    filter {
                        eq("technician_id", technicianId)
                        eq("shift_date",    todayString())
                    }
                    limit(1)
                }
                .decodeList<TechnicianShift>()
                .firstOrNull()
        } catch (e: Exception) {
            Log.e(TAG, "getTodayShift failed: ${e.message}")
            null
        }
    }

    val shiftStartedToday: suspend (String) -> Boolean = { technicianId ->
        getTodayShift(technicianId) != null
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun todayString(): String {
        val now   = Clock.System.now()
        val local = now.toLocalDateTime(TimeZone.of("Asia/Jakarta"))
        return "${local.year}-${local.monthNumber.toString().padStart(2,'0')}-${local.dayOfMonth.toString().padStart(2,'0')}"
    }
}