package com.collegedate.prototype

import android.app.Application
import android.util.Log
import com.collegedate.prototype.config.ConfigProvider
import com.revenuecat.purchases.LogLevel
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesConfiguration

class CollegeDatePrototypeApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        val config = ConfigProvider.current
        if (!config.hasRevenueCat) {
            Log.w("CollegeDatePrototype", "RevenueCat not configured for native prototype.")
            return
        }

        Purchases.logLevel = if (BuildConfig.DEBUG) LogLevel.DEBUG else LogLevel.WARN
        Purchases.configure(
            PurchasesConfiguration.Builder(this, config.revenueCatAndroidKey)
                .appUserID(null)
                .build()
        )
    }
}
