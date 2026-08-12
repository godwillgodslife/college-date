package com.collegedate.app.feature.matches

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.collegedate.app.core.common.OperationResult
import com.collegedate.app.data.matching.MatchingRepository
import com.collegedate.app.domain.matching.MatchedProfile
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

@HiltViewModel
class MatchedProfileViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val matchingRepository: MatchingRepository,
) : ViewModel() {
    private val profileId: String = checkNotNull(savedStateHandle["profileId"])
    private val _uiState = MutableStateFlow(MatchedProfileUiState())
    val uiState: StateFlow<MatchedProfileUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            when (val result = matchingRepository.getMatchedProfile(profileId)) {
                is OperationResult.Failure -> _uiState.update {
                    it.copy(isLoading = false, error = result.message)
                }

                is OperationResult.Success -> _uiState.update {
                    it.copy(isLoading = false, profile = result.value)
                }
            }
        }
    }
}

data class MatchedProfileUiState(
    val isLoading: Boolean = false,
    val profile: MatchedProfile? = null,
    val error: String? = null,
)
