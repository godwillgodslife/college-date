package com.collegedate.prototype.data

import com.collegedate.prototype.config.AppConfig
import java.io.BufferedReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant
import org.json.JSONArray
import org.json.JSONObject

enum class SwipeDirection(val wireValue: String) {
    Left("left"),
    Right("right")
}

sealed interface SwipeResult {
    data class Success(val candidateId: String, val direction: SwipeDirection) : SwipeResult
    data class Failure(val message: String) : SwipeResult
}

class SwipeRepository(private val config: AppConfig) {
    fun recordSwipe(
        session: NativeSession,
        profile: NativeProfile,
        candidateId: String,
        direction: SwipeDirection
    ): SwipeResult {
        if (!config.hasSupabase) {
            return SwipeResult.Failure("Supabase config is missing.")
        }

        val isPremiumStandardLike = direction == SwipeDirection.Right && profile.isPremium
        val body = JSONObject()
            .put("swiper_id", profile.id)
            .put("swiped_id", candidateId)
            .put("direction", direction.wireValue)
            .put("type", "standard")
            .put("status", if (direction == SwipeDirection.Right) "pending" else "declined")
            .put("is_priority", false)
            .put("is_free", isPremiumStandardLike)
            .put("created_at", Instant.now().toString())

        val connection = (URL("${config.supabaseUrl}/rest/v1/swipes?on_conflict=swiper_id,swiped_id")
            .openConnection() as HttpURLConnection)

        return try {
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Accept", "application/json")
            connection.setRequestProperty("Prefer", "resolution=merge-duplicates,return=representation")
            connection.setRequestProperty("apikey", config.supabaseAnonKey)
            connection.setRequestProperty("Authorization", "Bearer ${session.accessToken}")
            connection.doOutput = true

            OutputStreamWriter(connection.outputStream).use { writer ->
                writer.write(JSONArray().put(body).toString())
            }

            val status = connection.responseCode
            val response = if (status in 200..299) {
                connection.inputStream.bufferedReader().use(BufferedReader::readText)
            } else {
                connection.errorStream?.bufferedReader()?.use(BufferedReader::readText).orEmpty()
            }

            if (status !in 200..299) {
                return SwipeResult.Failure(parseError(response, status))
            }

            SwipeResult.Success(candidateId, direction)
        } catch (error: Exception) {
            SwipeResult.Failure(error.message ?: "Swipe request failed.")
        } finally {
            connection.disconnect()
        }
    }

    private fun parseError(response: String, status: Int): String {
        return runCatching {
            val json = JSONObject(response)
            json.optString("message")
                .ifBlank { json.optString("msg") }
                .ifBlank { json.optString("hint") }
        }.getOrNull()?.ifBlank { null } ?: "Swipe failed with HTTP $status."
    }
}
