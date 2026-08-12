package com.collegedate.app.data.profile

import com.collegedate.app.domain.profile.EditableProfile
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

fun EditableProfile.toUpdatePayload(): JsonObject {
    val profile = sanitized()
    return buildJsonObject {
        profile.fullName?.takeIf { it.isNotBlank() }?.let { put("full_name", it) }
        profile.age?.let { put("age", it) }
        profile.gender?.takeIf { it.isNotBlank() }?.let { put("gender", it) }
        profile.university?.takeIf { it.isNotBlank() }?.let { put("university", it) }
        profile.bio?.let { put("bio", it) }
        profile.avatarUrl?.takeIf { it.isNotBlank() }?.let { put("avatar_url", it) }
        profile.phone?.let { put("phone", it) }
        profile.faculty?.let { put("faculty", it) }
        profile.department?.let { put("department", it) }
        profile.level?.takeIf { it.isNotBlank() }?.let { put("level", it) }
        profile.mbti?.let { put("mbti", it) }
        profile.attractionGoal?.takeIf { it.isNotBlank() }?.let { put("attraction_goal", it) }
        profile.interestGender?.takeIf { it.isNotBlank() }?.let { put("interest_gender", it) }
        profile.introPrompt?.let { put("intro_prompt", it) }
        profile.voiceIntroUrl?.let { put("voice_intro_url", it) }
        profile.anthem?.let { put("anthem", it) }
        profile.locationStatus?.let { put("location_status", it) }
        profile.photos?.let { put("photos", it.toJsonArray()) }
        profile.profilePhotos?.let { put("profile_photos", it.toJsonArray()) }
        profile.interests?.let { put("interests", it.toJsonArray()) }
        profile.isOnboarded?.let { put("is_onboarded", it) }
    }
}

private fun List<String>.toJsonArray(): JsonArray =
    JsonArray(map { JsonPrimitive(it) })
