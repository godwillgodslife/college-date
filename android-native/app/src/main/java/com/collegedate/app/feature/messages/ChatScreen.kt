package com.collegedate.app.feature.messages

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.collegedate.app.core.designsystem.components.CollegeDateIconButton
import com.collegedate.app.core.designsystem.components.CollegeDateTextField
import com.collegedate.app.core.designsystem.components.EmptyStateCard
import com.collegedate.app.core.designsystem.components.ErrorBanner
import com.collegedate.app.core.designsystem.components.LoadingState
import com.collegedate.app.core.designsystem.components.OfflineBanner
import com.collegedate.app.domain.messaging.ChatMessage

@Composable
fun ChatScreen(
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ChatViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val listState = rememberLazyListState()
    val keyboard = LocalSoftwareKeyboardController.current
    LaunchedEffect(state.messages.size) {
        if (state.messages.isNotEmpty()) listState.animateScrollToItem(state.messages.lastIndex)
    }

    Column(modifier = modifier.fillMaxSize().imePadding()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            CollegeDateIconButton(
                icon = Icons.AutoMirrored.Outlined.ArrowBack,
                contentDescription = "Back",
                onClick = onBack,
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    state.conversation?.otherDisplayName ?: "Private chat",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
                Text("Text messages", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        if (state.isOffline) OfflineBanner()
        state.error?.let { ErrorBanner(message = it) }
        Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
            when {
                state.isLoading && state.messages.isEmpty() -> LoadingState(label = "Opening chat")
                state.messages.isEmpty() -> EmptyStateCard(
                    title = "Start the conversation",
                    message = "Say hello and keep it respectful.",
                    emoji = "",
                    modifier = Modifier.padding(16.dp),
                )
                else -> LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize().padding(horizontal = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(state.messages, key = ChatMessage::id) { message ->
                        MessageBubble(message = message, isMine = message.senderId == state.currentUserId)
                    }
                }
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            CollegeDateTextField(
                value = state.draft,
                onValueChange = viewModel::onDraftChange,
                label = "Message",
                modifier = Modifier.weight(1f),
                imeAction = ImeAction.Send,
                keyboardActions = KeyboardActions(onSend = {
                    viewModel.send()
                    keyboard?.hide()
                }),
                supportingText = if (state.draft.length >= 1800) "${state.draft.length}/2000" else null,
                singleLine = false,
            )
            IconButton(
                onClick = {
                    viewModel.send()
                    keyboard?.hide()
                },
                enabled = state.draft.isNotBlank() && !state.isSending && !state.isOffline,
            ) {
                Icon(Icons.AutoMirrored.Outlined.Send, contentDescription = "Send message")
            }
        }
    }
}

@Composable
private fun MessageBubble(message: ChatMessage, isMine: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isMine) Arrangement.End else Arrangement.Start,
    ) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = if (isMine) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
            modifier = Modifier.fillMaxWidth(0.82f),
        ) {
            Column(modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)) {
                Text(message.displayContent())
                if (isMine) {
                    Text(
                        if (message.isRead) "Read" else "Sent",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.align(Alignment.End),
                    )
                }
            }
        }
    }
}
