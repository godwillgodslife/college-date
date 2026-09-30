import WebSocket from 'ws';

async function test() {
  const jsonRes = await fetch('http://127.0.0.1:9222/json');
  const tabs = await jsonRes.json();
  const pageTab = tabs.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise((r) => ws.on('open', r));

  let id = 1;
  function send(method, params) {
    return new Promise((resolve) => {
      const curId = id++;
      const handler = (data) => {
        const msg = JSON.parse(data);
        if (msg.id === curId) {
          ws.off('message', handler);
          resolve(msg.result);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });
  }

  const res = await send('Runtime.evaluate', {
    expression: `(async () => {
      const service = window.__TCD_APP_UPDATE_SERVICE__;
      window.localStorage.removeItem('tcd_update_dismissed_58');
      service?.resetSessionPromptLatch?.();
      service?.setMockServerPolicy(null);

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
      await new Promise(r => setTimeout(r, 600));

      return {
        promptState: window.__TCD_UPDATE_PROMPT_STATE__,
        dom: {
          hasModal: Boolean(document.querySelector('.app-update-prompt-backdrop')),
          title: document.querySelector('.app-update-title')?.textContent,
          badgeText: document.querySelector('.app-update-badge')?.textContent || null,
          primaryBtn: document.querySelector('.btn-update-primary')?.textContent,
          hasLaterBtn: Boolean(document.querySelector('.btn-update-later'))
        }
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Result:', JSON.stringify(res?.result?.value, null, 2));
  process.exit(0);
}

test().catch(console.error);
