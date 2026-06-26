package com.collegedate.prototype.config

import com.collegedate.prototype.BuildConfig

data class AppConfig(
    val supabaseUrl: String,
    val supabaseAnonKey: String,
    val revenueCatAndroidKey: String
) {
    val hasSupabase: Boolean
        get() = supabaseUrl.startsWith("https://") && supabaseAnonKey.isNotBlank()

    val hasRevenueCat: Boolean
        get() = revenueCatAndroidKey.isNotBlank() && !revenueCatAndroidKey.startsWith("test_")

    val warnings: List<String>
        get() = buildList {
            if (!hasSupabase) add("Supabase URL or anon key is missing.")
            if (revenueCatAndroidKey.startsWith("test_")) {
                add("RevenueCat Android key is a Test Store key. Do not use it for production.")
            }
            if (revenueCatAndroidKey.isBlank()) add("RevenueCat Android key is missing.")
        }
}

object ConfigProvider {
    val current: AppConfig = AppConfig(
        supabaseUrl = BuildConfig.SUPABASE_URL.trimEnd('/'),
        supabaseAnonKey = BuildConfig.SUPABASE_ANON_KEY,
        revenueCatAndroidKey = BuildConfig.REVENUECAT_ANDROID_KEY
    )
}
