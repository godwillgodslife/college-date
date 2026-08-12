package com.collegedate.app.core.network

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PublicSupabaseConfigTest {
    @Test
    fun configuredWhenHttpsUrlAndAnonKeyArePresent() {
        val config = config(url = "https://pxobauvatbjncluuunyq.supabase.co", anonKey = "public-anon-key")

        assertTrue(config.isConfigured)
        assertTrue(config.isStaging)
    }

    @Test
    fun notConfiguredWhenAnonKeyIsMissing() {
        val config = config(url = "https://example.supabase.co", anonKey = "")

        assertFalse(config.isConfigured)
    }

    @Test
    fun notConfiguredWhenUrlIsNotHttps() {
        val config = config(url = "http://example.supabase.co", anonKey = "public-anon-key")

        assertFalse(config.isConfigured)
    }

    @Test
    fun productionProjectIsNotTreatedAsStaging() {
        val config = config(url = "https://gedoyoleoscgxgdqszzc.supabase.co", anonKey = "public-anon-key")

        assertFalse(config.isStaging)
    }

    private fun config(
        url: String,
        anonKey: String,
    ): PublicSupabaseConfig =
        PublicSupabaseConfig(
            url = url,
            anonKey = anonKey,
            environment = "STAGING",
            projectRef = "pxobauvatbjncluuunyq",
            showEnvironmentBadge = true,
            callbackScheme = "com.collegedate.app",
            callbackHost = "auth",
            callbackPath = "callback",
            passwordResetHost = "reset-password",
        )
}
