package com.collegedate.app.domain.auth

import com.collegedate.app.core.common.OperationResult
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthValidatorsTest {
    @Test
    fun loginValidationRejectsInvalidEmail() {
        val result = AuthValidators.validateLogin("not-email", "password")
        assertTrue(result is OperationResult.Failure)
    }

    @Test
    fun loginValidationAcceptsEmailAndPassword() {
        val result = AuthValidators.validateLogin("student@example.com", "password")
        assertTrue(result is OperationResult.Success)
    }

    @Test
    fun registrationValidationRejectsShortPassword() {
        val result = AuthValidators.validateRegistration(
            email = "student@example.com",
            password = "short",
            confirmPassword = "short",
        )
        assertTrue(result is OperationResult.Failure)
    }

    @Test
    fun registrationValidationRejectsMismatchedPasswords() {
        val result = AuthValidators.validateRegistration(
            email = "student@example.com",
            password = "long-password",
            confirmPassword = "another-password",
        )
        assertTrue(result is OperationResult.Failure)
    }

    @Test
    fun registrationValidationAcceptsValidInput() {
        val result = AuthValidators.validateRegistration(
            email = "student@example.com",
            password = "long-password",
            confirmPassword = "long-password",
        )
        assertTrue(result is OperationResult.Success)
    }
}
