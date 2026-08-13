package com.collegedate.app.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.collegedate.app.core.database.entity.CachedConversationEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CachedConversationDao {
    @Query(
        """
        SELECT * FROM cached_conversations
        WHERE ownerUserId = :ownerUserId
        ORDER BY sortIndex ASC
        """,
    )
    fun observeConversations(ownerUserId: String): Flow<List<CachedConversationEntity>>

    @Query(
        """
        SELECT * FROM cached_conversations
        WHERE ownerUserId = :ownerUserId AND matchId = :matchId
        LIMIT 1
        """,
    )
    fun observeConversation(ownerUserId: String, matchId: String): Flow<CachedConversationEntity?>

    @Query("SELECT COUNT(*) FROM cached_conversations WHERE ownerUserId = :ownerUserId")
    suspend fun count(ownerUserId: String): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(conversations: List<CachedConversationEntity>)

    @Query("DELETE FROM cached_conversations WHERE ownerUserId = :ownerUserId")
    suspend fun clearForUser(ownerUserId: String)

    @Query("DELETE FROM cached_conversations")
    suspend fun clearAll()
}
