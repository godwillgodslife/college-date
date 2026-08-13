package com.collegedate.app.app.di

import android.content.Context
import androidx.room.Room
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.collegedate.app.BuildConfig
import com.collegedate.app.core.common.ApplicationScope
import com.collegedate.app.core.common.DispatchersProvider
import com.collegedate.app.core.common.StandardDispatchersProvider
import com.collegedate.app.core.database.CollegeDateDatabase
import com.collegedate.app.core.datastore.AppPreferences
import com.collegedate.app.core.datastore.SessionPreferences
import com.collegedate.app.core.network.PublicSupabaseConfig
import com.collegedate.app.data.auth.AuthRemoteDataSource
import com.collegedate.app.data.auth.AuthRepositoryImpl
import com.collegedate.app.data.auth.SupabaseAuthRemoteDataSource
import com.collegedate.app.data.discovery.DiscoveryRemoteDataSource
import com.collegedate.app.data.discovery.DiscoveryRepository
import com.collegedate.app.data.discovery.DiscoveryRepositoryImpl
import com.collegedate.app.data.discovery.SupabaseDiscoveryRemoteDataSource
import com.collegedate.app.data.matching.MatchingRemoteDataSource
import com.collegedate.app.data.matching.MatchingRepository
import com.collegedate.app.data.matching.MatchingRepositoryImpl
import com.collegedate.app.data.matching.SupabaseMatchingRemoteDataSource
import com.collegedate.app.data.messaging.MessagingRemoteDataSource
import com.collegedate.app.data.messaging.MessagingRepository
import com.collegedate.app.data.messaging.MessagingRepositoryImpl
import com.collegedate.app.data.messaging.SupabaseMessagingRemoteDataSource
import com.collegedate.app.data.profile.ProfileRemoteDataSource
import com.collegedate.app.data.profile.ProfileRepositoryImpl
import com.collegedate.app.data.profile.SupabaseProfileRemoteDataSource
import com.collegedate.app.domain.auth.AuthRepository
import com.collegedate.app.domain.profile.ProfileRepository
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class AppBindingsModule {
    @Binds
    @Singleton
    abstract fun bindAuthRepository(repository: AuthRepositoryImpl): AuthRepository

    @Binds
    @Singleton
    abstract fun bindAuthRemoteDataSource(dataSource: SupabaseAuthRemoteDataSource): AuthRemoteDataSource

    @Binds
    @Singleton
    abstract fun bindProfileRepository(repository: ProfileRepositoryImpl): ProfileRepository

    @Binds
    @Singleton
    abstract fun bindProfileRemoteDataSource(dataSource: SupabaseProfileRemoteDataSource): ProfileRemoteDataSource

    @Binds
    @Singleton
    abstract fun bindDiscoveryRepository(repository: DiscoveryRepositoryImpl): DiscoveryRepository

    @Binds
    @Singleton
    abstract fun bindDiscoveryRemoteDataSource(
        dataSource: SupabaseDiscoveryRemoteDataSource,
    ): DiscoveryRemoteDataSource

    @Binds
    @Singleton
    abstract fun bindMatchingRepository(repository: MatchingRepositoryImpl): MatchingRepository

    @Binds
    @Singleton
    abstract fun bindMatchingRemoteDataSource(
        dataSource: SupabaseMatchingRemoteDataSource,
    ): MatchingRemoteDataSource

    @Binds
    @Singleton
    abstract fun bindMessagingRemoteDataSource(
        dataSource: SupabaseMessagingRemoteDataSource,
    ): MessagingRemoteDataSource
}

@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    @Provides
    @Singleton
    fun provideDispatchersProvider(): DispatchersProvider = StandardDispatchersProvider

    @Provides
    @Singleton
    fun provideMessagingRepository(
        remoteDataSource: MessagingRemoteDataSource,
        cachedConversationDao: com.collegedate.app.core.database.dao.CachedConversationDao,
        cachedMessageDao: com.collegedate.app.core.database.dao.CachedMessageDao,
        dispatchersProvider: DispatchersProvider,
    ): MessagingRepository = MessagingRepositoryImpl(
        remoteDataSource,
        cachedConversationDao,
        cachedMessageDao,
        dispatchersProvider,
    )

    @Provides
    @Singleton
    @ApplicationScope
    fun provideApplicationScope(): CoroutineScope =
        CoroutineScope(SupervisorJob() + Dispatchers.Default)

    @Provides
    @Singleton
    fun providePublicSupabaseConfig(): PublicSupabaseConfig =
        PublicSupabaseConfig(
            url = BuildConfig.SUPABASE_URL,
            anonKey = BuildConfig.SUPABASE_ANON_KEY,
            environment = BuildConfig.SUPABASE_ENVIRONMENT,
            projectRef = BuildConfig.SUPABASE_PROJECT_REF,
            showEnvironmentBadge = BuildConfig.SHOW_ENVIRONMENT_BADGE,
            callbackScheme = BuildConfig.AUTH_CALLBACK_SCHEME,
            callbackHost = BuildConfig.AUTH_CALLBACK_HOST,
            callbackPath = BuildConfig.AUTH_CALLBACK_PATH,
            passwordResetHost = BuildConfig.PASSWORD_RESET_CALLBACK_HOST,
        )

    @Provides
    @Singleton
    fun provideCollegeDateDatabase(
        @ApplicationContext context: Context,
    ): CollegeDateDatabase =
        Room.databaseBuilder(
            context,
            CollegeDateDatabase::class.java,
            "college-date-native.db",
        )
            .addMigrations(MIGRATION_1_2, MIGRATION_2_3)
            .build()

    @Provides
    fun providePendingWriteDao(database: CollegeDateDatabase) = database.pendingWriteDao()

    @Provides
    fun provideCachedProfileDao(database: CollegeDateDatabase) = database.cachedProfileDao()

    @Provides
    fun provideCachedDiscoveryProfileDao(database: CollegeDateDatabase) =
        database.cachedDiscoveryProfileDao()

    @Provides
    fun provideCachedConversationDao(database: CollegeDateDatabase) = database.cachedConversationDao()

    @Provides
    fun provideCachedMessageDao(database: CollegeDateDatabase) = database.cachedMessageDao()

    @Provides
    fun provideIoDispatcher(provider: DispatchersProvider): CoroutineDispatcher = provider.io

    @Provides
    @Singleton
    fun provideAppPreferences(
        @ApplicationContext context: Context,
    ): AppPreferences = AppPreferences(context)

    @Provides
    @Singleton
    fun provideSessionPreferences(appPreferences: AppPreferences): SessionPreferences = appPreferences

    private val MIGRATION_1_2 = object : Migration(1, 2) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL("ALTER TABLE cached_profiles ADD COLUMN email TEXT")
            db.execSQL("ALTER TABLE cached_profiles ADD COLUMN gender TEXT")
            db.execSQL("ALTER TABLE cached_profiles ADD COLUMN age INTEGER")
            db.execSQL("ALTER TABLE cached_profiles ADD COLUMN university TEXT")
            db.execSQL("ALTER TABLE cached_profiles ADD COLUMN bio TEXT")
            db.execSQL("ALTER TABLE cached_profiles ADD COLUMN phone TEXT")
            db.execSQL("ALTER TABLE cached_profiles ADD COLUMN photosJson TEXT NOT NULL DEFAULT '[]'")
            db.execSQL("ALTER TABLE cached_profiles ADD COLUMN profilePhotosJson TEXT NOT NULL DEFAULT '[]'")
            db.execSQL("ALTER TABLE cached_profiles ADD COLUMN interestsJson TEXT NOT NULL DEFAULT '[]'")
            db.execSQL("ALTER TABLE cached_profiles ADD COLUMN faculty TEXT")
            db.execSQL("ALTER TABLE cached_profiles ADD COLUMN department TEXT")
            db.execSQL("ALTER TABLE cached_profiles ADD COLUMN level TEXT")
            db.execSQL("ALTER TABLE cached_profiles ADD COLUMN mbti TEXT")
            db.execSQL("ALTER TABLE cached_profiles ADD COLUMN attractionGoal TEXT")
            db.execSQL("ALTER TABLE cached_profiles ADD COLUMN interestGender TEXT")
            db.execSQL("ALTER TABLE cached_profiles ADD COLUMN introPrompt TEXT")
            db.execSQL("ALTER TABLE cached_profiles ADD COLUMN voiceIntroUrl TEXT")
            db.execSQL("ALTER TABLE cached_profiles ADD COLUMN anthem TEXT")
            db.execSQL("ALTER TABLE cached_profiles ADD COLUMN locationStatus TEXT")
            db.execSQL("ALTER TABLE cached_profiles ADD COLUMN isVerified INTEGER NOT NULL DEFAULT 0")
            db.execSQL("ALTER TABLE cached_profiles ADD COLUMN completionScore INTEGER")
            db.execSQL("ALTER TABLE cached_profiles ADD COLUMN lastSeenAt TEXT")
            db.execSQL("ALTER TABLE cached_profiles ADD COLUMN lastActive TEXT")
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS cached_discovery_profiles (
                    id TEXT NOT NULL PRIMARY KEY,
                    displayName TEXT,
                    username TEXT,
                    gender TEXT,
                    age INTEGER,
                    university TEXT,
                    faculty TEXT,
                    department TEXT,
                    level TEXT,
                    bio TEXT,
                    avatarUrl TEXT,
                    photosJson TEXT NOT NULL,
                    profilePhotosJson TEXT NOT NULL,
                    interestsJson TEXT NOT NULL,
                    introPrompt TEXT,
                    voiceIntroUrl TEXT,
                    anthem TEXT,
                    attractionGoal TEXT,
                    isVerified INTEGER NOT NULL,
                    completionScore INTEGER,
                    lastSeenAt TEXT,
                    lastActive TEXT,
                    isLive INTEGER NOT NULL,
                    isBoosted INTEGER NOT NULL,
                    seenCount INTEGER,
                    sortIndex INTEGER NOT NULL,
                    cachedAtMillis INTEGER NOT NULL
                )
                """.trimIndent(),
            )
        }
    }

    private val MIGRATION_2_3 = object : Migration(2, 3) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS cached_conversations (
                    ownerUserId TEXT NOT NULL,
                    matchId TEXT NOT NULL,
                    otherUserId TEXT NOT NULL,
                    otherDisplayName TEXT NOT NULL,
                    otherAvatarUrl TEXT,
                    otherLastActive TEXT,
                    lastMessageId TEXT,
                    lastMessageContent TEXT,
                    lastMessageType TEXT,
                    lastMessageSenderId TEXT,
                    lastMessageIsRead INTEGER NOT NULL,
                    lastMessageCreatedAt TEXT,
                    unreadCount INTEGER NOT NULL,
                    sortIndex INTEGER NOT NULL,
                    cachedAtMillis INTEGER NOT NULL,
                    PRIMARY KEY(ownerUserId, matchId)
                )
                """.trimIndent(),
            )
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS cached_messages (
                    ownerUserId TEXT NOT NULL,
                    id TEXT NOT NULL,
                    matchId TEXT NOT NULL,
                    senderId TEXT NOT NULL,
                    content TEXT NOT NULL,
                    type TEXT NOT NULL,
                    isRead INTEGER NOT NULL,
                    createdAt TEXT,
                    readAt TEXT,
                    expiresAt TEXT,
                    cachedAtMillis INTEGER NOT NULL,
                    PRIMARY KEY(ownerUserId, id)
                )
                """.trimIndent(),
            )
            db.execSQL(
                "CREATE INDEX IF NOT EXISTS index_cached_messages_ownerUserId_matchId_createdAt " +
                    "ON cached_messages(ownerUserId, matchId, createdAt)",
            )
        }
    }
}
