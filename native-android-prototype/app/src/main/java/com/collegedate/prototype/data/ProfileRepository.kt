package com.collegedate.prototype.data

import com.collegedate.prototype.config.AppConfig
import java.io.BufferedReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URLEncoder
import java.net.URL
import java.time.Instant
import org.json.JSONArray
import org.json.JSONObject

data class NativeProfile(
    val id: String,
    val fullName: String?,
    val age: Int?,
    val gender: String?,
    val university: String?,
    val isOnboarded: Boolean,
    val isPremium: Boolean,
    val premiumExpiresAt: String?
)

data class OnboardingDraft(
    val fullName: String,
    val age: Int,
    val university: String,
    val level: String,
    val interests: List<String>,
    val attractionGoal: String
)

sealed interface ProfileResult {
    data class Success(val profile: NativeProfile?) : ProfileResult
    data class Failure(val message: String) : ProfileResult
}

class ProfileRepository(private val config: AppConfig) {
    fun loadProfile(session: NativeSession): ProfileResult {
        val userId = session.userId
        if (userId.isNullOrBlank()) {
            return ProfileResult.Failure("Session is missing a Supabase user id.")
        }
        if (!config.hasSupabase) {
            return ProfileResult.Failure("Supabase config is missing.")
        }

        val select = "id,full_name,age,gender,university,is_onboarded,is_premium,premium_expires_at"
        val encodedSelect = URLEncoder.encode(select, Charsets.UTF_8.name())
        val encodedId = URLEncoder.encode("eq.$userId", Charsets.UTF_8.name())
        val url = "${config.supabaseUrl}/rest/v1/profiles?id=$encodedId&select=$encodedSelect&limit=1"
        val connection = (URL(url).openConnection() as HttpURLConnection)

        return try {
            connection.requestMethod = "GET"
            connection.setRequestProperty("apikey", config.supabaseAnonKey)
            connection.setRequestProperty("Authorization", "Bearer ${session.accessToken}")
            connection.setRequestProperty("Accept", "application/json")

            val status = connection.responseCode
            val response = if (status in 200..299) {
                connection.inputStream.bufferedReader().use(BufferedReader::readText)
            } else {
                connection.errorStream?.bufferedReader()?.use(BufferedReader::readText).orEmpty()
            }

            if (status !in 200..299) {
                return ProfileResult.Failure(parseError(response, status))
            }

            val rows = JSONArray(response)
            if (rows.length() == 0) {
                return ProfileResult.Success(null)
            }

            ProfileResult.Success(parseProfile(rows.getJSONObject(0)))
        } catch (error: Exception) {
            ProfileResult.Failure(error.message ?: "Profile request failed.")
        } finally {
            connection.disconnect()
        }
    }

    fun completeOnboarding(session: NativeSession, draft: OnboardingDraft): ProfileResult {
        val userId = session.userId
        if (userId.isNullOrBlank()) {
            return ProfileResult.Failure("Session is missing a Supabase user id.")
        }
        if (!config.hasSupabase) {
            return ProfileResult.Failure("Supabase config is missing.")
        }

        val body = JSONObject()
            .put("id", userId)
            .put("email", session.email)
            .put("full_name", draft.fullName)
            .put("age", draft.age)
            .put("university", draft.university)
            .put("level", draft.level)
            .put("interests", JSONArray(draft.interests))
            .put("attraction_goal", draft.attractionGoal)
            .put("is_onboarded", true)
            .put("updated_at", Instant.now().toString())

        val url = "${config.supabaseUrl}/rest/v1/profiles?on_conflict=id"
        val connection = (URL(url).openConnection() as HttpURLConnection)

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
                return ProfileResult.Failure(parseError(response, status))
            }

            val rows = JSONArray(response)
            ProfileResult.Success(if (rows.length() > 0) parseProfile(rows.getJSONObject(0)) else null)
        } catch (error: Exception) {
            ProfileResult.Failure(error.message ?: "Onboarding save failed.")
        } finally {
            connection.disconnect()
        }
    }

    private fun parseProfile(json: JSONObject): NativeProfile {
        return NativeProfile(
            id = json.optString("id"),
            fullName = json.optString("full_name").ifBlank { null },
            age = if (json.isNull("age")) null else json.optInt("age"),
            gender = json.optString("gender").ifBlank { null },
            university = json.optString("university").ifBlank { null },
            isOnboarded = json.optBoolean("is_onboarded", false),
            isPremium = json.optBoolean("is_premium", false),
            premiumExpiresAt = json.optString("premium_expires_at").ifBlank { null }
        )
    }

    private fun parseError(response: String, status: Int): String {
        return runCatching {
            val json = JSONObject(response)
            json.optString("message")
                .ifBlank { json.optString("msg") }
                .ifBlank { json.optString("hint") }
        }.getOrNull()?.ifBlank { null } ?: "Profile failed with HTTP $status."
    }
}
