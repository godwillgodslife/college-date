# 🔐 Signing Setup for TheCollegeDate Android App
## (SIGNING_SETUP.md — Keep this file, never commit keystore.properties or .jks to Git)

---

## Step 1: Generate the Keystore

Run this command **once** from your project root. Choose strong passwords and keep them safe — if you lose this keystore, you can NEVER update your Play Store app.

```powershell
keytool -genkey -v `
  -keystore android\app\college-date-release.jks `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000 `
  -alias collegedate `
  -dname "CN=TheCollegeDate, OU=Mobile, O=CollegeDate, L=Lagos, S=Lagos, C=NG"
```

You will be prompted to set:
- **Keystore Password** — remember this!
- **Key Password** — can be same as keystore password

---

## Step 2: Create `android/keystore.properties`

Create the file `android/keystore.properties` (it's already in `.gitignore`) with:

```properties
storeFile=app/college-date-release.jks
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=collegedate
keyPassword=YOUR_KEY_PASSWORD
```

> ⚠️ NEVER commit this file or the .jks file to Git.
> The `.gitignore` already excludes `*.jks` and `keystore.properties`.

---

## Step 3: Build the Release AAB

```powershell
# From project root:
npm run build
npx cap copy
npx cap sync android

# Then build the AAB:
cd android
.\gradlew bundleRelease
```

The AAB will be at:
`android\app\build\outputs\bundle\release\app-release.aab`

Upload this file to the Google Play Console.

---

## Step 4: Enroll in Play App Signing (Recommended)

In the Play Console, let Google manage your signing key. You upload a one-time "upload key" (your .jks) and Google re-signs it with their key. This way, even if you lose your keystore, Google can still sign updates.

---

## Keystore Backup Checklist
- [ ] Backed up `.jks` file to a secure location (not in the project)
- [ ] Backed up passwords to a password manager
- [ ] `keystore.properties` added to `.gitignore` ✅ (already done)
- [ ] `.jks` file pattern added to `.gitignore` ✅ (already done)
