package com.collegedate.app.core.common

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SensitiveDataRedactorTest {
    @Test
    fun redactsSensitiveAuthValues() {
        val fakeAccessToken = listOf(
            "eyJhbGciOiJIUzI1NiJ9",
            "aaaaaaaaaaaaaaaaaaaa",
            "bbbbbbbbbbbbbbbbbbbb",
        ).joinToString(".")
        val fakeAnonKey = listOf(
            "eyJhbGciOiJIUzI1NiJ9",
            "cccccccccccccccccccc",
            "dddddddddddddddddddd",
        ).joinToString(".")
        val message = """
            password=hunter2 access_token=$fakeAccessToken
            refresh_token=plain-refresh-token supabase_anon_key=$fakeAnonKey
        """.trimIndent()

        val redacted = SensitiveDataRedactor.redact(message)

        assertFalse(redacted.contains("hunter2"))
        assertFalse(redacted.contains("plain-refresh-token"))
        assertFalse(redacted.contains("aaaaaaaaaaaaaaaaaaaa"))
        assertFalse(redacted.contains("cccccccccccccccccccc"))
        assertTrue(redacted.contains("[redacted"))
    }
}
