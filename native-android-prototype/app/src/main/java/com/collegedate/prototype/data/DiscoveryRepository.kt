package com.collegedate.prototype.data

import com.collegedate.prototype.config.AppConfig
import java.io.BufferedReader
import java.net.HttpURLConnection
import java.net.URLEncoder
import java.net.URL
import org.json.JSONArray
import org.json.JSONObject

data class DiscoveryCandidate(
    val id: String,
    val fullName: String?,
    val age: Int?,
    val gender: String?,
    val university: String?,
    val bio: String?,
    val avatarUrl: String?,
    val attractionGoal: String?,
    val completionScore: Int?,
    val lastSeenAt: String?
)

sealed interface DiscoveryResult {
    data class Success(val candidates: List<DiscoveryCandidate>) : DiscoveryResult
    data class Failure(val message: String) : DiscoveryResult
}

class DiscoveryRepository(private val config: AppConfig) {
    fun loadCandidates(session: NativeSession, profile: NativeProfile): DiscoveryResult {
        if (!config.hasSupabase) {
            return DiscoveryResult.Failure("Supabase config is missing.")
        }

        val select = listOf(
            "id",
            "full_name",
            "age",
            "gender",
            "university",
            "bio",
            "avatar_url",
            "attraction_goal",
            "completion_score",
            "last_seen_at"
        ).joinToString(",")

        val query = buildList {
            add("select=${encode(select)}")
            add("id=neq.${encode(profile.id)}")
            add("limit=20")
            add("order=completion_score.desc.nullslast")
        }.joinToString("&")

        val connection = (URL("${config.supabaseUrl}/rest/v1/discovery_feed_v3?$query")
            .openConnection() as HttpURLConnection)

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
                return DiscoveryResult.Failure(parseError(response, status))
            }

            val rows = JSONArray(response)
            val candidates = (0 until rows.length())
                .map { parseCandidate(rows.getJSONObject(it)) }
                .let { prioritize(profile, it) }

            DiscoveryResult.Success(candidates)
        } catch (error: Exception) {
            DiscoveryResult.Failure(error.message ?: "Discovery request failed.")
        } finally {
            connection.disconnect()
        }
    }

    private fun prioritize(profile: NativeProfile, candidates: List<DiscoveryCandidate>): List<DiscoveryCandidate> {
        val gender = profile.gender?.lowercase() ?: return candidates
        val opposite = when (gender) {
            "male" -> "female"
            "female" -> "male"
            else -> null
        } ?: return candidates

        val preferred = candidates.filter { it.gender?.lowercase() == opposite }
        val others = candidates.filterNot { it.gender?.lowercase() == opposite }
        return preferred + others
    }

    private fun parseCandidate(json: JSONObject): DiscoveryCandidate {
        return DiscoveryCandidate(
            id = json.optString("id"),
            fullName = json.optString("full_name").ifBlank { null },
            age = if (json.isNull("age")) null else json.optInt("age"),
            gender = json.optString("gender").ifBlank { null },
            university = json.optString("university").ifBlank { null },
            bio = json.optString("bio").ifBlank { null },
            avatarUrl = json.optString("avatar_url").ifBlank { null },
            attractionGoal = json.optString("attraction_goal").ifBlank { null },
            completionScore = if (json.isNull("completion_score")) null else json.optInt("completion_score"),
            lastSeenAt = json.optString("last_seen_at").ifBlank { null }
        )
    }

    private fun parseError(response: String, status: Int): String {
        return runCatching {
            val json = JSONObject(response)
            json.optString("message")
                .ifBlank { json.optString("msg") }
                .ifBlank { json.optString("hint") }
        }.getOrNull()?.ifBlank { null } ?: "Discovery failed with HTTP $status."
    }

    private fun encode(value: String): String = URLEncoder.encode(value, Charsets.UTF_8.name())
}
