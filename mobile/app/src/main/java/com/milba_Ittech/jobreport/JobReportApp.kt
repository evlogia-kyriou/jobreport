package com.milba_Ittech.jobreport

import android.app.Application
import io.sentry.android.core.SentryAndroid

class TicketReportApp : Application() {
    override fun onCreate() {
        super.onCreate()
        SentryAndroid.init(this)
    }
}