package com.milba_Ittech.jobreport.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// Replaces Technician.kt
// Table: technicians
// Auth email: teknisi_{technician_id}@milba-tech.com

@Serializable
data class Technician(
    val id:        String,
    val name:      String,
    @SerialName("technician_id")
    val technicianId:  String,
    val phone:     String                = "",
    val address:   String?               = null,
    val skills:    List<String>          = listOf("cleaning"),
    @SerialName("is_active")
    val isActive:  Boolean               = true
)