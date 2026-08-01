package com.collegedate.app.core.common

object SensitiveDataRedactor {
    private val jwtPattern = Regex("""eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}""")
    private val keyValuePattern = Regex(
        pattern = """(?i)\b(password|access[_-]?token|refresh[_-]?token|supabase[_-]?anon[_-]?key|api[_-]?key)\s*[:=]\s*[^,\s}]+""",
    )

    fun redact(message: String): String =
        message
            .replace(jwtPattern, "[redacted-token]")
            .replace(keyValuePattern) { match ->
                val key = match.groupValues[1]
                "$key=[redacted]"
            }
}
