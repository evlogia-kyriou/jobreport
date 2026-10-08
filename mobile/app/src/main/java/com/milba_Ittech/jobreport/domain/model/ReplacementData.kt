package com.milba_Ittech.jobreport.domain.model

data class ReplacementData(
    val type:         String,
    val brandId:      String,
    val capacityPk:   String,
    val isNew:        Boolean,
    val mfrYear:      Int?    = null,
    val serialNumber: String? = null
)