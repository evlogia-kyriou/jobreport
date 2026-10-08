package com.milba_Ittech.jobreport.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// ─── AcUnit ───────────────────────────────────────────────────────────────────
@Serializable
data class AcUnit(
    val id:               String,
    @SerialName("ac_code")
    val acCode:           String,
    @SerialName("location_id")
    val locationId:       String,
    @SerialName("building_unit_id")
    val buildingUnitId:   String,
    @SerialName("brand_id")
    val brandId:          String,
    val type:             String,
    @SerialName("capacity_pk")
    val capacityPk:       String,
    @SerialName("unit_label")
    val unitLabel:        String  = "1",
    @SerialName("access_notes")
    val accessNotes:      String? = null,
    @SerialName("last_cleaned_at")
    val lastCleanedAt:    String? = null,
    @SerialName("is_active")
    val isActive:         Boolean = true,
    val notes:            String? = null
)

// ─── AcUnit with joined building unit (for technician screens) ─────────────────

@Serializable
data class AcUnitWithDisplay(
    val id:               String,
    @SerialName("ac_code")
    val acCode:           String,
    val type:             String,
    @SerialName("capacity_pk")
    val capacityPk:       String,
    @SerialName("unit_label")
    val unitLabel:        String  = "1",
    @SerialName("access_notes")
    val accessNotes:      String? = null,
    // Joined from building_units
    @SerialName("building_units")
    val buildingUnit:     BuildingUnitDisplay? = null
) {
    // Human-readable location label built at render time — no DB derived column
    val displayName: String get() {
        val parts = listOfNotNull(
            buildingUnit?.floor?.takeIf { it.isNotBlank() }?.let { f ->
                if (f.lowercase().startsWith("lantai")) f else "Lantai $f"
            },
            buildingUnit?.room?.takeIf { it.isNotBlank() }?.let { r ->
                if (r.lowercase().startsWith("ruang")) r else "Ruang $r"
            },
            buildingUnit?.zoneLabel?.takeIf { it.isNotBlank() }?.let { z ->
                if (z.lowercase().startsWith("zona")) z else "Zona $z"
            }
        )
        return if (parts.isNotEmpty()) parts.joinToString(" · ") else unitLabel
    }

    val label: String get() = "$acCode · $type · $capacityPk"
}

// ─── TicketAcUnit ──────────────────────────────────────────────────────────────

@Serializable
data class TicketAcUnit(
    @SerialName("order_number")
    val orderNumber:          Int,
    @SerialName("photo_unit_indoor_url")
    val photoIndoorUrl:       String? = null,
    @SerialName("photo_unit_outdoor_url")
    val photoOutdoorUrl:      String? = null,
    @SerialName("ac_units")
    val AcUnit:               AcUnitWithDisplay
)


// ─── BuildingUnit ──────────────────────────────────────────────────────────────

@Serializable
data class BuildingUnit(
    val id:           String,
    @SerialName("location_id")
    val locationId:   String,
    val zone:         String? = null,
    val floor:        String? = null,
    val room:         String? = null,
    val notes:        String? = null
)

// Minimal nested model for joins — clean values, no derived column
@Serializable
data class BuildingUnitDisplay(
    val floor:      String? = null,
    val room:       String? = null,
    @SerialName("zone_label")
    val zoneLabel:  String? = null
)