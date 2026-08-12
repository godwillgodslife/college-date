package com.collegedate.app.domain.profile

import com.collegedate.app.core.common.OperationResult
import org.junit.Assert.assertTrue
import org.junit.Test

class ProfileValidatorsTest {
    @Test
    fun onboardingRequiresAdultAge() {
        val result = validOnboarding(age = "17")

        assertTrue(result is OperationResult.Failure)
    }

    @Test
    fun onboardingRequiresCuratedUniversity() {
        val result = validOnboarding(university = "Made Up Campus")

        assertTrue(result is OperationResult.Failure)
    }

    @Test
    fun onboardingRequiresPhoto() {
        val result = validOnboarding(profilePhotos = emptyList())

        assertTrue(result is OperationResult.Failure)
    }

    @Test
    fun completeOnboardingInputPasses() {
        val result = validOnboarding()

        assertTrue(result is OperationResult.Success)
    }

    private fun validOnboarding(
        age: String = "21",
        university: String = "University of Lagos (UNILAG)",
        profilePhotos: List<String> = listOf("https://example.com/photo.jpg"),
    ) = ProfileValidators.validateOnboarding(
        fullName = "Ada Student",
        age = age,
        university = university,
        level = "300 Level",
        gender = "female",
        interests = setOf("Music", "Tech", "Foodie"),
        attractionGoal = "Serious",
        profilePhotos = profilePhotos,
        adultConfirmed = true,
    )
}
