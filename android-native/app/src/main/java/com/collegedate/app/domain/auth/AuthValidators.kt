package com.collegedate.app.domain.auth

import com.collegedate.app.core.common.FailureType
import com.collegedate.app.core.common.OperationResult

object AuthValidators {
    private val emailRegex = Regex("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$")

    fun validateLogin(email: String, password: String): OperationResult<Unit> {
        val trimmedEmail = email.trim()
        return when {
            trimmedEmail.isBlank() -> validationFailure("Enter your email address.")
            !emailRegex.matches(trimmedEmail) -> validationFailure("Enter a valid email address.")
            password.isBlank() -> validationFailure("Enter your password.")
            else -> OperationResult.Success(Unit)
        }
    }

    fun validateRegistration(
        email: String,
        password: String,
        confirmPassword: String,
    ): OperationResult<Unit> {
        val trimmedEmail = email.trim()
        return when {
            trimmedEmail.isBlank() -> validationFailure("Enter your email address.")
            !emailRegex.matches(trimmedEmail) -> validationFailure("Enter a valid email address.")
            password.length < 8 -> validationFailure("Use at least 8 characters for your password.")
            password != confirmPassword -> validationFailure("Passwords do not match.")
            else -> OperationResult.Success(Unit)
        }
    }

    fun validatePasswordReset(email: String): OperationResult<Unit> {
        val trimmedEmail = email.trim()
        return when {
            trimmedEmail.isBlank() -> validationFailure("Enter your email address.")
            !emailRegex.matches(trimmedEmail) -> validationFailure("Enter a valid email address.")
            else -> OperationResult.Success(Unit)
        }
    }

    private fun validationFailure(message: String): OperationResult.Failure =
        OperationResult.Failure(FailureType.Validation, message)
}
