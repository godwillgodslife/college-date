package com.collegedate.app.feature.messages

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.Badge
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.collegedate.app.core.designsystem.components.CollegeDateAvatar
import com.collegedate.app.core.designsystem.components.EmptyStateCard
import com.collegedate.app.core.designsystem.components.ErrorCard
import com.collegedate.app.core.designsystem.components.LoadingState
import com.collegedate.app.core.designsystem.components.OfflineBanner
import com.collegedate.app.domain.messaging.ConversationSummary

@Composable
fun InboxScreen(
    onConversationClick: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: InboxViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    Column(
        modifier = modifier.fillMaxSize().padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text("Messages", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Text("Your private match conversations", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            IconButton(onClick = viewModel::refresh, enabled = !state.isRefreshing) {
                Icon(Icons.Outlined.Refresh, contentDescription = "Refresh messages")
            }
        }
        if (state.isOffline) OfflineBanner()
        state.error?.let { ErrorCard(message = it, onRetryClick = viewModel::refresh) }
        when {
            state.isLoading && state.conversations.isEmpty() -> LoadingState(label = "Loading messages")
            state.conversations.isEmpty() -> EmptyStateCard(
                title = "No conversations yet",
                message = "Mutual matches will appear here when you are ready to chat.",
                emoji = "",
            )
            else -> LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxSize(),
            ) {
                items(state.conversations, key = ConversationSummary::matchId) { conversation ->
                    ConversationRow(conversation, onConversationClick)
                }
            }
        }
    }
}

@Composable
private fun ConversationRow(conversation: ConversationSummary, onClick: (String) -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth().clickable { onClick(conversation.matchId) },
        shape = MaterialTheme.shapes.medium,
        tonalElevation = if (conversation.unreadCount > 0) 2.dp else 0.dp,
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            CollegeDateAvatar(
                size = 52,
                imageUrl = conversation.otherAvatarUrl,
                contentDescription = "${conversation.otherDisplayName}'s profile photo",
            )
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(
                    conversation.otherDisplayName,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = if (conversation.unreadCount > 0) FontWeight.Bold else FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    conversation.preview,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            if (conversation.unreadCount > 0) {
                Badge { Text(conversation.unreadCount.coerceAtMost(99).toString()) }
            } else {
                Icon(Icons.Outlined.ChatBubbleOutline, contentDescription = null)
            }
        }
    }
}
