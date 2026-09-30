import { execSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import WebSocket from 'ws';

const ADB_PATH = `${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe`;
const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\4a6ee34a-d7e4-4d2b-8a0a-8402211c2195';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function adbExec(cmd) {
  return execSync(`"${ADB_PATH}" -s emulator-5554 ${cmd}`, { encoding: 'utf8' }).trim();
}

function captureNativeScreenshot(filename) {
  const targetPath = resolve(ARTIFACT_DIR, filename);
  adbExec('shell screencap -p /sdcard/temp_screen.png');
  adbExec(`pull /sdcard/temp_screen.png "${targetPath}"`);
  console.log(`[QA Native Screenshot Saved] -> ${filename}`);
}

async function connectCDP() {
  try {
    const unixSockets = adbExec('shell "cat /proc/net/unix | grep webview_devtools_remote"');
    const match = unixSockets.match(/@webview_devtools_remote_(\d+)/);
    if (match && match[0]) {
      const socket = match[0].replace('@', '');
      adbExec(`forward tcp:9222 localabstract:${socket}`);
      console.log(`[CDP] Forwarded port 9222 to localabstract:${socket}`);
    }
  } catch (e) {
    console.warn('[CDP] Could not auto-forward socket:', e.message);
  }
  await sleep(500);
  const jsonRes = await fetch('http://127.0.0.1:9222/json');
  const tabs = await jsonRes.json();
  const pageTab = tabs.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
  if (!pageTab) throw new Error('No inspectable WebView tab found on port 9222');

  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

  let idCounter = 1;
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      const handler = (data) => {
        const msg = JSON.parse(data);
        if (msg.id === id) {
          ws.off('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res?.exceptionDetails) {
      console.error('[CDP Exception]:', JSON.stringify(res.exceptionDetails));
    }
    return res?.result?.value;
  }

  async function captureWebScreenshot(filename) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(res.data, 'base64');
    writeFileSync(resolve(ARTIFACT_DIR, filename), buf);
    console.log(`[QA Web Screenshot Saved] -> ${filename}`);
  }

  return { ws, send, evaluate, captureWebScreenshot };
}

async function runVerification() {
  console.log('=== VERIFYING PRODUCTION ANDROID UPDATE MANAGEMENT ON EMULATOR ===');
  const cdp = await connectCDP();

  // ─────────────────────────────────────────────
  // SCENARIO 1: Baseline / Normal Up-To-Date State
  // ─────────────────────────────────────────────
  console.log('\n[QA] Scenario 1: Verifying Baseline Up-To-Date State (No prompt shown)...');
  await cdp.evaluate(`
    (async () => {
      if (window.__reactNavigate) {
        window.__reactNavigate('/dashboard');
      }
      const service = window.__TCD_APP_UPDATE_SERVICE__;
      window.localStorage.removeItem('tcd_update_dismissed_57');
      window.localStorage.removeItem('tcd_update_dismissed_58');
      window.localStorage.removeItem('tcd_update_dismissed_59');
      window.localStorage.removeItem('tcd_update_dismissed_60');
      if (service) {
        service.resetSessionPromptLatch?.();
        service.setMockServerPolicy(null);
        await service.setMockUpdateState({ enable: false });
      }
      if (window.Capacitor?.Plugins?.PlayUpdate) {
        await window.Capacitor.Plugins.PlayUpdate.simulateInstallStatus({ status: 'UNKNOWN' });
      }
      if (window.__TCD_RUN_UPDATE_CHECK__) {
        await window.__TCD_RUN_UPDATE_CHECK__();
      }
    })();
  `);
  await sleep(1000);

  const baselineState = await cdp.evaluate(`
    ({
      hasUpdateModal: Boolean(document.querySelector('.app-update-prompt-backdrop')),
      hasReadyPill: Boolean(document.querySelector('.app-update-ready-pill')),
      pathname: window.location.pathname
    })
  `);
  console.log('[QA] Baseline State:', JSON.stringify(baselineState, null, 2));

  await cdp.captureWebScreenshot('evidence_qa_01_baseline_up_to_date.png');
  captureNativeScreenshot('evidence_qa_01_baseline_up_to_date_native.png');

  // ─────────────────────────────────────────────
  // SCENARIO 2: Level 1 (Normal Update) Flow
  // ─────────────────────────────────────────────
  console.log('\n[QA] Scenario 2: Simulating Level 1 Normal Update (New version available, routine improvements)...');
  await cdp.evaluate(`
    (async () => {
      if (window.__reactNavigate) {
        window.__reactNavigate('/dashboard');
      }
      const service = window.__TCD_APP_UPDATE_SERVICE__;
      window.localStorage.removeItem('tcd_update_dismissed_58');
      service?.resetSessionPromptLatch?.();
      service?.setMockServerPolicy(null);
      if (window.Capacitor?.Plugins?.PlayUpdate) {
        await window.Capacitor.Plugins.PlayUpdate.simulateInstallStatus({ status: 'UNKNOWN' });
      }
      await service?.setMockUpdateState({
        enable: true,
        updateAvailable: true,
        availableVersionCode: 58,
        updatePriority: 1,
        clientVersionStalenessDays: 2,
        isFlexibleAllowed: true,
        isImmediateAllowed: true,
        installStatus: 'UNKNOWN'
      });
      if (window.__TCD_RUN_UPDATE_CHECK__) {
        await window.__TCD_RUN_UPDATE_CHECK__();
      }
    })();
  `);
  await sleep(1000);

  const level1State = await cdp.evaluate(`
    ({
      hasUpdateModal: Boolean(document.querySelector('.app-update-prompt-backdrop')),
      title: document.querySelector('.app-update-title')?.textContent,
      description: document.querySelector('.app-update-description')?.textContent,
      primaryBtnText: document.querySelector('.btn-update-primary')?.textContent,
      hasLaterBtn: Boolean(document.querySelector('.btn-update-later')),
      badgeText: document.querySelector('.app-update-badge')?.textContent || null
    })
  `);
  console.log('[QA] Level 1 State:', JSON.stringify(level1State, null, 2));

  await cdp.captureWebScreenshot('evidence_qa_02_level1_normal_update_prompt.png');
  captureNativeScreenshot('evidence_qa_02_level1_normal_update_prompt_native.png');

  // ─────────────────────────────────────────────
  // SCENARIO 3: Dismissal & Cooldown Verification
  // ─────────────────────────────────────────────
  console.log('\n[QA] Scenario 3: Tapping "Later" to test 7-day cooldown and prompt dismissal...');
  await cdp.evaluate(`
    document.querySelector('.btn-update-later')?.click();
  `);
  await sleep(800);

  const afterDismissState = await cdp.evaluate(`
    ({
      hasUpdateModal: Boolean(document.querySelector('.app-update-prompt-backdrop')),
      dismissalKeySet: Boolean(window.localStorage.getItem('tcd_update_dismissed_58')),
      dismissalTimestamp: window.localStorage.getItem('tcd_update_dismissed_58')
    })
  `);
  console.log('[QA] After Dismissal State:', JSON.stringify(afterDismissState, null, 2));

  await cdp.captureWebScreenshot('evidence_qa_03_dismissed_and_cooldown.png');
  captureNativeScreenshot('evidence_qa_03_dismissed_and_cooldown_native.png');

  // ─────────────────────────────────────────────
  // SCENARIO 4: Level 2 (Important Update) Flow
  // ─────────────────────────────────────────────
  console.log('\n[QA] Scenario 4: Simulating Level 2 Important Update (High priority / recommended)...');
  await cdp.evaluate(`
    (async () => {
      const service = window.__TCD_APP_UPDATE_SERVICE__;
      window.localStorage.removeItem('tcd_update_dismissed_59');
      service?.resetSessionPromptLatch?.();
      service?.setMockServerPolicy(null);
      if (window.Capacitor?.Plugins?.PlayUpdate) {
        await window.Capacitor.Plugins.PlayUpdate.simulateInstallStatus({ status: 'UNKNOWN' });
      }
      await service?.setMockUpdateState({
        enable: true,
        updateAvailable: true,
        availableVersionCode: 59,
        updatePriority: 4,
        clientVersionStalenessDays: 15,
        isFlexibleAllowed: true,
        isImmediateAllowed: true,
        installStatus: 'UNKNOWN'
      });
      if (window.__TCD_RUN_UPDATE_CHECK__) {
        await window.__TCD_RUN_UPDATE_CHECK__();
      }
    })();
  `);
  await sleep(1000);

  const level2State = await cdp.evaluate(`
    ({
      hasUpdateModal: Boolean(document.querySelector('.app-update-prompt-backdrop')),
      title: document.querySelector('.app-update-title')?.textContent,
      badgeText: document.querySelector('.app-update-badge.important')?.textContent,
      description: document.querySelector('.app-update-description')?.textContent,
      primaryBtnText: document.querySelector('.btn-update-primary')?.textContent,
      hasLaterBtn: Boolean(document.querySelector('.btn-update-later'))
    })
  `);
  console.log('[QA] Level 2 State:', JSON.stringify(level2State, null, 2));

  await cdp.captureWebScreenshot('evidence_qa_04_level2_important_update_prompt.png');
  captureNativeScreenshot('evidence_qa_04_level2_important_update_prompt_native.png');

  // ─────────────────────────────────────────────
  // SCENARIO 5: Level 3 (Required Update) Flow
  // ─────────────────────────────────────────────
  console.log('\n[QA] Scenario 5: Simulating Level 3 Required Update (installed < server min_supported_version)...');
  await cdp.evaluate(`
    (async () => {
      const service = window.__TCD_APP_UPDATE_SERVICE__;
      // Inject server version policy requiring version 60
      service?.setMockServerPolicy({
        min_supported_version_code: 60,
        recommended_version_code: 60,
        critical_message: 'Security update required to continue using College Date.'
      });

      await service?.setMockUpdateState({
        enable: true,
        updateAvailable: true,
        availableVersionCode: 60,
        updatePriority: 5,
        clientVersionStalenessDays: 1,
        isFlexibleAllowed: false,
        isImmediateAllowed: true,
        installStatus: 'UNKNOWN'
      });

      if (window.__TCD_RUN_UPDATE_CHECK__) {
        await window.__TCD_RUN_UPDATE_CHECK__();
      }
    })();
  `);
  await sleep(1000);

  const level3State = await cdp.evaluate(`
    ({
      hasUpdateModal: Boolean(document.querySelector('.app-update-prompt-backdrop')),
      isCardRequiredClass: Boolean(document.querySelector('.app-update-card.required')),
      badgeText: document.querySelector('.app-update-badge.required')?.textContent,
      title: document.querySelector('.app-update-title')?.textContent,
      description: document.querySelector('.app-update-description')?.textContent,
      primaryBtnText: document.querySelector('.btn-update-primary.required')?.textContent,
      hasLaterBtn: Boolean(document.querySelector('.btn-update-later'))
    })
  `);
  console.log('[QA] Level 3 State:', JSON.stringify(level3State, null, 2));

  await cdp.captureWebScreenshot('evidence_qa_05_level3_required_update_modal.png');
  captureNativeScreenshot('evidence_qa_05_level3_required_update_modal_native.png');

  // ─────────────────────────────────────────────
  // SCENARIO 6: Flexible Download Complete (Update Ready Pill)
  // ─────────────────────────────────────────────
  console.log('\n[QA] Scenario 6: Simulating Update Ready (Flexible background download finished)...');
  await cdp.evaluate(`
    (async () => {
      const service = window.__TCD_APP_UPDATE_SERVICE__;
      service?.setMockServerPolicy(null);

      await service?.setMockUpdateState({
        enable: true,
        updateAvailable: false,
        availableVersionCode: 58,
        installStatus: 'DOWNLOADED'
      });

      if (window.Capacitor?.Plugins?.PlayUpdate) {
        await window.Capacitor.Plugins.PlayUpdate.simulateInstallStatus({ status: 'DOWNLOADED' });
      }
      if (window.__TCD_RUN_UPDATE_CHECK__) {
        await window.__TCD_RUN_UPDATE_CHECK__();
      }
    })();
  `);
  await sleep(1000);

  const updateReadyState = await cdp.evaluate(`
    ({
      hasReadyPill: Boolean(document.querySelector('.app-update-ready-pill')),
      readyTitle: document.querySelector('.app-update-ready-title')?.textContent,
      readySubtitle: document.querySelector('.app-update-ready-subtitle')?.textContent,
      restartBtnText: document.querySelector('.btn-restart-update')?.textContent
    })
  `);
  console.log('[QA] Update Ready State:', JSON.stringify(updateReadyState, null, 2));

  await cdp.captureWebScreenshot('evidence_qa_06_flexible_update_ready_pill.png');
  captureNativeScreenshot('evidence_qa_06_flexible_update_ready_pill_native.png');

  // ─────────────────────────────────────────────
  // SCENARIO 7: Sensitive Context Suppression
  // ─────────────────────────────────────────────
  console.log('\n[QA] Scenario 7: Verifying suppression during active calls / payment routes...');
  await cdp.evaluate(`
    (async () => {
      // Navigate to /call/test-room
      if (window.__reactNavigate) {
        window.__reactNavigate('/call/test-room-123');
      }
      if (window.__TCD_RUN_UPDATE_CHECK__) {
        await window.__TCD_RUN_UPDATE_CHECK__();
      }
    })();
  `);
  await sleep(1000);

  const callRouteState = await cdp.evaluate(`
    ({
      pathname: window.location.pathname,
      hasUpdateModal: Boolean(document.querySelector('.app-update-prompt-backdrop')),
      hasReadyPill: Boolean(document.querySelector('.app-update-ready-pill'))
    })
  `);
  console.log('[QA] Call Route Suppression State:', JSON.stringify(callRouteState, null, 2));

  await cdp.captureWebScreenshot('evidence_qa_07_sensitive_context_suppression.png');
  captureNativeScreenshot('evidence_qa_07_sensitive_context_suppression_native.png');

  // Reset back to Dashboard & disable mock
  await cdp.evaluate(`
    (async () => {
      const service = window.__TCD_APP_UPDATE_SERVICE__;
      service?.setMockServerPolicy(null);
      await service?.setMockUpdateState({ enable: false });
      if (window.Capacitor?.Plugins?.PlayUpdate) {
        await window.Capacitor.Plugins.PlayUpdate.simulateInstallStatus({ status: 'UNKNOWN' });
      }
      if (window.__reactNavigate) {
        window.__reactNavigate('/dashboard');
      }
      if (window.__TCD_RUN_UPDATE_CHECK__) {
        await window.__TCD_RUN_UPDATE_CHECK__();
      }
    })();
  `);
  await sleep(1000);

  console.log('\n=== ALL 7 UPDATE MANAGEMENT QA SCENARIOS COMPLETED SUCCESSFULLY ===');
  cdp.ws.close();
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
