package com.collegedate.prototype

import android.os.Bundle
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ChatBubble
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.Payments
import androidx.compose.material.icons.rounded.School
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Send
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import com.collegedate.prototype.billing.BillingReadiness
import com.collegedate.prototype.billing.PremiumPackagePreview
import com.collegedate.prototype.billing.PremiumState
import com.collegedate.prototype.data.ChatMessage
import com.collegedate.prototype.data.ConversationPreview
import com.collegedate.prototype.data.DiscoveryCandidate
import com.collegedate.prototype.data.NativeProfile
import com.collegedate.prototype.ui.theme.TheCollegeDatePrototypeTheme
import com.collegedate.prototype.ui.AuthViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.URL

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            TheCollegeDatePrototypeTheme {
                CollegeDatePrototypeApp()
            }
        }
    }
}

private enum class Tab(val label: String, val icon: ImageVector) {
    Match("Match", Icons.Rounded.Favorite),
    Chat("Chat", Icons.Rounded.ChatBubble),
    Premium("Premium", Icons.Rounded.Payments),
    Safety("Safety", Icons.Rounded.Lock),
    Account("Account", Icons.Rounded.Person)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CollegeDatePrototypeApp() {
    var selectedTab by remember { mutableStateOf(Tab.Match) }
    val authViewModel: AuthViewModel = viewModel()
    val authState by authViewModel.state.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "The College Date",
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Native Android prototype",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        bottomBar = {
            NavigationBar {
                Tab.entries.forEach { tab ->
                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        icon = { Icon(tab.icon, contentDescription = tab.label) },
                        label = { Text(tab.label) }
                    )
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            HeroCard()

            AuthCard(
                email = authState.email,
                password = authState.password,
                loading = authState.loading,
                profileLoading = authState.profileLoading,
                error = authState.error,
                sessionEmail = authState.session?.email,
                sessionUserId = authState.session?.userId,
                profile = authState.profile,
                onboardingName = authState.onboardingName,
                onboardingAge = authState.onboardingAge,
                onboardingUniversity = authState.onboardingUniversity,
                onboardingLevel = authState.onboardingLevel,
                onboardingInterests = authState.onboardingInterests,
                onboardingGoal = authState.onboardingGoal,
                warnings = authState.warnings,
                onEmailChange = authViewModel::updateEmail,
                onPasswordChange = authViewModel::updatePassword,
                onOnboardingNameChange = authViewModel::updateOnboardingName,
                onOnboardingAgeChange = authViewModel::updateOnboardingAge,
                onOnboardingUniversityChange = authViewModel::updateOnboardingUniversity,
                onOnboardingLevelChange = authViewModel::updateOnboardingLevel,
                onOnboardingInterestsChange = authViewModel::updateOnboardingInterests,
                onOnboardingGoalChange = authViewModel::updateOnboardingGoal,
                onSignIn = authViewModel::signIn,
                onSignUp = authViewModel::signUp,
                onCompleteOnboarding = authViewModel::completeOnboarding,
                onLogout = authViewModel::logout
            )

            AnimatedVisibility(visible = selectedTab == Tab.Match) {
                MatchPreview(
                    profile = authState.profile,
                    candidates = authState.candidates,
                    loading = authState.discoveryLoading,
                    swipeLoadingIds = authState.swipeLoadingIds,
                    lastSwipeMessage = authState.lastSwipeMessage,
                    onRefresh = authViewModel::refreshDiscovery,
                    onPass = authViewModel::passCandidate,
                    onLike = authViewModel::likeCandidate
                )
            }
            AnimatedVisibility(visible = selectedTab == Tab.Chat) {
                ChatPreview(
                    profile = authState.profile,
                    conversations = authState.conversations,
                    loading = authState.conversationsLoading,
                    selectedConversationId = authState.selectedConversationId,
                    messages = authState.selectedMessages,
                    messagesLoading = authState.messagesLoading,
                    sendingMessage = authState.sendingMessage,
                    messageDraft = authState.messageDraft,
                    currentUserId = authState.profile?.id,
                    onRefresh = authViewModel::refreshConversations,
                    onOpenConversation = authViewModel::openConversation,
                    onCloseConversation = authViewModel::closeConversation,
                    onRefreshMessages = authViewModel::refreshSelectedConversationMessages,
                    onMessageDraftChange = authViewModel::updateMessageDraft,
                    onSendMessage = authViewModel::sendSelectedConversationMessage
                )
            }
            AnimatedVisibility(visible = selectedTab == Tab.Premium) {
                PremiumPreview(
                    premiumState = authState.premiumState,
                    loading = authState.premiumLoading,
                    onRefresh = authViewModel::refreshPremiumState,
                    onRestore = authViewModel::restorePremiumPurchases,
                    onPurchase = authViewModel::purchaseMonthlyPremium
                )
            }
            AnimatedVisibility(visible = selectedTab == Tab.Safety) {
                SafetyPreview()
            }
            AnimatedVisibility(visible = selectedTab == Tab.Account) {
                AccountPreview(
                    profile = authState.profile,
                    sessionEmail = authState.session?.email,
                    sessionUserId = authState.session?.userId,
                    premiumState = authState.premiumState,
                    onLogout = authViewModel::logout
                )
            }

            ProductionBoundaryCard()
        }
    }
}

@Composable
private fun AuthCard(
    email: String,
    password: String,
    loading: Boolean,
    profileLoading: Boolean,
    error: String?,
    sessionEmail: String?,
    sessionUserId: String?,
    profile: NativeProfile?,
    onboardingName: String,
    onboardingAge: String,
    onboardingUniversity: String,
    onboardingLevel: String,
    onboardingInterests: String,
    onboardingGoal: String,
    warnings: List<String>,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onOnboardingNameChange: (String) -> Unit,
    onOnboardingAgeChange: (String) -> Unit,
    onOnboardingUniversityChange: (String) -> Unit,
    onOnboardingLevelChange: (String) -> Unit,
    onOnboardingInterestsChange: (String) -> Unit,
    onOnboardingGoalChange: (String) -> Unit,
    onSignIn: () -> Unit,
    onSignUp: () -> Unit,
    onCompleteOnboarding: () -> Unit,
    onLogout: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Auth foundation", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)

            if (warnings.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    warnings.forEach { warning ->
                        Text(
                            text = warning,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }

            if (sessionUserId != null) {
                Text(
                    text = "Signed in as ${sessionEmail ?: "Supabase user"}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "User ID: $sessionUserId",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (profileLoading) {
                    Text(
                        text = "Loading profile...",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else if (profile != null) {
                    ProfileStatus(profile)
                    if (!profile.isOnboarded) {
                        OnboardingForm(
                            onboardingName = onboardingName.ifBlank { profile.fullName.orEmpty() },
                            onboardingAge = onboardingAge,
                            onboardingUniversity = onboardingUniversity,
                            onboardingLevel = onboardingLevel,
                            onboardingInterests = onboardingInterests,
                            onboardingGoal = onboardingGoal,
                            loading = profileLoading,
                            onNameChange = onOnboardingNameChange,
                            onAgeChange = onOnboardingAgeChange,
                            onUniversityChange = onOnboardingUniversityChange,
                            onLevelChange = onOnboardingLevelChange,
                            onInterestsChange = onOnboardingInterestsChange,
                            onGoalChange = onOnboardingGoalChange,
                            onComplete = onCompleteOnboarding
                        )
                    }
                } else {
                    Text(
                        text = "No profile row found yet. The next native step is onboarding/profile repair.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error
                    )
                    OnboardingForm(
                        onboardingName = onboardingName,
                        onboardingAge = onboardingAge,
                        onboardingUniversity = onboardingUniversity,
                        onboardingLevel = onboardingLevel,
                        onboardingInterests = onboardingInterests,
                        onboardingGoal = onboardingGoal,
                        loading = profileLoading,
                        onNameChange = onOnboardingNameChange,
                        onAgeChange = onOnboardingAgeChange,
                        onUniversityChange = onOnboardingUniversityChange,
                        onLevelChange = onOnboardingLevelChange,
                        onInterestsChange = onOnboardingInterestsChange,
                        onGoalChange = onOnboardingGoalChange,
                        onComplete = onCompleteOnboarding
                    )
                }
                OutlinedButton(onClick = onLogout, enabled = !loading) {
                    Text("Log out locally")
                }
                return@Column
            }

            OutlinedTextField(
                value = email,
                onValueChange = onEmailChange,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Email") },
                singleLine = true,
                enabled = !loading
            )
            OutlinedTextField(
                value = password,
                onValueChange = onPasswordChange,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Password") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                enabled = !loading
            )

            if (error != null) {
                Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(onClick = onSignIn, enabled = !loading) {
                    Text(if (loading) "Working..." else "Sign in")
                }
                OutlinedButton(onClick = onSignUp, enabled = !loading) {
                    Text("Sign up")
                }
            }
        }
    }
}

@Composable
private fun OnboardingForm(
    onboardingName: String,
    onboardingAge: String,
    onboardingUniversity: String,
    onboardingLevel: String,
    onboardingInterests: String,
    onboardingGoal: String,
    loading: Boolean,
    onNameChange: (String) -> Unit,
    onAgeChange: (String) -> Unit,
    onUniversityChange: (String) -> Unit,
    onLevelChange: (String) -> Unit,
    onInterestsChange: (String) -> Unit,
    onGoalChange: (String) -> Unit,
    onComplete: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(
            text = "Complete native onboarding",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        OutlinedTextField(
            value = onboardingName,
            onValueChange = onNameChange,
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Full name") },
            singleLine = true,
            enabled = !loading
        )
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedTextField(
                value = onboardingAge,
                onValueChange = onAgeChange,
                modifier = Modifier.weight(1f),
                label = { Text("Age") },
                singleLine = true,
                enabled = !loading
            )
            OutlinedTextField(
                value = onboardingLevel,
                onValueChange = onLevelChange,
                modifier = Modifier.weight(1f),
                label = { Text("Level") },
                singleLine = true,
                enabled = !loading
            )
        }
        OutlinedTextField(
            value = onboardingUniversity,
            onValueChange = onUniversityChange,
            modifier = Modifier.fillMaxWidth(),
            label = { Text("University") },
            singleLine = true,
            enabled = !loading
        )
        OutlinedTextField(
            value = onboardingInterests,
            onValueChange = onInterestsChange,
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Interests, comma separated") },
            enabled = !loading,
            minLines = 2
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("Serious", "Casual", "Friends").forEach { goal ->
                AssistChip(
                    onClick = { onGoalChange(goal) },
                    label = { Text(if (onboardingGoal == goal) "$goal selected" else goal) }
                )
            }
        }
        Button(onClick = onComplete, enabled = !loading) {
            Text(if (loading) "Saving..." else "Complete onboarding")
        }
    }
}

@Composable
private fun ProfileStatus(profile: NativeProfile) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = profile.fullName ?: "Profile exists",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            AssistChip(
                onClick = {},
                label = { Text(if (profile.isOnboarded) "Onboarded" else "Needs onboarding") }
            )
            AssistChip(
                onClick = {},
                label = { Text(if (profile.isPremium) "Premium" else "Free") }
            )
        }
        if (profile.premiumExpiresAt != null) {
            Text(
                text = "Premium expires: ${profile.premiumExpiresAt}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun HeroCard() {
    Card(
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.linearGradient(
                        listOf(
                            Color(0xFF4F46E5),
                            Color(0xFFDB2777),
                            Color(0xFF111827)
                        )
                    )
                )
                .padding(22.dp)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                AssistChip(
                    onClick = {},
                    label = { Text("Nigeria campus dating") },
                    leadingIcon = {
                        Icon(
                            Icons.Rounded.School,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                )
                Text(
                    text = "A native-feeling Android shell for matching, chat, premium, and safety.",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = "This prototype is isolated from the current Capacitor release path until feature parity is proven.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White.copy(alpha = 0.82f)
                )
            }
        }
    }
}

@Composable
private fun MatchPreview(
    profile: NativeProfile?,
    candidates: List<DiscoveryCandidate>,
    loading: Boolean,
    swipeLoadingIds: Set<String>,
    lastSwipeMessage: String?,
    onRefresh: () -> Unit,
    onPass: (String) -> Unit,
    onLike: (String) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text("Native Match", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(
                        text = if (profile?.isOnboarded == true) "Real discovery candidates" else "Complete onboarding to unlock discovery",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                OutlinedButton(onClick = onRefresh, enabled = profile?.isOnboarded == true && !loading) {
                    Icon(Icons.Rounded.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Refresh")
                }
            }

            when {
                loading -> Text("Loading discovery...", color = MaterialTheme.colorScheme.onSurfaceVariant)
                profile?.isOnboarded != true -> Text(
                    "The native prototype will stay locked until auth and onboarding are valid.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                candidates.isEmpty() -> Text(
                    "No candidates returned yet. This may mean discovery RLS, profile filters, or onboarding data need review.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                else -> candidates.take(5).forEach { candidate ->
                    CandidateRow(
                        candidate = candidate,
                        loading = candidate.id in swipeLoadingIds,
                        onPass = { onPass(candidate.id) },
                        onLike = { onLike(candidate.id) }
                    )
                }
            }

            if (lastSwipeMessage != null) {
                Text(
                    text = lastSwipeMessage,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

@Composable
private fun CandidateRow(
    candidate: DiscoveryCandidate,
    loading: Boolean,
    onPass: () -> Unit,
    onLike: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                modifier = Modifier
                    .size(52.dp)
                    .clip(CircleShape),
                color = MaterialTheme.colorScheme.primaryContainer
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = candidate.fullName?.take(1)?.uppercase() ?: "C",
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = buildString {
                        append(candidate.fullName ?: "Campus member")
                        candidate.age?.let { append(", $it") }
                    },
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = listOfNotNull(candidate.university, candidate.attractionGoal).joinToString(" • ")
                        .ifBlank { "Campus profile" },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                candidate.bio?.takeIf { it.isNotBlank() }?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            Spacer(modifier = Modifier.width(8.dp))
            Column(verticalArrangement = Arrangement.spacedBy(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                OutlinedButton(onClick = onPass, enabled = !loading) {
                    Icon(Icons.Rounded.Close, contentDescription = "Pass", modifier = Modifier.size(18.dp))
                }
                Button(onClick = onLike, enabled = !loading) {
                    Icon(Icons.Rounded.Favorite, contentDescription = "Like", modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}

@Composable
private fun ChatPreview(
    profile: NativeProfile?,
    conversations: List<ConversationPreview>,
    loading: Boolean,
    selectedConversationId: String?,
    messages: List<ChatMessage>,
    messagesLoading: Boolean,
    sendingMessage: Boolean,
    messageDraft: String,
    currentUserId: String?,
    onRefresh: () -> Unit,
    onOpenConversation: (String) -> Unit,
    onCloseConversation: () -> Unit,
    onRefreshMessages: () -> Unit,
    onMessageDraftChange: (String) -> Unit,
    onSendMessage: () -> Unit
) {
    val context = LocalContext.current
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            if (selectedConversationId != null) {
                ConversationMessages(
                    conversation = conversations.firstOrNull { it.id == selectedConversationId },
                    messages = messages,
                    loading = messagesLoading,
                    sendingMessage = sendingMessage,
                    messageDraft = messageDraft,
                    currentUserId = currentUserId,
                    onBack = onCloseConversation,
                    onRefresh = onRefreshMessages,
                    onMessageDraftChange = onMessageDraftChange,
                    onSendMessage = onSendMessage,
                    onReportConversation = {
                        context.openSupportMessage(
                            "Hi, I want to report a chat on The College Date. " +
                                "Match ID: ${it?.id ?: selectedConversationId}. " +
                                "Other user: ${it?.otherUser?.fullName ?: "Unknown"}."
                        )
                    }
                )
                return@Column
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text("Native Chat", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(
                        text = if (profile?.isOnboarded == true) "Real matches and latest messages" else "Complete onboarding to unlock chat",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                OutlinedButton(onClick = onRefresh, enabled = profile?.isOnboarded == true && !loading) {
                    Icon(Icons.Rounded.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Refresh")
                }
            }

            when {
                loading -> Text("Loading conversations...", color = MaterialTheme.colorScheme.onSurfaceVariant)
                profile?.isOnboarded != true -> Text(
                    "The chat surface stays locked until auth and onboarding are valid.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                conversations.isEmpty() -> Text(
                    "No conversations yet. Matches will appear here after mutual interest.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                else -> conversations.take(8).forEach { conversation ->
                    ConversationRow(
                        conversation = conversation,
                        onOpen = { onOpenConversation(conversation.id) }
                    )
                }
            }
        }
    }
}

@Composable
private fun ConversationRow(conversation: ConversationPreview, onOpen: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                modifier = Modifier
                    .size(50.dp)
                    .clip(CircleShape),
                color = if (conversation.hasUnread) {
                    MaterialTheme.colorScheme.primaryContainer
                } else {
                    MaterialTheme.colorScheme.surfaceContainer
                }
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = conversation.otherUser?.fullName?.take(1)?.uppercase() ?: "M",
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = conversation.otherUser?.fullName ?: "Matched student",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = if (conversation.hasUnread) FontWeight.Bold else FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    if (conversation.hasUnread) {
                        Surface(
                            modifier = Modifier.size(10.dp),
                            shape = CircleShape,
                            color = MaterialTheme.colorScheme.primary
                        ) {}
                    }
                }
                Text(
                    text = conversation.lastMessage ?: "Start the conversation",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (conversation.disappearingSeconds > 0) {
                    Text(
                        text = "Disappearing messages enabled",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.secondary
                    )
                }
            }
            Spacer(modifier = Modifier.width(8.dp))
            OutlinedButton(onClick = onOpen) {
                Text("Open")
            }
        }
    }
}

@Composable
private fun ConversationMessages(
    conversation: ConversationPreview?,
    messages: List<ChatMessage>,
    loading: Boolean,
    sendingMessage: Boolean,
    messageDraft: String,
    currentUserId: String?,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
    onMessageDraftChange: (String) -> Unit,
    onSendMessage: () -> Unit,
    onReportConversation: (ConversationPreview?) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            OutlinedButton(onClick = onBack) {
                Icon(Icons.Rounded.ArrowBack, contentDescription = "Back", modifier = Modifier.size(18.dp))
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = conversation?.otherUser?.fullName ?: "Conversation",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Read-only native message preview",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            OutlinedButton(onClick = onRefresh, enabled = !loading) {
                Icon(Icons.Rounded.Refresh, contentDescription = "Refresh", modifier = Modifier.size(18.dp))
            }
            OutlinedButton(onClick = { onReportConversation(conversation) }) {
                Text("Report")
            }
        }

        when {
            loading -> Text("Loading messages...", color = MaterialTheme.colorScheme.onSurfaceVariant)
            messages.isEmpty() -> Text(
                "No messages yet. Sending will be added after read-only QA passes.",
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            else -> messages.forEach { message ->
                MessageBubble(
                    message = message,
                    isMine = message.senderId == currentUserId
                )
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = messageDraft,
                onValueChange = onMessageDraftChange,
                modifier = Modifier.weight(1f),
                label = { Text("Message") },
                enabled = !sendingMessage,
                minLines = 1,
                maxLines = 4
            )
            Button(
                onClick = onSendMessage,
                enabled = messageDraft.isNotBlank() && !sendingMessage
            ) {
                Icon(Icons.Rounded.Send, contentDescription = "Send", modifier = Modifier.size(18.dp))
            }
        }
    }
}

@Composable
private fun MessageBubble(message: ChatMessage, isMine: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isMine) Arrangement.End else Arrangement.Start
    ) {
        Surface(
            shape = RoundedCornerShape(
                topStart = 18.dp,
                topEnd = 18.dp,
                bottomStart = if (isMine) 18.dp else 6.dp,
                bottomEnd = if (isMine) 6.dp else 18.dp
            ),
            color = if (isMine) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface,
            tonalElevation = 2.dp,
            modifier = Modifier.fillMaxWidth(0.82f)
        ) {
            Column(
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                if (message.type == "image") {
                    RemoteChatImage(url = message.mediaUrl)
                } else {
                    Text(
                        text = when (message.type) {
                            "voice" -> "Voice note"
                            "gift" -> "Gift"
                            "sticker" -> "Sticker"
                            "call_log" -> "Call log"
                            else -> message.content ?: "Message"
                        },
                        color = if (isMine) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                Text(
                    text = message.createdAt ?: "",
                    color = if (isMine) {
                        MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.72f)
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    },
                    style = MaterialTheme.typography.labelSmall
                )
            }
        }
    }
}

@Composable
private fun RemoteChatImage(url: String?) {
    var bitmap by remember(url) { mutableStateOf<Bitmap?>(null) }
    var failed by remember(url) { mutableStateOf(false) }

    LaunchedEffect(url) {
        bitmap = null
        failed = false
        if (url.isNullOrBlank()) {
            failed = true
            return@LaunchedEffect
        }
        bitmap = withContext(Dispatchers.IO) {
            runCatching {
                URL(url).openStream().use { stream ->
                    BitmapFactory.decodeStream(stream)
                }
            }.getOrNull()
        }
        failed = bitmap == null
    }

    when {
        bitmap != null -> Image(
            bitmap = bitmap!!.asImageBitmap(),
            contentDescription = "Photo message",
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .fillMaxWidth()
                .height(220.dp)
                .clip(RoundedCornerShape(14.dp))
        )
        failed -> Text(
            text = "Photo unavailable",
            color = MaterialTheme.colorScheme.error,
            style = MaterialTheme.typography.bodySmall
        )
        else -> Text(
            text = "Loading photo...",
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodySmall
        )
    }
}

@Composable
private fun PremiumPreview(
    premiumState: PremiumState?,
    loading: Boolean,
    onRefresh: () -> Unit,
    onRestore: () -> Unit,
    onPurchase: (android.app.Activity) -> Unit
) {
    val activity = LocalContext.current as? android.app.Activity
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text("Native Premium", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(
                        text = "RevenueCat entitlement and offering preview",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = onRefresh, enabled = !loading) {
                        Icon(Icons.Rounded.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                    }
                    Button(onClick = onRestore, enabled = !loading) {
                        Text("Restore")
                    }
                }
            }

            if (loading) {
                Text("Loading RevenueCat...", color = MaterialTheme.colorScheme.onSurfaceVariant)
                return@Column
            }

            if (premiumState == null) {
                Text(BillingReadiness.statusMessage(), color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(
                    text = "Purchase testing requires a Google Play internal-test build using the production package. This prototype package is kept separate to protect the live app.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                return@Column
            }

            AssistChip(
                onClick = {},
                label = { Text(if (premiumState.isPremium) "Premium active" else "Premium inactive") },
                leadingIcon = {
                    Icon(Icons.Rounded.Payments, contentDescription = null, modifier = Modifier.size(18.dp))
                }
            )
            Text(
                text = premiumState.message ?: "RevenueCat state loaded.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = "Production purchase QA should run from a Play internal-test build of com.collegedate.app. The separate prototype package is for safe UI/backend validation.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            premiumState.offeringId?.let {
                Text("Offering: $it", style = MaterialTheme.typography.bodySmall)
            }
            premiumState.expirationDate?.let {
                Text("Expires: $it", style = MaterialTheme.typography.bodySmall)
            }

            if (premiumState.packages.isEmpty()) {
                Text("No packages returned yet.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                premiumState.packages.forEach { pkg ->
                    PremiumPackageRow(pkg)
                }
                Button(
                    onClick = { activity?.let(onPurchase) },
                    enabled = !loading && activity != null && premiumState.configured && !premiumState.isPremium
                ) {
                    Text("Buy monthly Premium")
                }
            }
        }
    }
}

@Composable
private fun PremiumPackageRow(pkg: PremiumPackagePreview) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(pkg.title.ifBlank { pkg.identifier }, fontWeight = FontWeight.Bold)
            Text(pkg.price, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
            Text(
                text = "${pkg.packageType} • ${pkg.productId}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun SafetyPreview() {
    val context = LocalContext.current
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Surface(
                    modifier = Modifier
                        .size(46.dp)
                        .clip(CircleShape),
                    color = MaterialTheme.colorScheme.primaryContainer
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(Icons.Rounded.Lock, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    }
                }
                Column {
                    Text("Safety & Support", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(
                        text = "Production safety links for campus dating",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            SafetyRow(
                title = "Community safety standards",
                body = "Open the public safety and child-protection standards page.",
                action = "Open",
                onClick = { context.openUrl("https://www.thecollegedate.com/child-safety-standards.html") }
            )
            SafetyRow(
                title = "Support",
                body = "Open The College Date support page for help and contact options.",
                action = "Support",
                onClick = { context.openUrl("https://www.thecollegedate.com/support.html") }
            )
            SafetyRow(
                title = "Report and block",
                body = "Open a prefilled support escalation for abuse, impersonation, underage users, or unsafe behavior.",
                action = "Report",
                onClick = {
                    context.openSupportMessage(
                        "Hi, I want to report a safety issue on The College Date. Please help me review it."
                    )
                }
            )
        }
    }
}

@Composable
private fun SafetyRow(title: String, body: String, action: String, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(body, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            OutlinedButton(onClick = onClick, enabled = action != "Planned") {
                Text(action)
            }
        }
    }
}

private fun android.content.Context.openUrl(url: String) {
    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
}

private fun android.content.Context.openSupportMessage(message: String) {
    val uri = Uri.Builder()
        .scheme("https")
        .authority("wa.me")
        .appendPath("2349160264415")
        .appendQueryParameter("text", message)
        .build()
    startActivity(Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
}

@Composable
private fun AccountPreview(
    profile: NativeProfile?,
    sessionEmail: String?,
    sessionUserId: String?,
    premiumState: PremiumState?,
    onLogout: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Surface(
                    modifier = Modifier
                        .size(58.dp)
                        .clip(CircleShape),
                    color = MaterialTheme.colorScheme.primaryContainer
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = profile?.fullName?.take(1)?.uppercase() ?: "CD",
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
                Column {
                    Text(
                        text = profile?.fullName ?: "The College Date member",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = sessionEmail ?: "Not signed in",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            AccountRow("Supabase user", sessionUserId ?: "No active session")
            AccountRow("Onboarding", if (profile?.isOnboarded == true) "Complete" else "Incomplete")
            AccountRow("University", profile?.university ?: "Not set")
            AccountRow("Premium", if (premiumState?.isPremium == true || profile?.isPremium == true) "Active" else "Inactive")
            AccountRow("Prototype package", "com.collegedate.prototype")

            OutlinedButton(onClick = onLogout, enabled = sessionUserId != null) {
                Text("Log out")
            }
        }
    }
}

@Composable
private fun AccountRow(label: String, value: String) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun FeatureCard(title: String, body: String, icon: ImageVector) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer)
    ) {
        Row(
            modifier = Modifier.padding(18.dp),
            verticalAlignment = Alignment.Top
        ) {
            Surface(
                modifier = Modifier
                    .size(46.dp)
                    .clip(CircleShape),
                color = MaterialTheme.colorScheme.primaryContainer
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                }
            }
            Spacer(modifier = Modifier.width(14.dp))
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(body, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun ProductionBoundaryCard() {
    Card(
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = "Production boundary",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onErrorContainer
            )
            Text(
                text = "This native app must not replace the live Android app until auth, payments, chat, matching, and release checks pass.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onErrorContainer
            )
            Button(onClick = {}) {
                Text("Feature parity required")
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun PrototypePreview() {
    TheCollegeDatePrototypeTheme {
        CollegeDatePrototypeApp()
    }
}
