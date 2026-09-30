// scripts/cdp-eval.mjs
const expr = process.argv.slice(2).join(' ') || 'location.href';

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/list');
  const pages = await res.json();
  const page = pages[0];
  if (!page || !page.webSocketDebuggerUrl) {
    console.error('No debugger URL found');
    process.exit(1);
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  const msgId = 1;
  const payload = {
    id: msgId,
    method: 'Runtime.evaluate',
    params: {
      expression: expr,
      returnByValue: true,
      awaitPromise: true
    }
  };

  ws.send(JSON.stringify(payload));

  await new Promise((resolve) => {
    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.id === msgId) {
        if (data.result?.result) {
          console.log(JSON.stringify(data.result.result.value, null, 2));
        } else if (data.result?.exceptionDetails) {
          console.error('Exception:', data.result.exceptionDetails);
        } else {
          console.log(JSON.stringify(data, null, 2));
        }
        ws.close();
        resolve();
      }
    };
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
