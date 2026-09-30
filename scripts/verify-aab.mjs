import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

const root = process.cwd();
const aabPath = resolve(root, process.argv[2] || 'android/app/build/outputs/bundle/release/app-release.aab');
const expectedPackage = 'com.collegedate.app';

function getJarPath() {
  if (process.env.JAVA_HOME) {
    const localJar = join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'jar.exe' : 'jar');
    if (existsSync(localJar)) {
      return localJar;
    }
  }
  return 'jar';
}
const jarPath = getJarPath();
const envFile = existsSync(join(root, '.env')) ? readFileSync(join(root, '.env'), 'utf8') : '';
const revenueCatAndroidKey = (envFile.match(/^VITE_REVENUECAT_ANDROID_KEY=(.+)$/m)?.[1] || '').trim();
const blockedSecretPatterns = [
  {
    pattern: /VITE_ZEGO_SERVER_SECRET|ZEGO_SERVER_SECRET/i,
    message: 'Zego server secret variable',
  },
  {
    pattern: /VITE_AGORA_APP_CERTIFICATE|AGORA_APP_CERTIFICATE/i,
    message: 'Agora app certificate variable',
  },
];

function fail(message) {
  console.error(`AAB verification failed: ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`OK: ${message}`);
}

if (!existsSync(aabPath)) fail(`Bundle not found: ${aabPath}`);

const listing = execFileSync(jarPath, ['tf', aabPath], { encoding: 'utf8' });
const blockedEntries = [
  /\.apk$/i,
  /private-downloads/i,
  /TheCollegeDate-native-prototype-debug/i,
  /assets\/public\/evidence/i,
];

for (const pattern of blockedEntries) {
  if (pattern.test(listing)) fail(`Bundle contains blocked entry matching ${pattern}`);
}
ok('No private APK/private-download or test evidence assets are bundled.');

const { statSync } = await import('node:fs');
const bundleStats = statSync(aabPath);
if (bundleStats.size > 30 * 1024 * 1024) {
  fail(`Bundle size (${(bundleStats.size / 1024 / 1024).toFixed(1)} MB) exceeds 30 MB threshold.`);
}
ok(`Bundle size is ${(bundleStats.size / 1024 / 1024).toFixed(1)} MB (under 30 MB threshold).`);

const buildGradle = readFileSync(join(root, 'android', 'app', 'build.gradle'), 'utf8');
const versionCodeMatch = buildGradle.match(/\bversionCode\s+(\d+)/);
const versionNameMatch = buildGradle.match(/\bversionName\s+"([^"]+)"/);

if (!versionCodeMatch) fail('versionCode not found in android/app/build.gradle.');
if (!versionNameMatch) fail('versionName not found in android/app/build.gradle.');

const expectedVersionCode = versionCodeMatch[1];
const expectedVersionName = versionNameMatch[1];

if (!buildGradle.includes(`applicationId "${expectedPackage}"`)) fail(`Expected package ${expectedPackage} not found.`);
if (!buildGradle.includes(`versionCode ${expectedVersionCode}`)) fail(`Expected versionCode ${expectedVersionCode} not found.`);
if (!buildGradle.includes(`versionName "${expectedVersionName}"`)) fail(`Expected versionName ${expectedVersionName} not found.`);
ok(`${expectedPackage} ${expectedVersionName} (${expectedVersionCode}) configured.`);

const variablesGradle = readFileSync(join(root, 'android', 'variables.gradle'), 'utf8');
if (!/targetSdkVersion\s*=\s*(3[5-9]|[4-9][0-9])/.test(variablesGradle)) {
  fail('targetSdkVersion must be 35 or higher.');
}
ok('targetSdkVersion is Play-compliant.');

if (!existsSync(join(root, 'android', 'app', 'google-services.json'))) {
  fail('android/app/google-services.json is missing.');
}
ok('Firebase google-services.json exists.');

const manifest = readFileSync(join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'), 'utf8');
if (!manifest.includes('android:allowBackup="false"')) fail('Android backup must be disabled for release.');
if (!manifest.includes('android:usesCleartextTraffic="false"')) fail('Cleartext traffic must remain disabled.');
ok('Android manifest security flags are set.');

const forbiddenMediaPerms = [
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE'
];
for (const perm of forbiddenMediaPerms) {
  const regex = new RegExp(`<uses-permission[^>]*${perm}[^>]*>`, 'g');
  const matches = manifest.match(regex) || [];
  for (const match of matches) {
    if (!match.includes('tools:node="remove"')) {
      fail(`Google Play Photo & Video Policy Violation: ${perm} must not be requested.`);
    }
  }
}
ok('Google Play Photo & Video policy compliance: broad media & storage permissions excluded.');

if (!revenueCatAndroidKey) {
  fail('VITE_REVENUECAT_ANDROID_KEY is missing from .env.');
}
if (revenueCatAndroidKey.startsWith('test_')) {
  fail('Android RevenueCat key is still a Test Store key.');
}
ok('Android RevenueCat key is not a Test Store key.');

const tempDir = mkdtempSync(join(tmpdir(), 'the-college-date-aab-'));
try {
  execFileSync(jarPath, ['xf', aabPath], { cwd: tempDir, stdio: 'ignore' });
  const extractedListing = execFileSync('cmd', ['/c', 'dir', '/s', '/b'], { cwd: tempDir, encoding: 'utf8' });
  for (const pattern of blockedEntries) {
    if (pattern.test(extractedListing)) fail(`Extracted bundle contains blocked file matching ${pattern}`);
  }

  const searchableFiles = extractedListing
    .split(/\r?\n/)
    .filter((file) => /\.(js|html|json|xml|txt|properties)$/i.test(file))
    .slice(0, 5000);

  for (const file of searchableFiles) {
    let content = '';
    try {
      content = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const { pattern, message } of blockedSecretPatterns) {
      if (pattern.test(content)) fail(`${message} found in ${basename(file)}`);
    }
  }
  ok('No obvious test keys or call-provider secret leakage found in extracted text assets.');
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

console.log(`AAB verification passed: ${aabPath}`);
