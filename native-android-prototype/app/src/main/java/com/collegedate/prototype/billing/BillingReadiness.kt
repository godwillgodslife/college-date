package com.collegedate.prototype.billing

import com.collegedate.prototype.config.ConfigProvider

object BillingReadiness {
    const val premiumEntitlement = "Premium"
    const val expectedOffering = "android_premium"
    const val expectedProduct = "premium_monthly:monthly-base"

    fun statusMessage(): String {
        val config = ConfigProvider.current
        return when {
            config.revenueCatAndroidKey.startsWith("test_") ->
                "Blocked: RevenueCat Test Store key detected."
            config.revenueCatAndroidKey.isBlank() ->
                "RevenueCat Android key missing."
            else ->
                "RevenueCat ready for offering $expectedOffering and entitlement $premiumEntitlement."
        }
    }
}
