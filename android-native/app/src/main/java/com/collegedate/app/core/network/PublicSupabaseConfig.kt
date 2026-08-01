package com.collegedate.app.core.network

data class PublicSupabaseConfig(
    val url: String,
    val anonKey: String,
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
}
