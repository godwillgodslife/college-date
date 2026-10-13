import WebSocket from 'ws';

async function main() {
  const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/889DDF51882B14D1858312C58C18C37F');
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

  let idCounter = 1;
  function evaluate(expr) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      const handler = (data) => {
        const msg = JSON.parse(data);
        if (msg.id === id) {
          ws.removeListener('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result?.result?.value);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({
        id,
        method: 'Runtime.evaluate',
        params: { expression: expr, returnByValue: true, awaitPromise: true }
      }));
    });
  }

  const authState = await evaluate(`(() => {
    const keys = Object.keys(localStorage);
    const authKey = keys.find(k => k.includes('auth-token'));
    const authVal = authKey ? JSON.parse(localStorage.getItem(authKey)) : null;
    return {
      authKey,
      userEmail: authVal?.user?.email,
      userId: authVal?.user?.id
    };
  })()`);

  console.log('Current Auth State in App:', authState);

  // Check OneSignal subscription in window
  const oneSignalState = await evaluate(`(async () => {
    let subId = null;
    let optIn = null;
    try {
      if (window.OneSignal) {
        subId = await window.OneSignal.User?.pushSubscription?.id;
        optIn = await window.OneSignal.User?.pushSubscription?.optedIn;
      }
    } catch(e) {
      subId = 'Error: ' + e.message;
    }
    return {
      hasOneSignal: Boolean(window.OneSignal),
      subId,
      optIn
    };
  })()`);

  console.log('OneSignal Client State:', oneSignalState);
  ws.close();
}

main().catch(console.error);
