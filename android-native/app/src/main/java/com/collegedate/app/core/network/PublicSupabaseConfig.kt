package com.collegedate.app.core.network

data class PublicSupabaseConfig(
    val url: String,
    val anonKey: String,
    val environment: String,
    val projectRef: String,
    val showEnvironmentBadge: Boolean,
    val callbackScheme: String,
    val callbackHost: String,
    val callbackPath: String,
    val passwordResetHost: String,
) {
    val isConfigured: Boolean
        get() = url.startsWith("https://") && anonKey.isNotBlank()

    val authCallbackUrl: String
        get() = "$callbackScheme://$callbackHost/$callbackPath"

    val passwordResetCallbackUrl: String
        get() = "$callbackScheme://$passwordResetHost"

    val isStaging: Boolean
        get() = environment.equals("STAGING", ignoreCase = true) &&
            projectRef == "pxobauvatbjncluuunyq" &&
            url == "https://pxobauvatbjncluuunyq.supabase.co"
}
