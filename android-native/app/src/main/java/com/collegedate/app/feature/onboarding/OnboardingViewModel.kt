package com.collegedate.app.feature.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.collegedate.app.core.common.OperationResult
import com.collegedate.app.domain.auth.AuthRepository
import com.collegedate.app.domain.auth.AuthState
import com.collegedate.app.domain.profile.EditableProfile
import com.collegedate.app.domain.profile.ProfileRepository
import com.collegedate.app.domain.profile.ProfileValidators
import com.collegedate.app.domain.profile.University
import com.collegedate.app.domain.profile.UniversityCatalog
import com.collegedate.app.domain.profile.UserProfile
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

@HiltViewModel
class OnboardingViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val profileRepository: ProfileRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(OnboardingUiState())
    val uiState: StateFlow<OnboardingUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            authRepository.authState.collect { state ->
                val userId = when (state) {
                    is AuthState.NeedsOnboarding -> state.session.userId
                    is AuthState.SignedIn -> state.session.userId
                    else -> null
                }
                if (userId != null && userId != _uiState.value.userId) {
                    _uiState.update { it.copy(userId = userId) }
                    loadProfile()
                }
            }
        }
    }

    fun loadProfile() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            when (val result = profileRepository.refreshCurrentUserProfile(_uiState.value.userId.orEmpty())) {
                is OperationResult.Failure -> _uiState.update {
                    it.copy(isLoading = false, error = result.message)
                }

                is OperationResult.Success -> _uiState.update {
                    it.copy(isLoading = false).prefill(result.value)
                }
            }
        }
    }

    fun onAdultConfirmedChange(value: Boolean) = _uiState.update {
        it.copy(adultConfirmed = value, error = null)
    }

    fun onFullNameChange(value: String) = _uiState.update { it.copy(fullName = value, error = null) }
    fun onAgeChange(value: String) = _uiState.update { it.copy(age = value.filter(Char::isDigit).take(2), error = null) }
    fun onUniversityQueryChange(value: String) = _uiState.update { it.copy(universityQuery = value, error = null) }
    fun onUniversitySelected(university: University) = _uiState.update {
        it.copy(university = university.name, universityQuery = university.name, error = null)
    }

    fun onFacultyChange(value: String) = _uiState.update { it.copy(faculty = value, error = null) }
    fun onDepartmentChange(value: String) = _uiState.update { it.copy(department = value, error = null) }
    fun onLevelSelected(value: String) = _uiState.update { it.copy(level = value, error = null) }
    fun onGenderSelected(value: String) = _uiState.update { it.copy(gender = value, error = null) }
    fun onAttractionGoalSelected(value: String) = _uiState.update { it.copy(attractionGoal = value, error = null) }

    fun showError(message: String) = _uiState.update { it.copy(error = message) }

    fun onInterestToggled(value: String) = _uiState.update { state ->
        val next = if (state.interests.contains(value)) {
            state.interests - value
        } else {
            (state.interests + value).take(10).toSet()
        }
        state.copy(interests = next, error = null)
    }

    fun onNext() {
        val state = _uiState.value
        val stepError = state.currentStepError()
        if (stepError != null) {
            _uiState.update { it.copy(error = stepError) }
            return
        }
        val nextStep = (state.currentStep + 1).coerceAtMost(state.totalSteps - 1)
        _uiState.update { it.copy(currentStep = nextStep, error = null) }
    }

    fun onBack() {
        val previousStep = (_uiState.value.currentStep - 1).coerceAtLeast(0)
        _uiState.update { it.copy(currentStep = previousStep, error = null) }
    }

    fun uploadPhoto(bytes: ByteArray, contentType: String) {
        val userId = _uiState.value.userId
        if (userId.isNullOrBlank()) {
            _uiState.update { it.copy(error = "Session is not ready. Try again.") }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isUploadingPhoto = true, error = null) }
            when (val result = profileRepository.uploadProfilePhoto(userId, bytes, contentType)) {
                is OperationResult.Failure -> _uiState.update {
                    it.copy(isUploadingPhoto = false, error = result.message)
                }

                is OperationResult.Success -> _uiState.update { state ->
                    val photos = (state.profilePhotos + result.value.url).distinct()
                    state.copy(
                        isUploadingPhoto = false,
                        profilePhotos = photos,
                        avatarUrl = state.avatarUrl ?: result.value.url,
                    )
                }
            }
        }
    }

    fun completeOnboarding() {
        val state = _uiState.value
        when (
            val validation = ProfileValidators.validateOnboarding(
                fullName = state.fullName,
                age = state.age,
                university = state.university,
                level = state.level,
                gender = state.gender,
                interests = state.interests,
                attractionGoal = state.attractionGoal,
                profilePhotos = state.profilePhotos,
                adultConfirmed = state.adultConfirmed,
            )
        ) {
            is OperationResult.Failure -> _uiState.update { it.copy(error = validation.message) }
            is OperationResult.Success -> saveCompletedProfile(state)
        }
    }

    private fun saveCompletedProfile(state: OnboardingUiState) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, error = null) }
            val editableProfile = EditableProfile(
                fullName = state.fullName,
                age = state.age.toIntOrNull(),
                gender = state.gender,
                university = state.university,
                faculty = state.faculty,
                department = state.department,
                level = state.level,
                attractionGoal = state.attractionGoal,
                interestGender = state.interestGender,
                profilePhotos = state.profilePhotos,
                photos = state.profilePhotos,
                avatarUrl = state.avatarUrl ?: state.profilePhotos.firstOrNull(),
                interests = state.interests.toList(),
                isOnboarded = true,
            )
            when (val result = profileRepository.completeOnboarding(editableProfile)) {
                is OperationResult.Failure -> _uiState.update {
                    it.copy(isSubmitting = false, error = result.message)
                }

                is OperationResult.Success -> {
                    _uiState.update { it.copy(isSubmitting = false, savedProfile = result.value) }
                    authRepository.markOnboardingComplete()
                }
            }
        }
    }
}

data class OnboardingUiState(
    val userId: String? = null,
    val currentStep: Int = 0,
    val totalSteps: Int = 5,
    val adultConfirmed: Boolean = false,
    val fullName: String = "",
    val age: String = "",
    val university: String = "",
    val universityQuery: String = "",
    val faculty: String = "",
    val department: String = "",
    val level: String = "",
    val gender: String = "",
    val interests: Set<String> = emptySet(),
    val attractionGoal: String = "",
    val interestGender: String = "All",
    val profilePhotos: List<String> = emptyList(),
    val avatarUrl: String? = null,
    val isLoading: Boolean = false,
    val isSubmitting: Boolean = false,
    val isUploadingPhoto: Boolean = false,
    val error: String? = null,
    val savedProfile: UserProfile? = null,
) {
    val visibleUniversities: List<University>
        get() = UniversityCatalog.search(universityQuery)
}

private fun OnboardingUiState.prefill(profile: UserProfile?): OnboardingUiState {
    if (profile == null) return this
    val existingPhotos = profile.photoUrls
    return copy(
        fullName = fullName.ifBlank { profile.displayName.orEmpty() },
        age = age.ifBlank { profile.age?.toString().orEmpty() },
        university = university.ifBlank { profile.university.orEmpty() },
        universityQuery = universityQuery.ifBlank { profile.university.orEmpty() },
        faculty = faculty.ifBlank { profile.faculty.orEmpty() },
        department = department.ifBlank { profile.department.orEmpty() },
        level = level.ifBlank { profile.level.orEmpty() },
        gender = gender.ifBlank { profile.gender.orEmpty().lowercase() },
        interests = if (interests.isEmpty()) profile.interests.toSet() else interests,
        attractionGoal = attractionGoal.ifBlank { profile.attractionGoal.orEmpty() },
        interestGender = interestGender.ifBlank { profile.interestGender ?: "All" },
        profilePhotos = if (profilePhotos.isEmpty()) existingPhotos else profilePhotos,
        avatarUrl = avatarUrl ?: profile.avatarUrl ?: existingPhotos.firstOrNull(),
    )
}

private fun OnboardingUiState.currentStepError(): String? =
    when (currentStep) {
        0 -> when {
            !adultConfirmed -> "Confirm that you are at least 18."
            fullName.trim().length < 2 -> "Enter your name."
            (age.toIntOrNull() ?: 0) < 18 -> "You must be at least 18 to use The College Date."
            gender.isBlank() -> "Select your gender."
            else -> null
        }

        1 -> when {
            !UniversityCatalog.contains(university) -> "Select your university from the list."
            level.isBlank() -> "Select your academic level."
            else -> null
        }

        2 -> if (interests.size < 3) "Select at least three interests." else null
        3 -> if (attractionGoal.isBlank()) "Select what you are looking for." else null
        else -> null
    }
