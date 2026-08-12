package com.collegedate.app.domain.profile

import com.collegedate.app.core.common.FailureType
import com.collegedate.app.core.common.OperationResult

object ProfileValidators {
    fun validateOnboarding(
        fullName: String,
        age: String,
        university: String,
        level: String,
        gender: String,
        interests: Set<String>,
        attractionGoal: String,
        profilePhotos: List<String>,
        adultConfirmed: Boolean,
    ): OperationResult<Unit> {
        if (!adultConfirmed) return validation("Confirm that you are at least 18.")
        if (fullName.trim().length < 2) return validation("Enter your name.")
        val parsedAge = age.toIntOrNull() ?: return validation("Enter a valid age.")
        if (parsedAge < 18) return validation("You must be at least 18 to use The College Date.")
        if (!UniversityCatalog.contains(university)) return validation("Select your university from the list.")
        if (level.isBlank()) return validation("Select your academic level.")
        if (gender !in setOf("male", "female", "other")) return validation("Select your gender.")
        if (interests.size < 3) return validation("Select at least three interests.")
        if (attractionGoal !in DatingIntent.entries.map { it.backendValue }) {
            return validation("Select what you are looking for.")
        }
        if (profilePhotos.none { it.isNotBlank() }) return validation("Add at least one profile photo.")
        return OperationResult.Success(Unit)
    }

    fun validateProfileEdit(
        fullName: String,
        age: String,
        university: String,
    ): OperationResult<Unit> {
        if (fullName.trim().length < 2) return validation("Enter your name.")
        age.toIntOrNull()?.let {
            if (it < 18) return validation("Age must be 18 or older.")
        }
        if (university.isNotBlank() && !UniversityCatalog.contains(university)) {
            return validation("Select your university from the list.")
        }
        return OperationResult.Success(Unit)
    }

    private fun validation(message: String): OperationResult.Failure =
        OperationResult.Failure(FailureType.Validation, message)
}
