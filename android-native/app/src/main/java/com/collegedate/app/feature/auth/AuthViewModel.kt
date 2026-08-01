package com.collegedate.app.feature.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.collegedate.app.core.common.OperationResult
import com.collegedate.app.domain.auth.AuthRepository
import com.collegedate.app.domain.auth.AuthValidators
import com.collegedate.app.domain.auth.RegistrationRole
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {
    private val formState = MutableStateFlow(AuthUiState())

    val uiState = combine(
        authRepository.authState,
        formState,
    ) { authState, form ->
        form.copy(authState = authState)
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.Eagerly,
        initialValue = AuthUiState(),
    )

    init {
        viewModelScope.launch {
            authRepository.restoreSession()
        }
    }

    fun onEmailChange(value: String) {
        formState.update {
            it.copy(
                email = value,
                loginError = null,
                registrationError = null,
                passwordResetError = null,
                passwordResetSent = false,
            )
        }
    }

    fun onPasswordChange(value: String) {
        formState.update {
            it.copy(password = value, loginError = null, registrationError = null)
        }
    }

    fun onConfirmPasswordChange(value: String) {
        formState.update {
            it.copy(confirmPassword = value, registrationError = null)
        }
    }

    fun onRoleChange(role: RegistrationRole) {
        formState.update { it.copy(selectedRole = role) }
    }

    fun onReferralCodeChange(value: String) {
        formState.update { it.copy(referralCode = value) }
    }

    fun clearFormMessages() {
        formState.update {
            it.copy(
                loginError = null,
                registrationError = null,
                passwordResetError = null,
                passwordResetSent = false,
            )
        }
    }

    fun submitLogin() {
        val state = formState.value
        when (val validation = AuthValidators.validateLogin(state.email, state.password)) {
            is OperationResult.Failure -> {
                formState.update { it.copy(loginError = validation.message) }
            }

            is OperationResult.Success -> {
                viewModelScope.launch {
                    formState.update { it.copy(isSubmitting = true, loginError = null) }
                    when (val result = authRepository.login(state.email, state.password)) {
                        is OperationResult.Failure -> formState.update {
                            it.copy(isSubmitting = false, loginError = result.message)
                        }

                        is OperationResult.Success -> formState.update {
                            it.copy(isSubmitting = false, password = "")
                        }
                    }
                }
            }
        }
    }

    fun submitRegistration() {
        val state = formState.value
        when (
            val validation = AuthValidators.validateRegistration(
                email = state.email,
                password = state.password,
                confirmPassword = state.confirmPassword,
            )
        ) {
            is OperationResult.Failure -> {
                formState.update { it.copy(registrationError = validation.message) }
            }

            is OperationResult.Success -> {
                viewModelScope.launch {
                    formState.update { it.copy(isSubmitting = true, registrationError = null) }
                    when (
                        val result = authRepository.register(
                            email = state.email,
                            password = state.password,
                            role = state.selectedRole,
                            referralCode = state.referralCode,
                        )
                    ) {
                        is OperationResult.Failure -> formState.update {
                            it.copy(isSubmitting = false, registrationError = result.message)
                        }

                        is OperationResult.Success -> formState.update {
                            it.copy(isSubmitting = false, password = "", confirmPassword = "")
                        }
                    }
                }
            }
        }
    }

    fun requestPasswordReset() {
        val state = formState.value
        when (val validation = AuthValidators.validatePasswordReset(state.email)) {
            is OperationResult.Failure -> {
                formState.update { it.copy(passwordResetError = validation.message) }
            }

            is OperationResult.Success -> {
                viewModelScope.launch {
                    formState.update {
                        it.copy(isSubmitting = true, passwordResetError = null, passwordResetSent = false)
                    }
                    when (val result = authRepository.requestPasswordReset(state.email)) {
                        is OperationResult.Failure -> formState.update {
                            it.copy(isSubmitting = false, passwordResetError = result.message)
                        }

                        is OperationResult.Success -> formState.update {
                            it.copy(isSubmitting = false, passwordResetSent = true)
                        }
                    }
                }
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
        }
    }
}
