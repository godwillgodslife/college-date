import WebSocket from 'ws';
import fs from 'node:fs';

async function run() {
  const res = await fetch('http://127.0.0.1:9222/json');
  const pages = await res.json();
  const page = pages.find(p => p.type === 'page' && p.title) || pages[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: 'localStorage.getItem("sb-gedoyoleoscgxgdqszzc-auth-token")',
      returnByValue: true
    }
  }));
  ws.onmessage = evt => {
    const data = JSON.parse(evt.data);
    const token = data.result?.result?.value;
    console.log('Emulator token length:', token ? token.length : 0);
    if (token) {
      fs.writeFileSync('scripts/emulator_token.json', token);
      console.log('Saved scripts/emulator_token.json');
    }
    ws.close();
  };
}
run().catch(console.error);
