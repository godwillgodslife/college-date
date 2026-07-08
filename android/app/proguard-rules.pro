# Capacitor Core ProGuard Rules
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keep class * extends com.getcapacitor.BridgeActivity { *; }

# OneSignal Capacitor Plugin ProGuard Rules
-keep class com.onesignal.** { *; }
-dontwarn com.onesignal.**

# RevenueCat Capacitor Plugin ProGuard Rules
-keep class com.revenuecat.purchases.** { *; }
-dontwarn com.revenuecat.purchases.**

# Keep generic Capacitor plugin reflections
-keepclassmembers class * extends com.getcapacitor.Plugin {
    public <methods>;
}

# ─────────────────────────────────────────────
# OPTIMIZATION & SHRINKING SAFEGUARDS
# ─────────────────────────────────────────────

# Allow access modification for more aggressive R8 optimization
-allowaccessmodification

# Suppress harmless warnings from common runtime libraries (OkHttp/Okio used by plugins)
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-dontwarn com.google.errorprone.annotations.**

# Google Play Services & Firebase Push Safeguards
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

