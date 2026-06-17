// data/SupabaseClient.kt
package com.milba_Ittech.jobreport.data

import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime
import io.github.jan.supabase.storage.Storage

object SupabaseClient {

    // Replace these with your actual values from Supabase dashboard
    private const val SUPABASE_URL     = "https://rucevobehqghhdeztuex.supabase.co"
    private const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1Y2V2b2JlaHFnaGhkZXp0dWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjMzNTMsImV4cCI6MjA5Mzc5OTM1M30.2ybXqDrmpJDb_UU1HKU4AyaamyMWpz6EH8tDes6t_ow"

    val client = createSupabaseClient(
        supabaseUrl = SUPABASE_URL,
        supabaseKey = SUPABASE_ANON_KEY
    ) {
        install(Auth)
        install(Postgrest)
        install(Realtime)
        install(Storage)
    }
}