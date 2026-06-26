package com.collegedate.prototype.data

import com.collegedate.prototype.config.AppConfig
import java.io.BufferedReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

data class NativeSession(
    val accessToken: String,
    val refreshToken: String?,
    val userId: String?,
    val email: String?
)

sealed interface AuthResult {
    data class Success(val session: NativeSession) : AuthResult
    data class Failure(val message: String) : AuthResult
}

class AuthRepository(private val config: AppConfig) {
    fun signInWithPassword(email: String, password: String): AuthResult {
        if (!config.hasSupabase) {
            return AuthResult.Failure("Supabase config is missing. Add public keys before testing auth.")
        }

        return postAuth(
            path = "/auth/v1/token?grant_type=password",
            body = JSONObject()
                .put("email", email)
                .put("password", password)
        )
    }

    fun signUp(email: String, password: String): AuthResult {
        if (!config.hasSupabase) {
            return AuthResult.Failure("Supabase config is missing. Add public keys before testing signup.")
        }

        return postAuth(
            path = "/auth/v1/signup",
            body = JSONObject()
                .put("email", email)
                .put("password", password)
        )
    }

    private fun postAuth(path: String, body: JSONObject): AuthResult {
        val connection = (URL("${config.supabaseUrl}$path").openConnection() as HttpURLConnection)
        return try {
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("apikey", config.supabaseAnonKey)
            connection.setRequestProperty("Authorization", "Bearer ${config.supabaseAnonKey}")
            connection.doOutput = true

            OutputStreamWriter(connection.outputStream).use { writer ->
                writer.write(body.toString())
            }

            val status = connection.responseCode
            val response = if (status in 200..299) {
                connection.inputStream.bufferedReader().use(BufferedReader::readText)
            } else {
                connection.errorStream?.bufferedReader()?.use(BufferedReader::readText).orEmpty()
            }

            if (status !in 200..299) {
                return AuthResult.Failure(parseError(response, status))
            }

            parseSession(response)
        } catch (error: Exception) {
            AuthResult.Failure(error.message ?: "Auth request failed.")
        } finally {
            connection.disconnect()
        }
    }

    private fun parseSession(response: String): AuthResult {
        val json = JSONObject(response)
        val accessToken = json.optString("access_token")
        val refreshToken = json.optString("refresh_token").ifBlank { null }
        val user = json.optJSONObject("user")

        if (accessToken.isBlank()) {
            return AuthResult.Failure("Supabase did not return a session. Email confirmation may be required.")
        }

        return AuthResult.Success(
            NativeSession(
                accessToken = accessToken,
                refreshToken = refreshToken,
                userId = user?.optString("id")?.ifBlank { null },
                email = user?.optString("email")?.ifBlank { null }
            )
        )
    }

    private fun parseError(response: String, status: Int): String {
        return runCatching {
            val json = JSONObject(response)
            json.optString("msg")
                .ifBlank { json.optString("message") }
                .ifBlank { json.optString("error_description") }
        }.getOrNull()?.ifBlank { null } ?: "Auth failed with HTTP $status."
    }
}
