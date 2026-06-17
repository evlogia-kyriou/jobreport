package com.milba_Ittech.jobreport.service

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

// LocationTechnician previously used TicketRepository to log location_logs.
// location_logs table removed from new schema.
// Periodic location tracking is no longer needed —
// GPS is only captured at shift start (ShiftRepository.startShift).
//
// This technician is kept as a stub so WorkManager registrations don't crash.
// Can be removed entirely if WorkManager enqueue for this is also removed.

class LocationTechnician(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        Log.d("LocationTechnician", "Location logging removed in v2 schema — no-op")
        return Result.success()
    }
}
