import java.util.Properties
import org.gradle.api.GradleException

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.kapt)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.hilt)
}

private val localConfig = Properties().apply {
    rootProject.file("local.properties")
        .takeIf { it.isFile }
        ?.inputStream()
        ?.use(::load)
}

private val rootEnvConfig = Properties().apply {
    rootProject.projectDir.parentFile
        ?.resolve(".env")
        ?.takeIf { it.isFile }
        ?.inputStream()
        ?.use(::load)
}

private fun String.cleanConfigValue(): String =
    trim().trim('"').trim('\'')

private fun String.asBuildConfigString(): String =
    replace("\\", "\\\\").replace("\"", "\\\"")

private fun String.looksLikePlaceholderConfig(): Boolean {
    val normalized = lowercase()
    return normalized.contains("your-") ||
        normalized.contains("placeholder") ||
        normalized.contains("example") ||
        normalized == "changeme"
}

private fun ProviderFactory.publicConfig(vararg names: String, fallback: String = ""): String {
    names.forEach { name ->
        gradleProperty(name).orNull?.cleanConfigValue()?.takeIf { it.isNotBlank() }?.let { return it }
        environmentVariable(name).orNull?.cleanConfigValue()?.takeIf { it.isNotBlank() }?.let { return it }
        localConfig.getProperty(name)?.cleanConfigValue()?.takeIf { it.isNotBlank() }?.let { return it }
        rootEnvConfig.getProperty(name)?.cleanConfigValue()?.takeIf { it.isNotBlank() }?.let { return it }
    }
    return fallback
}

private val stagingSupabaseUrl = "https://pxobauvatbjncluuunyq.supabase.co"
private val stagingProjectRef = "pxobauvatbjncluuunyq"
private val productionProjectRef = "gedoyoleoscgxgdqszzc"

android {
    namespace = "com.collegedate.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.collegedate.app"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0-native-phase1"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }

        val supabaseUrl = providers.publicConfig(
            "SUPABASE_URL",
            "COLLEGE_DATE_SUPABASE_URL",
            "VITE_SUPABASE_URL",
        )
        val supabaseAnonKey = providers.publicConfig(
            "SUPABASE_ANON_KEY",
            "COLLEGE_DATE_SUPABASE_ANON_KEY",
            "VITE_SUPABASE_ANON_KEY",
        )
        if (supabaseUrl.isBlank() || supabaseAnonKey.isBlank()) {
            throw GradleException(
                "Native Android Phase 2 requires SUPABASE_URL and SUPABASE_ANON_KEY from " +
                    "android-native/local.properties or another ignored local config source.",
            )
        }
        if (supabaseUrl.looksLikePlaceholderConfig() || supabaseAnonKey.looksLikePlaceholderConfig()) {
            throw GradleException(
                "Native Android Phase 2 Supabase config still contains placeholder values. " +
                    "Use ignored local staging config before building.",
            )
        }
        if (supabaseUrl.contains(productionProjectRef, ignoreCase = true)) {
            throw GradleException(
                "Native Android Phase 2 must not use the production Supabase project " +
                    "$productionProjectRef. Configure staging project $stagingProjectRef instead.",
            )
        }
        if (supabaseUrl != stagingSupabaseUrl) {
            throw GradleException(
                "Native Android Phase 2 is locked to staging Supabase URL $stagingSupabaseUrl. " +
                    "Configured value was $supabaseUrl.",
            )
        }
        buildConfigField("String", "SUPABASE_URL", "\"${supabaseUrl.asBuildConfigString()}\"")
        buildConfigField("String", "SUPABASE_ANON_KEY", "\"${supabaseAnonKey.asBuildConfigString()}\"")
        buildConfigField("String", "SUPABASE_ENVIRONMENT", "\"STAGING\"")
        buildConfigField("String", "SUPABASE_PROJECT_REF", "\"$stagingProjectRef\"")
        buildConfigField("Boolean", "SHOW_ENVIRONMENT_BADGE", "BuildConfig.DEBUG")
        buildConfigField("String", "AUTH_CALLBACK_SCHEME", "\"com.collegedate.app\"")
        buildConfigField("String", "AUTH_CALLBACK_HOST", "\"auth\"")
        buildConfigField("String", "AUTH_CALLBACK_PATH", "\"callback\"")
        buildConfigField("String", "PASSWORD_RESET_CALLBACK_HOST", "\"reset-password\"")
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    buildFeatures {
        buildConfig = true
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        isCoreLibraryDesugaringEnabled = true
    }

    kotlin {
        compilerOptions {
            jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
            freeCompilerArgs.addAll(
                "-Xjsr305=strict",
                "-opt-in=kotlin.RequiresOptIn",
            )
        }
    }

    lint {
        abortOnError = true
        checkDependencies = true
        checkReleaseBuilds = false
        htmlReport = true
        textReport = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

kapt {
    correctErrorTypes = true
}

dependencies {
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.core.splashscreen)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.hilt.navigation.compose)

    implementation(platform(libs.compose.bom))
    androidTestImplementation(platform(libs.compose.bom))
    implementation(libs.compose.foundation)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons.extended)
    implementation(libs.compose.runtime)
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.graphics)
    implementation(libs.compose.ui.tooling.preview)
    debugImplementation(libs.compose.ui.tooling)
    debugImplementation(libs.compose.ui.test.manifest)

    implementation(libs.hilt.android)
    kapt(libs.hilt.compiler)

    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    kapt(libs.room.compiler)

    implementation(libs.datastore.preferences)
    implementation(libs.work.runtime.ktx)
    implementation(libs.coil.compose)

    implementation(platform(libs.supabase.bom))
    implementation(libs.supabase.auth)
    implementation(libs.supabase.postgrest)
    implementation(libs.supabase.realtime)
    implementation(libs.supabase.storage)
    implementation(libs.supabase.functions)
    implementation(libs.ktor.client.okhttp)

    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.messaging)

    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.serialization.json)
    coreLibraryDesugaring(libs.desugar.jdk.libs)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.mockk)

    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.espresso.core)
    androidTestImplementation(libs.compose.ui.test.junit4)
}
