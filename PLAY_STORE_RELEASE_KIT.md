# Google Play Store Release Kit

**App Name**: TheCollegeDate: Campus Dating  
**Package ID**: `com.thecollegedate.app`  
**Current Release Version**: `v2.2.66` (VersionCode `63`)  
**Target SDK**: Android 15 (API level 35)  
**Min SDK**: Android 8.0 (API level 26)  
**Distribution Track**: Production / Open Testing  

---

## 1. Store Listing Metadata

### App Title (Max 30 characters)
```text
TheCollegeDate: Campus Dating
```

### Short Description (Max 80 characters)
```text
Connect, date, and share secrets with verified university students near you.
```
*(Character count: 77 / 80)*

### Alternative Short Description (Max 80 characters)
```text
The premier dating and anonymous confession app for verified campus students.
```
*(Character count: 79 / 80)*

---

### Full Description (Max 4,000 characters)

```text
Welcome to TheCollegeDate — Nigeria’s #1 exclusive dating, connection, and anonymous secret-sharing community built specifically for verified university students!

Tired of generic dating apps flooded with fake profiles, bots, and scammers? TheCollegeDate is designed exclusively for the campus lifestyle. Connect with real students from your university and nearby campuses, explore shared faculties, chat securely, and share juicy campus confessions in complete privacy.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ WHY STUDENTS LOVE THECOLLEGEDATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎓 VERIFIED STUDENT PROFILES ONLY
Every profile goes through our real-time biometric and student verification engine. Look for the green "✓ Verified" tick on profiles to know you’re chatting with an actual student from UNILAG, UI, OAU, LASU, UNIBEN, Covenant, ABU, or any accredited Nigerian institution.

💘 INTELLIGENT OPPOSITE-GENDER CAMPUS DISCOVERY
Browse your campus FYP feed with smooth, responsive cards. Filter by university, department, study level, or interests. Our Cross-Campus Liquidity engine ensures you never run out of exciting student profiles, whether you’re on a bustling main campus or an expanding satellite college.

🤫 ANONYMOUS CAMPUS SECRETS & Q&A
Read and share unfiltered campus secrets, crush confessions, and late-night thoughts with 100% identity shielding. 
• Post anonymous secrets with custom stickers and photos.
• Receive anonymous questions via your personal /ask link.
• 1-tap WhatsApp Status & Instagram Story card generator — post branded 9:16 question cards directly to your status and collect anonymous answers!

💬 REAL-TIME CHAT & ICEBREAKERS
Break the ice effortlessly with campus-specific common ground prompts ("Both in 300L?", "Both love Jollof?"). Enjoy rich messaging with swipe-to-reply, emoji reactions, voice notes, and encrypted real-time delivery.

📞 CRYSTAL-CLEAR VOICE CALLS
Ready to hear their voice before meeting at the campus cafeteria? Enjoy high-definition, peer-to-peer voice calls powered by Agora RTC without sharing your personal phone number.

🏛️ CAMPUS COMMAND CENTER & DAILY STREAKS
Track your daily activity streaks, earn rewards, see who viewed your profile, and manage your student wallet seamlessly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 STUDENT SAFETY & DATA PRIVACY FIRST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your privacy and peace of mind are our absolute top priority:
• Strict Zero-Tolerance Harassment Policy: Easily block or report any profile with 1-tap in-app reporting.
• Nigeria Data Protection Act (NDPA 2023) Compliant: Your private data is never sold or shared with third parties.
• Complete Anonymity Shield: Anonymous confessions and asks are decoupled from your identity at the database level.
• Self-Service Account Deletion: Delete your account and all associated data anytime directly in Settings.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📲 COMPATIBILITY & SUPPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Optimized for all Android devices running Android 8.0 and above.
Fast, data-efficient, and lightweight with offline-first caching for smooth performance on campus Wi-Fi and mobile networks (MTN, Airtel, Glo, 9mobile).

Need support or want to request your campus?
Email: support@thecollegedate.com
Web: https://www.thecollegedate.com
Privacy Policy: https://www.thecollegedate.com/privacy.html
Terms of Service: https://www.thecollegedate.com/terms.html
```

---

## 2. "What's New in This Version" (Release Notes)

### Version `v2.2.66` (VersionCode `63`)
```text
What's new in v2.2.66:
• Streamlined Navigation: Cleaner 5-tab persistent bottom bar with instant Match landing.
• Avatar-First Profile: See student photos, badges, and verified status immediately above the fold.
• 1-Tap WhatsApp & IG Story Cards: Generate branded 9:16 Anonymous Q&A sticker cards directly for your WhatsApp status.
• Cross-Campus Liquidity: Expanded discovery pool ensures you never run out of campus profiles to swipe.
• Performance & Polish: Faster Confessions loading, smoother keyboard interactions, and enhanced chat stability.
```

---

## 3. Google Play App Review Credentials & Access Guide

When submitting builds for review in Google Play Console under **App Content > App Access**:

### App Access Setup
- **Access Option**: "All or some functionality is restricted"
- **Credentials Provided**: Yes

| Field | Value |
|---|---|
| **Account Name / Role** | Test Student Reviewer |
| **Username / Email** | `student.tester2026@gmail.com` |
| **Password** | `CollegeDate2026!Pass` |
| **Two-Factor Authentication** | None (Disabled for test account) |
| **Phone Number / SMS** | Not required |

### Reviewer Walkthrough Instructions
```text
1. Open the app on an Android device or emulator.
2. If greeted by the login screen, enter the credentials above and tap "Sign In".
3. The app lands directly on the "Match" tab displaying verified student cards.
   - Swipe Right to Like, Swipe Left to Pass.
   - Tap any card to view student interests, faculty, and compatibility insights.
4. Bottom Navigation Tabs:
   - Match: Campus discovery with opposite-gender filtering and Cross-Campus Liquidity.
   - Explore: Campus search with real-time faculty and interest filters.
   - Chats: Real-time messaging with swipe-to-reply, voice notes, and icebreakers.
   - Confessions: Anonymous campus secrets, daily campus question, and 1-tap WhatsApp Status card generator.
   - Profile: Avatar-first student profile, verification status, and Campus Command Center bridge.
5. In-App Features & Compliance:
   - Photo Verification unmounts automatically once verified.
   - Self-service account deletion is accessible under Profile > Settings > Delete Account.
   - Terms and Privacy links are available in-app and on the web.
```

---

## 4. Google Play Data Safety Declaration Summary

| Data Category | Data Type | Collected | Shared | Purpose | Optional / Required |
|---|---|---|---|---|---|
| **Location** | Approximate Location | Yes | No | Campus discovery & matching | Required |
| **Personal Info** | Name | Yes | No | Profile display | Required |
| **Personal Info** | Email address | Yes | No | Account authentication & security | Required |
| **Personal Info** | User IDs (UUID) | Yes | No | Account identification | Required |
| **Photos & Videos** | Photos | Yes | No | Student profile avatars & verification | Required |
| **Audio** | Voice recordings | Yes | No | Voice notes & in-app voice calls (Agora) | Optional |
| **Messages** | In-app messages | Yes | No | Chat functionality & anonymous Q&A | Optional |
| **Financial Info** | Purchase history | Yes | No | Premium subscriptions & wallet | Optional |
| **Device IDs** | Device ID / Push Token | Yes | No | Push notifications (OneSignal / FCM) | Optional |

- **Encryption in transit**: Yes, all traffic is encrypted over HTTPS (TLS 1.3).
- **Data deletion request**: Users can request account and data deletion directly in the app or via `https://www.thecollegedate.com/delete-account.html`.

---

## 5. Content Rating & Classification Guidelines
- **Category**: Dating / Social
- **Content Rating**: **Mature 17+** / **IARC 18+** (due to dating and user-generated social content).
- **Interactive Elements**: Users Interact, Shares Location, In-App Purchases.
- **Child-Directed**: No (Strictly restricted to university students 18+).
