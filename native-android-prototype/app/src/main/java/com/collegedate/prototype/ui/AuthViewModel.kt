package com.collegedate.prototype.ui

import android.app.Application
import android.app.Activity
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.collegedate.prototype.billing.BillingRepository
import com.collegedate.prototype.billing.BillingResult
import com.collegedate.prototype.billing.PremiumState
import com.collegedate.prototype.config.ConfigProvider
import com.collegedate.prototype.data.AuthRepository
import com.collegedate.prototype.data.AuthResult
import com.collegedate.prototype.data.ChatRepository
import com.collegedate.prototype.data.ChatMessage
import com.collegedate.prototype.data.ChatMutationResult
import com.collegedate.prototype.data.ConversationPreview
import com.collegedate.prototype.data.ConversationsResult
import com.collegedate.prototype.data.DiscoveryCandidate
import com.collegedate.prototype.data.DiscoveryRepository
import com.collegedate.prototype.data.DiscoveryResult
import com.collegedate.prototype.data.NativeSession
import com.collegedate.prototype.data.NativeProfile
import com.collegedate.prototype.data.MessagesResult
import com.collegedate.prototype.data.OnboardingDraft
import com.collegedate.prototype.data.ProfileRepository
import com.collegedate.prototype.data.ProfileResult
import com.collegedate.prototype.data.SessionStore
import com.collegedate.prototype.data.SendMessageResult
import com.collegedate.prototype.data.SwipeDirection
import com.collegedate.prototype.data.SwipeRepository
import com.collegedate.prototype.data.SwipeResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AuthUiState(
    val email: String = "",
    val password: String = "",
    val loading: Boolean = false,
    val profileLoading: Boolean = false,
    val discoveryLoading: Boolean = false,
    val conversationsLoading: Boolean = false,
    val messagesLoading: Boolean = false,
    val premiumLoading: Boolean = false,
    val premiumState: PremiumState? = null,
    val sendingMessage: Boolean = false,
    val swipeLoadingIds: Set<String> = emptySet(),
    val lastSwipeMessage: String? = null,
    val error: String? = null,
    val session: NativeSession? = null,
    val profile: NativeProfile? = null,
    val candidates: List<DiscoveryCandidate> = emptyList(),
    val conversations: List<ConversationPreview> = emptyList(),
    val selectedConversationId: String? = null,
    val selectedMessages: List<ChatMessage> = emptyList(),
    val messageDraft: String = "",
    val onboardingName: String = "",
    val onboardingAge: String = "",
    val onboardingUniversity: String = "",
    val onboardingLevel: String = "",
    val onboardingInterests: String = "",
    val onboardingGoal: String = "Serious",
    val warnings: List<String> = ConfigProvider.current.warnings
)

class AuthViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = AuthRepository(ConfigProvider.current)
    private val profileRepository = ProfileRepository(ConfigProvider.current)
    private val discoveryRepository = DiscoveryRepository(ConfigProvider.current)
    private val swipeRepository = SwipeRepository(ConfigProvider.current)
    private val chatRepository = ChatRepository(ConfigProvider.current)
    private val billingRepository = BillingRepository()
    private val sessionStore = SessionStore(application)
    private val mutableState = MutableStateFlow(AuthUiState())
    val state: StateFlow<AuthUiState> = mutableState

    init {
        restoreSession()
    }

    fun updateEmail(value: String) {
        mutableState.update { it.copy(email = value, error = null) }
    }

    fun updatePassword(value: String) {
        mutableState.update { it.copy(password = value, error = null) }
    }

    fun updateOnboardingName(value: String) {
        mutableState.update { it.copy(onboardingName = value, error = null) }
    }

    fun updateOnboardingAge(value: String) {
        mutableState.update { it.copy(onboardingAge = value.filter(Char::isDigit).take(2), error = null) }
    }

    fun updateOnboardingUniversity(value: String) {
        mutableState.update { it.copy(onboardingUniversity = value, error = null) }
    }

    fun updateOnboardingLevel(value: String) {
        mutableState.update { it.copy(onboardingLevel = value, error = null) }
    }

    fun updateOnboardingInterests(value: String) {
        mutableState.update { it.copy(onboardingInterests = value, error = null) }
    }

    fun updateOnboardingGoal(value: String) {
        mutableState.update { it.copy(onboardingGoal = value, error = null) }
    }

    fun signIn() {
        submit { email, password -> repository.signInWithPassword(email, password) }
    }

    fun signUp() {
        submit { email, password -> repository.signUp(email, password) }
    }

    fun logout() {
        sessionStore.clear()
        mutableState.update {
            it.copy(
                session = null,
                profile = null,
                password = "",
                error = null,
                premiumState = null,
                candidates = emptyList(),
                conversations = emptyList(),
                selectedConversationId = null,
                selectedMessages = emptyList(),
                messageDraft = "",
                lastSwipeMessage = null,
                swipeLoadingIds = emptySet()
            )
        }
        viewModelScope.launch(Dispatchers.IO) {
            billingRepository.logoutUser()
        }
    }

    fun completeOnboarding() {
        val snapshot = mutableState.value
        val session = snapshot.session
        if (session == null) {
            mutableState.update { it.copy(error = "Sign in before completing onboarding.") }
            return
        }

        val age = snapshot.onboardingAge.toIntOrNull()
        if (snapshot.onboardingName.trim().length < 2 || age == null || age < 18) {
            mutableState.update { it.copy(error = "Enter your name and an age of at least 18.") }
            return
        }
        if (snapshot.onboardingUniversity.trim().isBlank() || snapshot.onboardingLevel.trim().isBlank()) {
            mutableState.update { it.copy(error = "University and level are required.") }
            return
        }

        val interests = snapshot.onboardingInterests
            .split(",")
            .map { it.trim() }
            .filter { it.isNotBlank() }
            .take(10)

        if (interests.size < 3) {
            mutableState.update { it.copy(error = "Add at least 3 comma-separated interests.") }
            return
        }

        val draft = OnboardingDraft(
            fullName = snapshot.onboardingName.trim(),
            age = age,
            university = snapshot.onboardingUniversity.trim(),
            level = snapshot.onboardingLevel.trim(),
            interests = interests,
            attractionGoal = snapshot.onboardingGoal.ifBlank { "Serious" }
        )

        mutableState.update { it.copy(profileLoading = true, error = null) }
        viewModelScope.launch(Dispatchers.IO) {
            when (val result = profileRepository.completeOnboarding(session, draft)) {
                is ProfileResult.Success -> mutableState.update {
                    it.copy(profileLoading = false, profile = result.profile)
                }.also {
                    result.profile?.let { profile ->
                        if (profile.isOnboarded) {
                            loadDiscovery(session, profile)
                            loadConversations(session, profile)
                        }
                    }
                }
                is ProfileResult.Failure -> mutableState.update {
                    it.copy(profileLoading = false, error = result.message)
                }
            }
        }
    }

    private fun submit(action: (String, String) -> AuthResult) {
        val snapshot = mutableState.value
        if (snapshot.email.isBlank() || snapshot.password.length < 6) {
            mutableState.update { it.copy(error = "Enter a valid email and at least 6 password characters.") }
            return
        }

        mutableState.update { it.copy(loading = true, error = null) }
        viewModelScope.launch(Dispatchers.IO) {
            when (val result = action(snapshot.email.trim(), snapshot.password)) {
                is AuthResult.Success -> {
                    sessionStore.save(result.session)
                    mutableState.update {
                        it.copy(loading = false, session = result.session, password = "")
                    }
                    identifyRevenueCat(result.session)
                    loadProfile(result.session)
                }
                is AuthResult.Failure -> mutableState.update {
                    it.copy(loading = false, error = result.message)
                }
            }
        }
    }

    private fun restoreSession() {
        viewModelScope.launch(Dispatchers.IO) {
            val session = runCatching { sessionStore.load() }.getOrNull()
            if (session != null) {
                mutableState.update { it.copy(session = session, profileLoading = true) }
                identifyRevenueCat(session)
                loadProfile(session)
            }
        }
    }

    private fun loadProfile(session: NativeSession) {
        mutableState.update { it.copy(profileLoading = true, error = null) }
        when (val result = profileRepository.loadProfile(session)) {
            is ProfileResult.Success -> mutableState.update {
                it.copy(profileLoading = false, profile = result.profile)
            }.also {
                val profile = result.profile
                if (profile?.isOnboarded == true) {
                    loadDiscovery(session, profile)
                    loadConversations(session, profile)
                }
            }
            is ProfileResult.Failure -> mutableState.update {
                it.copy(profileLoading = false, error = result.message)
            }
        }
    }

    fun refreshDiscovery() {
        val snapshot = mutableState.value
        val session = snapshot.session ?: return
        val profile = snapshot.profile ?: return
        loadDiscovery(session, profile)
    }

    fun refreshConversations() {
        val snapshot = mutableState.value
        val session = snapshot.session ?: return
        val profile = snapshot.profile ?: return
        loadConversations(session, profile)
    }

    fun refreshPremiumState() {
        mutableState.update { it.copy(premiumLoading = true, error = null) }
        viewModelScope.launch(Dispatchers.IO) {
            when (val result = billingRepository.loadPremiumState()) {
                is BillingResult.Success -> mutableState.update {
                    it.copy(premiumLoading = false, premiumState = result.state)
                }
                is BillingResult.Failure -> mutableState.update {
                    it.copy(premiumLoading = false, error = result.message)
                }
            }
        }
    }

    fun restorePremiumPurchases() {
        val session = mutableState.value.session
        mutableState.update { it.copy(premiumLoading = true, error = null) }
        viewModelScope.launch(Dispatchers.IO) {
            when (val result = billingRepository.restorePurchases()) {
                is BillingResult.Success -> mutableState.update {
                    it.copy(premiumLoading = false, premiumState = result.state)
                }.also {
                    session?.let { activeSession -> loadProfile(activeSession) }
                }
                is BillingResult.Failure -> mutableState.update {
                    it.copy(premiumLoading = false, error = result.message)
                }
            }
        }
    }

    fun purchaseMonthlyPremium(activity: Activity) {
        val session = mutableState.value.session
        mutableState.update { it.copy(premiumLoading = true, error = null) }
        viewModelScope.launch(Dispatchers.IO) {
            when (val result = billingRepository.purchaseMonthlyPremium(activity)) {
                is BillingResult.Success -> mutableState.update {
                    it.copy(premiumLoading = false, premiumState = result.state)
                }.also {
                    session?.let { activeSession -> loadProfile(activeSession) }
                }
                is BillingResult.Failure -> mutableState.update {
                    it.copy(premiumLoading = false, error = result.message)
                }
            }
        }
    }

    fun openConversation(matchId: String) {
        val snapshot = mutableState.value
        val session = snapshot.session ?: return
        mutableState.update {
            it.copy(selectedConversationId = matchId, selectedMessages = emptyList(), messagesLoading = true, error = null)
        }
        loadMessages(session, matchId)
        markConversationRead(session, matchId)
    }

    fun closeConversation() {
        mutableState.update { it.copy(selectedConversationId = null, selectedMessages = emptyList(), messagesLoading = false) }
    }

    fun refreshSelectedConversationMessages() {
        val snapshot = mutableState.value
        val session = snapshot.session ?: return
        val matchId = snapshot.selectedConversationId ?: return
        mutableState.update { it.copy(messagesLoading = true, error = null) }
        loadMessages(session, matchId)
        markConversationRead(session, matchId)
    }

    fun updateMessageDraft(value: String) {
        mutableState.update { it.copy(messageDraft = value, error = null) }
    }

    fun sendSelectedConversationMessage() {
        val snapshot = mutableState.value
        val session = snapshot.session
        val matchId = snapshot.selectedConversationId
        val content = snapshot.messageDraft.trim()
        if (session == null || matchId == null) {
            mutableState.update { it.copy(error = "Open a conversation before sending.") }
            return
        }
        if (content.isBlank()) return
        if (snapshot.sendingMessage) return

        mutableState.update { it.copy(sendingMessage = true, error = null) }
        viewModelScope.launch(Dispatchers.IO) {
            when (val result = chatRepository.sendTextMessage(session, matchId, content)) {
                is SendMessageResult.Success -> mutableState.update {
                    it.copy(
                        sendingMessage = false,
                        messageDraft = "",
                        selectedMessages = it.selectedMessages + result.message
                    )
                }.also {
                    val profile = mutableState.value.profile
                    if (profile != null) loadConversations(session, profile)
                }
                is SendMessageResult.Failure -> mutableState.update {
                    it.copy(sendingMessage = false, error = result.message)
                }
            }
        }
    }

    fun passCandidate(candidateId: String) {
        recordCandidateSwipe(candidateId, SwipeDirection.Left)
    }

    fun likeCandidate(candidateId: String) {
        recordCandidateSwipe(candidateId, SwipeDirection.Right)
    }

    private fun loadDiscovery(session: NativeSession, profile: NativeProfile) {
        mutableState.update { it.copy(discoveryLoading = true, error = null) }
        viewModelScope.launch(Dispatchers.IO) {
            when (val result = discoveryRepository.loadCandidates(session, profile)) {
                is DiscoveryResult.Success -> mutableState.update {
                    it.copy(discoveryLoading = false, candidates = result.candidates)
                }
                is DiscoveryResult.Failure -> mutableState.update {
                    it.copy(discoveryLoading = false, error = result.message)
                }
            }
        }
    }

    private fun loadConversations(session: NativeSession, profile: NativeProfile) {
        mutableState.update { it.copy(conversationsLoading = true, error = null) }
        viewModelScope.launch(Dispatchers.IO) {
            when (val result = chatRepository.loadConversations(session, profile)) {
                is ConversationsResult.Success -> mutableState.update {
                    it.copy(conversationsLoading = false, conversations = result.conversations)
                }
                is ConversationsResult.Failure -> mutableState.update {
                    it.copy(conversationsLoading = false, error = result.message)
                }
            }
        }
    }

    private fun loadMessages(session: NativeSession, matchId: String) {
        viewModelScope.launch(Dispatchers.IO) {
            when (val result = chatRepository.loadMessages(session, matchId)) {
                is MessagesResult.Success -> mutableState.update {
                    it.copy(messagesLoading = false, selectedMessages = result.messages)
                }
                is MessagesResult.Failure -> mutableState.update {
                    it.copy(messagesLoading = false, error = result.message)
                }
            }
        }
    }

    private fun markConversationRead(session: NativeSession, matchId: String) {
        viewModelScope.launch(Dispatchers.IO) {
            when (val result = chatRepository.markConversationRead(session, matchId)) {
                is ChatMutationResult.Success -> mutableState.update {
                    it.copy(
                        conversations = it.conversations.map { conversation ->
                            if (conversation.id == matchId) conversation.copy(hasUnread = false) else conversation
                        }
                    )
                }
                is ChatMutationResult.Failure -> {
                    // Keep this non-blocking; read receipts should not prevent message viewing.
                }
            }
        }
    }

    private fun recordCandidateSwipe(candidateId: String, direction: SwipeDirection) {
        val snapshot = mutableState.value
        val session = snapshot.session
        val profile = snapshot.profile
        if (session == null || profile == null) {
            mutableState.update { it.copy(error = "Sign in and complete onboarding before swiping.") }
            return
        }
        if (candidateId in snapshot.swipeLoadingIds) return

        mutableState.update {
            it.copy(
                swipeLoadingIds = it.swipeLoadingIds + candidateId,
                error = null,
                lastSwipeMessage = null
            )
        }

        viewModelScope.launch(Dispatchers.IO) {
            when (val result = swipeRepository.recordSwipe(session, profile, candidateId, direction)) {
                is SwipeResult.Success -> mutableState.update {
                    it.copy(
                        swipeLoadingIds = it.swipeLoadingIds - result.candidateId,
                        candidates = it.candidates.filterNot { candidate -> candidate.id == result.candidateId },
                        lastSwipeMessage = if (result.direction == SwipeDirection.Right) {
                            "Like sent."
                        } else {
                            "Passed."
                        }
                    )
                }
                is SwipeResult.Failure -> mutableState.update {
                    it.copy(
                        swipeLoadingIds = it.swipeLoadingIds - candidateId,
                        error = result.message
                    )
                }
            }
        }
    }

    private fun identifyRevenueCat(session: NativeSession) {
        val userId = session.userId ?: return
        viewModelScope.launch(Dispatchers.IO) {
            when (val result = billingRepository.identifyUser(userId)) {
                is BillingResult.Success -> mutableState.update {
                    it.copy(premiumState = result.state)
                }
                is BillingResult.Failure -> {
                    // Keep auth usable if RevenueCat is temporarily unavailable.
                }
            }
        }
    }
}
