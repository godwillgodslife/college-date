package com.collegedate.app.app.di

import android.content.Context
import androidx.room.Room
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
}

@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    @Provides
    @Singleton
    fun provideDispatchersProvider(): DispatchersProvider = StandardDispatchersProvider

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
        ).build()

    @Provides
    fun providePendingWriteDao(database: CollegeDateDatabase) = database.pendingWriteDao()

    @Provides
    fun provideCachedProfileDao(database: CollegeDateDatabase) = database.cachedProfileDao()

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
}
