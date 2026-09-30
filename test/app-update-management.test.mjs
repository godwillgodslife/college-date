import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  UPDATE_SEVERITY,
  evaluateUpdateSeverity,
  isUpdateInCooldown
} from '../src/services/appUpdateService.js';

test('Update Severity Model: Level 3 (Required Update) when installed is below server min_supported_version_code', () => {
  const result = evaluateUpdateSeverity({
    currentVersionCode: 55,
    availableVersionCode: 57,
    updatePriority: 0,
    clientVersionStalenessDays: 1,
    serverPolicy: {
      min_supported_version_code: 56,
      recommended_version_code: 57,
      critical_message: 'Security update required to continue using College Date.'
    },
    updateAvailable: true
  });

  assert.equal(result.severity, UPDATE_SEVERITY.REQUIRED);
  assert.equal(result.preferredType, 'IMMEDIATE');
  assert.equal(result.isAllowed, true);
  assert.match(result.reason, /Security update required/);
});

test('Update Severity Model: Level 2 (Important Update) when Google Play priority >= 4 or staleness >= 14d', () => {
  // Test case A: High priority (priority 4)
  const resultPriority = evaluateUpdateSeverity({
    currentVersionCode: 56,
    availableVersionCode: 57,
    updatePriority: 4,
    clientVersionStalenessDays: 2,
    serverPolicy: null,
    updateAvailable: true
  });

  assert.equal(resultPriority.severity, UPDATE_SEVERITY.IMPORTANT);
  assert.equal(resultPriority.preferredType, 'FLEXIBLE');

  // Test case B: Stale update (15 days)
  const resultStale = evaluateUpdateSeverity({
    currentVersionCode: 56,
    availableVersionCode: 57,
    updatePriority: 2,
    clientVersionStalenessDays: 15,
    serverPolicy: null,
    updateAvailable: true
  });

  assert.equal(resultStale.severity, UPDATE_SEVERITY.IMPORTANT);
  assert.equal(resultStale.preferredType, 'FLEXIBLE');

  // Test case C: Server recommends update
  const resultRecommended = evaluateUpdateSeverity({
    currentVersionCode: 56,
    availableVersionCode: 57,
    updatePriority: 1,
    clientVersionStalenessDays: 1,
    serverPolicy: {
      min_supported_version_code: 50,
      recommended_version_code: 57
    },
    updateAvailable: true
  });

  assert.equal(resultRecommended.severity, UPDATE_SEVERITY.IMPORTANT);
});

test('Update Severity Model: Level 1 (Normal Update) for routine releases', () => {
  const result = evaluateUpdateSeverity({
    currentVersionCode: 56,
    availableVersionCode: 57,
    updatePriority: 1,
    clientVersionStalenessDays: 3,
    serverPolicy: {
      min_supported_version_code: 50,
      recommended_version_code: 56
    },
    updateAvailable: true
  });

  assert.equal(result.severity, UPDATE_SEVERITY.NORMAL);
  assert.equal(result.preferredType, 'FLEXIBLE');
  assert.match(result.reason, /improvements/i);
});

test('Update Severity Model: No update when current version is latest and not below minimum', () => {
  const result = evaluateUpdateSeverity({
    currentVersionCode: 57,
    availableVersionCode: 57,
    updatePriority: 0,
    clientVersionStalenessDays: 0,
    serverPolicy: {
      min_supported_version_code: 50,
      recommended_version_code: 57
    },
    updateAvailable: false
  });

  assert.equal(result.severity, null);
  assert.equal(result.isAllowed, false);
});

test('Smart Frequency & Cooldown: Level 3 Required Update is NEVER in cooldown', () => {
  const inCooldown = isUpdateInCooldown(57, UPDATE_SEVERITY.REQUIRED);
  assert.equal(inCooldown, false, 'Required updates must never be suppressed by cooldown');
});

test('Android Native & Play Core Integration: build.gradle, ProGuard, and Plugin integrity', () => {
  const root = process.cwd();

  // 1. Verify build.gradle includes official Play Core app-update
  const buildGradlePath = resolve(root, 'android/app/build.gradle');
  assert.ok(existsSync(buildGradlePath), 'android/app/build.gradle exists');
  const buildGradleContent = readFileSync(buildGradlePath, 'utf8');
  assert.match(buildGradleContent, /com\.google\.android\.play:app-update:2\.1\.0/, 'Must include official Play Core app-update 2.1.0 dependency');

  // 2. Verify ProGuard keeps Play Core classes
  const proguardPath = resolve(root, 'android/app/proguard-rules.pro');
  assert.ok(existsSync(proguardPath), 'android/app/proguard-rules.pro exists');
  const proguardContent = readFileSync(proguardPath, 'utf8');
  assert.match(proguardContent, /com\.google\.android\.play\.core\.\*\*/, 'Must include Play Core ProGuard keep rules');

  // 3. Verify PlayUpdatePlugin.java native plugin exists and has complete API methods
  const pluginPath = resolve(root, 'android/app/src/main/java/com/collegedate/app/plugins/PlayUpdatePlugin.java');
  assert.ok(existsSync(pluginPath), 'PlayUpdatePlugin.java must exist');
  const pluginContent = readFileSync(pluginPath, 'utf8');
  assert.match(pluginContent, /@CapacitorPlugin\(name = "PlayUpdate"/, 'Must be annotated with @CapacitorPlugin(name = "PlayUpdate")');
  assert.match(pluginContent, /getAppUpdateInfo/, 'Must declare getAppUpdateInfo');
  assert.match(pluginContent, /startFlexibleUpdate/, 'Must declare startFlexibleUpdate');
  assert.match(pluginContent, /startImmediateUpdate/, 'Must declare startImmediateUpdate');
  assert.match(pluginContent, /completeFlexibleUpdate/, 'Must declare completeFlexibleUpdate');
  assert.match(pluginContent, /checkResumeState/, 'Must declare checkResumeState');

  // 4. Verify MainActivity registers PlayUpdatePlugin and hooks onResume
  const mainActivityPath = resolve(root, 'android/app/src/main/java/com/collegedate/app/MainActivity.java');
  assert.ok(existsSync(mainActivityPath), 'MainActivity.java must exist');
  const mainActivityContent = readFileSync(mainActivityPath, 'utf8');
  assert.match(mainActivityContent, /registerPlugin\(PlayUpdatePlugin\.class\)/, 'Must register PlayUpdatePlugin with Capacitor bridge');
  assert.match(mainActivityContent, /checkResumeState/, 'MainActivity must invoke checkResumeState in onResume');
});
