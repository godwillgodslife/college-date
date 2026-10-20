# The College Date — Android Application Security Audit

**Generated Date**: October 20, 2026  
**Auditor**: Android Security Specialist & Mobile Pentester  
**Baseline**: OWASP Mobile Application Security Verification Standard (MASVS v2.0) & MASTG  
**Package**: `com.collegedate.app` (v2.2.70 / Version Code 67)

---

## 1. Attack Surface Overview

| Component | Manifest Declaration | Security Assessment | Remediation / Verification |
| :--- | :--- | :--- | :--- |
| **MainActivity** | `android:exported="true"`, `launchMode="singleTask"` | **REQUIRED** for launcher & deep links | Protected by strict scheme filtering & App Links `autoVerify="true"` |
| **LocalNotificationRestoreReceiver** | `tools:node="remove"` | **REMOVED** from build | Prevents synchronous execution on boot stalls |
| **FileProvider** | `androidx.core.content.FileProvider`, `exported="false"` | **SECURE** | Uses scoped XML file paths (`res/xml/file_paths.xml`) |
| **Storage Permissions** | `READ_MEDIA_IMAGES`, `READ_EXTERNAL_STORAGE` (`tools:node="remove"`) | **SECURE** | Uses Android System Photo Picker (SAF) in compliance with Google Play |
| **Cleartext Traffic** | `android:usesCleartextTraffic="false"` | **SECURE** | TLS enforced system-wide via `network_security_config.xml` |
| **Android Backup** | `android:allowBackup="false"`, `android:fullBackupContent="false"` | **SECURE** | Prevents ADB backup extraction of local tokens |
| **Remote Web Debugging** | `webContentsDebuggingEnabled` in `capacitor.config.json` | **HIGH RISK PRIOR TO FIX** | **REMEDIATED**: Set to `false` for release builds |

---

## 2. In-Depth Android Findings

### 2.1 WebContentsDebuggingEnabled in Production (REMEDIATED)
- **Finding**: In `capacitor.config.json`, `"webContentsDebuggingEnabled": true` was enabled.
- **Risk**: In release builds, this allowed an attacker with physical USB access and ADB enabled to run `chrome://inspect`, attach Chrome DevTools to the running WebView, dump JavaScript heap memory, extract JWT tokens, and read chat messages.
- **Remediation**: Set `"webContentsDebuggingEnabled": false` in `capacitor.config.json`.

### 2.2 Deep Link & Intent Handling
- **Custom Scheme**: `com.collegedate.app://auth/callback` handles OAuth return.
- **App Links**: Uses HTTPS `android:autoVerify="true"` on `www.thecollegedate.com` with Digital Asset Links (`.well-known/assetlinks.json`) configured with SHA-256 fingerprint matching the Play Store release keystore.
- **No Path Hijacking**: Sensitive query params are processed in `AuthCallback.jsx` via PKCE and exchanged directly with Supabase GoTrue over TLS.

### 2.3 Token Storage & Cryptography
- **Capacitor Secure Storage**: On native Android, session tokens are managed via `@aparajita/capacitor-secure-storage` backed by Android KeyStore (`KeychainAccess.afterFirstUnlockThisDeviceOnly`).
- **Biometric Authentication**: Biometrics are managed via `@aparajita/capacitor-biometric-auth` using Android BiometricPrompt API with system hardware keystore backstop.

### 2.4 Code Obfuscation & R8/ProGuard
- `android/app/build.gradle` enforces:
  ```groovy
  buildTypes {
      release {
          minifyEnabled true
          shrinkResources true
          proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
      }
  }
  ```
- ProGuard rules (`proguard-rules.pro`) preserve essential plugin interfaces while stripping unused symbols and shrinking class definitions.

---

## 3. Play Store Policy & Release Verification

1. **Child Safety Standards**: Includes in-app reporting button `🛡️ Report Child Safety Concern` in chat/profile menus and settings modal, with emergency escalation protocol.
2. **Google Play Photo & Video Permissions**: Compliant with Android 13/14/15 Photo Picker; broad `READ_EXTERNAL_STORAGE` and `READ_MEDIA_IMAGES` permissions are stripped with `tools:node="remove"`.
3. **App Bundle Verification**: Signed with upload key (`college-date-release.jks`), verifies with Google Play App Signing.
