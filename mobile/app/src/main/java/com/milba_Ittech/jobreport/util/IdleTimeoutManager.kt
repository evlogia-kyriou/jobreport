package com.milba_Ittech.jobreport.util

import androidx.compose.runtime.*
import kotlinx.coroutines.*
import kotlinx.coroutines.Job

object IdleTimeouts {
    const val PIN_REAUTH_MS = 60 * 60 * 1000L  // 1 hour
    const val PIN_OVERLAY_MS    = 30 * 60 * 1000L   // 30 minutes — show PIN re-entry
    const val SESSION_IDLE_MS   = 8 * 60 * 60 * 1000L  // 8 hours — Supabase session
}

class IdleTimeoutManager {
    private var _isLocked = mutableStateOf(false)
    val isLocked: State<Boolean> get() = _isLocked

    private var job: Job? = null

    fun onUserInteraction(scope: CoroutineScope) {
        // Reset timer on every interaction
        job?.cancel()
        if (!_isLocked.value) {
            job = scope.launch {
                delay(IdleTimeouts.PIN_OVERLAY_MS)
                _isLocked.value = true
            }
        }
    }

    fun unlock() {
        _isLocked.value = false
    }

    fun reset() {
        job?.cancel()
        _isLocked.value = false
    }

    fun lock() {
        job?.cancel()
        _isLocked.value = true
    }
}