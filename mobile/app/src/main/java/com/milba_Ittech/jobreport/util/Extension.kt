package com.milba_Ittech.jobreport.util

import android.content.Context
import android.widget.Toast
import java.time.LocalDateTime
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

// ── String extensions ─────────────────────────────────────────────────────────

fun String.toDisplayDate(): String {
    return try {
        val dt  = LocalDateTime.parse(this.replace("Z", "").take(19))
        val fmt = DateTimeFormatter.ofPattern("dd MMM yyyy")
        dt.format(fmt)
    } catch (e: Exception) { this }
}

fun String.toDisplayTime(): String {
    return try {
        val dt  = LocalDateTime.parse(this.replace("Z", "").take(19))
        val fmt = DateTimeFormatter.ofPattern("HH.mm")
        "${dt.format(fmt)} WIB"
    } catch (e: Exception) { this }
}

fun String.toDisplayDateTime(): String {
    return try {
        val dt  = LocalDateTime.parse(this.replace("Z", "").take(19))
        val fmt = DateTimeFormatter.ofPattern("dd MMM yyyy, HH.mm")
        "${dt.format(fmt)} WIB"
    } catch (e: Exception) { this }
}

fun String.toRelativeTime(): String {
    return try {
        val dt      = ZonedDateTime.parse(this)
        val now     = ZonedDateTime.now()
        val minutes = ChronoUnit.MINUTES.between(dt, now)

        when {
            minutes < 1    -> "Baru saja"
            minutes < 60   -> "$minutes menit yang lalu"
            minutes < 1440 -> "${minutes / 60} jam yang lalu"
            else           -> "${minutes / 1440} hari yang lalu"
        }
    } catch (e: Exception) { this }
}

fun String.isDeadlinePassed(): Boolean {
    return try {
        val dt  = LocalDateTime.parse(this.replace("Z", "").take(19))
        dt.isBefore(LocalDateTime.now())
    } catch (e: Exception) { false }
}

// ── Int extensions ────────────────────────────────────────────────────────────

fun Int.toFormattedDuration(): String {
    val hours   = this / 60
    val minutes = this % 60
    return when {
        hours == 0   -> "$minutes menit"
        minutes == 0 -> "$hours jam"
        else         -> "$hours jam $minutes menit"
    }
}

// ── Context extensions ────────────────────────────────────────────────────────

fun Context.showToast(message: String, duration: Int = Toast.LENGTH_SHORT) {
    Toast.makeText(this, message, duration).show()
}

// ── List extensions ───────────────────────────────────────────────────────────

fun <T> List<T>.safeGet(index: Int): T? {
    return if (index in indices) this[index] else null
}

// ── Ticket status extensions ─────────────────────────────────────────────────────

fun String.toTicketStatusLabel(): String = when (this) {
    "assigned"         -> "Belum dimulai"
    "in_progress"      -> "Berlangsung"
    "submitted"        -> "Dikirim"
    "pending_approval" -> "Menunggu persetujuan"
    "approved"         -> "Disetujui"
    "overdue"          -> "Terlambat"
    else               -> this
}

fun String.toAcUnitStatusLabel(): String = when (this) {
    "pending"              -> "Menunggu"
    "in_progress"          -> "Berlangsung"
    "completed"            -> "Selesai"
    "not_found"            -> "Tidak ditemukan"
    "added_by_technician"  -> "Ditambahkan teknisi"
    else                   -> this
}

fun String.toSectionLabel(): String = when (this) {
    "kedatangan"        -> "Kedatangan"
    "pencucian_indoor"  -> "Pencucian — Indoor"
    "pencucian_outdoor" -> "Pencucian — Outdoor"
    "penyelesaian"      -> "Penyelesaian"
    "laporan_kerusakan" -> "Laporan Kerusakan"
    else                -> this
}

// ── Validation extensions ─────────────────────────────────────────────────────

fun String.isValidPin(): Boolean {
    if (length != 6) return false
    if (!all { it.isDigit() }) return false
    // Reject all same digits (e.g. 111111)
    if (toSet().size == 1) return false
    return true
}

fun String.isValidTechnicianId(): Boolean {
    return matches(Regex("^W\\d{3}$"))
}