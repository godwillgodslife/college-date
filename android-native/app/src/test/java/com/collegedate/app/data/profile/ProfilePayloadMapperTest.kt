package com.collegedate.app.data.profile

import com.collegedate.app.domain.profile.EditableProfile
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ProfilePayloadMapperTest {
    @Test
    fun updatePayloadContainsOnlyApprovedEditableFields() {
        val payload = EditableProfile(
            fullName = "Ada Student",
            age = 21,
            university = "University of Lagos (UNILAG)",
            profilePhotos = listOf("https://example.com/photo.jpg"),
            interests = listOf("Music", "Tech", "Foodie"),
            isOnboarded = true,
        ).toUpdatePayload()

        assertTrue(payload.containsKey("full_name"))
        assertTrue(payload.containsKey("profile_photos"))
        assertTrue(payload.containsKey("is_onboarded"))
        assertFalse(payload.containsKey("is_premium"))
        assertFalse(payload.containsKey("wallet_balance"))
        assertFalse(payload.containsKey("referral_balance"))
        assertFalse(payload.containsKey("ai_review_summary"))
        assertFalse(payload.containsKey("is_admin"))
    }
}
