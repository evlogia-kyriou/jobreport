package com.milba_Ittech.jobreport.data.repository

import android.util.Log
import com.milba_Ittech.jobreport.data.SupabaseClient
import com.milba_Ittech.jobreport.domain.model.Technician
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns

// Replaces AuthRepository.kt
// Key changes:
//   table: "users" (role=technician) → "technicians"
//   model: Technician → Technician
//   email format: teknisi_{technician_id}@milba-tech.com (unchanged)
//   removed: updateFcmToken (not in new schema)
//   removed: getActiveTechnicians (not needed on mobile)

class AuthRepository {

    private val client = SupabaseClient.client
    private val TAG    = "AuthRepository"

    // ── Login ─────────────────────────────────────────────────────────────────

    suspend fun loginTechnician(technicianId: String, pin: String): Technician {
        val email = "teknisi_$technicianId@milba-tech.com"

        client.auth.signInWith(Email) {
            this.email    = email
            this.password = pin
        }

        val session = client.auth.currentSessionOrNull()
            ?: throw Exception("Login gagal — tidak ada sesi")

        return fetchTechnicianById(session.user?.id ?: "")
            ?: throw Exception("Login gagal — profil teknisi tidak ditemukan")
    }

    // ── Session restore ───────────────────────────────────────────────────────

    suspend fun restoreSession(): Technician? {
        return try {
            val session = client.auth.currentSessionOrNull()
            if (session == null) {
                Log.d(TAG, "No stored session found")
                return null
            }

            Log.d(TAG, "Session found, fetching technician profile")
            fetchTechnicianById(session.user?.id ?: "")

        } catch (e: Exception) {
            Log.w(TAG, "Session restore failed: ${e.message}")
            tryGetCachedTechnician()
        }
    }

    private suspend fun tryGetCachedTechnician(): Technician? {
        return try {
            val session  = client.auth.currentSessionOrNull() ?: return null
            val userId   = session.user?.id                   ?: return null
            val email    = session.user?.email                ?: return null

            // Extract technician_id from email: teknisi_0000001@milba-tech.com → 0000001
            val technicianId = email
                .removePrefix("teknisi_")
                .removeSuffix("@milba-tech.com")

            Log.d(TAG, "Using cached session for technician: $technicianId")

            Technician(
                id       = userId,
                name     = "Teknisi $technicianId",     // fallback — real name loads when online
                technicianId = technicianId,
                isActive = true
            )
        } catch (e: Exception) {
            Log.e(TAG, "Cached session failed: ${e.message}")
            null
        }
    }

    // ── Profile fetch ─────────────────────────────────────────────────────────

    suspend fun getCurrentTechnician(): Technician? {
        val session = client.auth.currentSessionOrNull() ?: return null
        return try {
            fetchTechnicianById(session.user?.id ?: "")
        } catch (e: Exception) {
            Log.e(TAG, "getCurrentTechnician failed: ${e.message}")
            null
        }
    }

    // Used on login screen: verify technician_id exists before PIN entry
    suspend fun findTechnicianByTechnicianId(technicianId: String): Technician? {
        return try {
            Log.d(TAG, "Looking for technician_id: $technicianId")
            val result = client.postgrest["technicians"]
                .select(Columns.list("id", "name", "technician_id", "is_active")) {
                    filter {
                        eq("technician_id", technicianId)
                        eq("is_active", true)
                    }
                    limit(1)
                }
                .decodeList<Technician>()
            Log.d(TAG, "Found ${result.size} technicians")
            result.firstOrNull()
        } catch (e: Exception) {
            Log.e(TAG, "findTechnicianByTechnicianId error: ${e.message}")
            null
        }
    }

    // ── Session management ────────────────────────────────────────────────────

    suspend fun refreshSessionIfNeeded(): Boolean {
        return try {
            client.auth.refreshCurrentSession()
            true
        } catch (e: Exception) {
            Log.w(TAG, "Token refresh failed: ${e.message}")
            false
        }
    }

    suspend fun logout() {
        client.auth.signOut()
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private suspend fun fetchTechnicianById(userId: String): Technician? {
        if (userId.isBlank()) return null
        return try {
            client.postgrest["technicians"]
                .select(Columns.list("id", "name", "technician_id", "is_active")) {
                    filter { eq("id", userId) }
                    limit(1)
                }
                .decodeList<Technician>()
                .firstOrNull()
        } catch (e: Exception) {
            Log.e(TAG, "fetchTechnicianById failed: ${e.message}")
            null
        }
    }
}