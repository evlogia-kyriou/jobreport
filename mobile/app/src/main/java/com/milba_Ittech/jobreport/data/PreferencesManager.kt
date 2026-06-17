package com.milba_Ittech.jobreport.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.map

val Context.dataStore: DataStore<Preferences>
        by preferencesDataStore(name = "ticketreport_prefs")

class PreferencesManager(private val context: Context) {

    companion object {
        val KEY_LAST_WORKER_ID   = stringPreferencesKey("last_technician_id")
        val KEY_LAST_WORKER_NAME = stringPreferencesKey("last_technician_name")
        val KEY_ACTIVE_JOB_ID    = stringPreferencesKey("active_ticket_id")
        val KEY_LOCATION_CONSENT = booleanPreferencesKey("location_consent")
    }

    val lastTechnicianId   = context.dataStore.data.map { it[KEY_LAST_WORKER_ID] }
    val lastTechnicianName = context.dataStore.data.map { it[KEY_LAST_WORKER_NAME] }
    val activeTicketId    = context.dataStore.data.map { it[KEY_ACTIVE_JOB_ID] }
    val locationConsent = context.dataStore.data.map { it[KEY_LOCATION_CONSENT] ?: false }

    suspend fun saveLastTechnician(technicianId: String, name: String) {
        context.dataStore.edit {
            it[KEY_LAST_WORKER_ID]   = technicianId
            it[KEY_LAST_WORKER_NAME] = name
        }
    }

    suspend fun saveActiveTicketId(ticketId: String?) {
        context.dataStore.edit {
            if (ticketId != null) it[KEY_ACTIVE_JOB_ID] = ticketId
            else it.remove(KEY_ACTIVE_JOB_ID)
        }
    }

    suspend fun saveLocationConsent(granted: Boolean) {
        context.dataStore.edit { it[KEY_LOCATION_CONSENT] = granted }
    }
}