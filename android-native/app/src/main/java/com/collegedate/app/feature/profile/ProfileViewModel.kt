package com.collegedate.app.feature.profile

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
class ProfileViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val profileRepository: ProfileRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            authRepository.authState.collect { authState ->
                val userId = when (authState) {
                    is AuthState.SignedIn -> authState.session.userId
                    is AuthState.NeedsOnboarding -> authState.session.userId
                    else -> null
                }
                if (userId != null && userId != _uiState.value.userId) {
                    _uiState.update { it.copy(userId = userId) }
                    refresh()
                }
            }
        }
    }

    fun refresh() {
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

    fun onFullNameChange(value: String) = _uiState.update { it.copy(fullName = value, error = null, savedMessage = null) }
    fun onAgeChange(value: String) = _uiState.update { it.copy(age = value.filter(Char::isDigit).take(2), error = null) }
    fun onBioChange(value: String) = _uiState.update { it.copy(bio = value.take(300), error = null) }
    fun onUniversityQueryChange(value: String) = _uiState.update { it.copy(universityQuery = value, error = null) }
    fun onUniversitySelected(university: University) = _uiState.update {
        it.copy(university = university.name, universityQuery = university.name, error = null)
    }

    fun onFacultyChange(value: String) = _uiState.update { it.copy(faculty = value, error = null) }
    fun onDepartmentChange(value: String) = _uiState.update { it.copy(department = value, error = null) }
    fun onLevelSelected(value: String) = _uiState.update { it.copy(level = value, error = null) }
    fun onGenderSelected(value: String) = _uiState.update { it.copy(gender = value, error = null) }
    fun onInterestGenderSelected(value: String) = _uiState.update { it.copy(interestGender = value, error = null) }
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

    fun removePhoto(url: String) = _uiState.update { state ->
        val next = state.profilePhotos.filterNot { it == url }
        state.copy(profilePhotos = next, avatarUrl = next.firstOrNull())
    }

    fun saveProfile() {
        val state = _uiState.value
        when (
            val validation = ProfileValidators.validateProfileEdit(
                fullName = state.fullName,
                age = state.age,
                university = state.university,
            )
        ) {
            is OperationResult.Failure -> _uiState.update { it.copy(error = validation.message) }
            is OperationResult.Success -> viewModelScope.launch {
                _uiState.update { it.copy(isSaving = true, error = null, savedMessage = null) }
                val update = EditableProfile(
                    fullName = state.fullName,
                    age = state.age.toIntOrNull(),
                    gender = state.gender,
                    university = state.university,
                    bio = state.bio,
                    avatarUrl = state.avatarUrl ?: state.profilePhotos.firstOrNull(),
                    faculty = state.faculty,
                    department = state.department,
                    level = state.level,
                    attractionGoal = state.attractionGoal,
                    interestGender = state.interestGender,
                    profilePhotos = state.profilePhotos,
                    photos = state.profilePhotos,
                    interests = state.interests.toList(),
                    isOnboarded = state.profile?.isOnboarded,
                )
                when (val result = profileRepository.updateCurrentProfile(update)) {
                    is OperationResult.Failure -> _uiState.update {
                        it.copy(isSaving = false, error = result.message)
                    }

                    is OperationResult.Success -> _uiState.update {
                        it.copy(isSaving = false, savedMessage = "Profile saved.").prefill(result.value)
                    }
                }
            }
        }
    }
}

data class ProfileUiState(
    val userId: String? = null,
    val profile: UserProfile? = null,
    val fullName: String = "",
    val age: String = "",
    val gender: String = "",
    val university: String = "",
    val universityQuery: String = "",
    val bio: String = "",
    val faculty: String = "",
    val department: String = "",
    val level: String = "",
    val attractionGoal: String = "",
    val interestGender: String = "All",
    val interests: Set<String> = emptySet(),
    val profilePhotos: List<String> = emptyList(),
    val avatarUrl: String? = null,
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val isUploadingPhoto: Boolean = false,
    val error: String? = null,
    val savedMessage: String? = null,
) {
    val visibleUniversities: List<University>
        get() = UniversityCatalog.search(universityQuery)
}

private fun ProfileUiState.prefill(profile: UserProfile?): ProfileUiState {
    if (profile == null) return this
    val photos = profile.photoUrls
    return copy(
        profile = profile,
        fullName = profile.displayName.orEmpty(),
        age = profile.age?.toString().orEmpty(),
        gender = profile.gender.orEmpty().lowercase(),
        university = profile.university.orEmpty(),
        universityQuery = profile.university.orEmpty(),
        bio = profile.bio.orEmpty(),
        faculty = profile.faculty.orEmpty(),
        department = profile.department.orEmpty(),
        level = profile.level.orEmpty(),
        attractionGoal = profile.attractionGoal.orEmpty(),
        interestGender = profile.interestGender ?: "All",
        interests = profile.interests.toSet(),
        profilePhotos = photos,
        avatarUrl = profile.avatarUrl ?: photos.firstOrNull(),
    )
}
