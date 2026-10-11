import WebSocket from 'ws';

async function evalInWebview(expression) {
  const targets = await fetch('http://localhost:9222/json').then(r => r.json());
  const page = targets.find(t => t.type === 'page');
  if (!page) {
    console.error('No page target found');
    return;
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl);

  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

  const id = 1;
  const msg = JSON.stringify({
    id,
    method: 'Runtime.evaluate',
    params: {
      expression,
      returnByValue: true,
      awaitPromise: true
    }
  });

  ws.send(msg);

  const result = await new Promise((resolve) => {
    ws.on('message', (data) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.id === id) {
        resolve(parsed.result);
      }
    });
  });

  ws.close();
  return result;
}

async function main() {
  console.log('--- INSPECTING ANDROID WEBVIEW RUNTIME ---');
  
  // 1. Check window.__TCD_PUSH_DEBUG_STATE__
  const debugState = await evalInWebview('window.__TCD_PUSH_DEBUG_STATE__');
  console.log('window.__TCD_PUSH_DEBUG_STATE__:', JSON.stringify(debugState?.result?.value, null, 2));

  // 2. Check localStorage auth session
  const authSession = await evalInWebview(`
    (() => {
      return {
        hasCapacitor: Boolean(window.Capacitor),
        platform: window.Capacitor?.getPlatform?.(),
        isNative: window.Capacitor?.isNativePlatform?.(),
        deviceId: localStorage.getItem('tcd_notification_device_id'),
        notificationPermission: window.Notification?.permission,
        currentPath: window.location.pathname
      };
    })()
  `);
  console.log('Client State:', JSON.stringify(authSession?.result?.value, null, 2));

  // 3. Inspect OneSignal native plugin directly inside WebView
  const oneSignalInspect = await evalInWebview(`
    (async () => {
      try {
        const { default: OneSignal } = await import('@onesignal/capacitor-plugin');
        const hasPermission = await OneSignal.Notifications.hasPermission();
        const subId = await OneSignal.User.pushSubscription.getIdAsync();
        const token = await OneSignal.User.pushSubscription.getTokenAsync();
        const optedIn = OneSignal.User.pushSubscription.optedIn;
        return {
          success: true,
          hasPermission,
          subscriptionId: subId,
          pushToken: token ? (token.slice(0, 10) + '...' + token.slice(-6)) : null,
          optedIn
        };
      } catch (e) {
        return { success: false, error: e.message };
      }
    })()
  `);
  console.log('OneSignal Native Plugin Live State:', JSON.stringify(oneSignalInspect?.result?.value, null, 2));
}

main().catch(console.error);
