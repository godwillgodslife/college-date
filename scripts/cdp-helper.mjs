import WebSocket from 'ws';
import fs from 'node:fs';

const PORT = 9222;

async function getWsUrl() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json`);
  const pages = await res.json();
  const page = pages.find(p => p.type === 'page');
  if (!page) throw new Error('No page found');
  return page.webSocketDebuggerUrl.replace('localhost', '127.0.0.1');
}

export async function sendCommand(method, params = {}) {
  const wsUrl = await getWsUrl();
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const id = 1;
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error(`Timeout waiting for ${method}`));
    }, 15000);

    ws.on('open', () => {
      ws.send(JSON.stringify({ id, method, params }));
    });

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.id === id) {
          clearTimeout(timeout);
          ws.close();
          if (data.error) reject(new Error(JSON.stringify(data.error)));
          else resolve(data.result);
        }
      } catch (err) {
        clearTimeout(timeout);
        ws.close();
        reject(err);
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      ws.close();
      reject(err);
    });
  });
}

export async function evaluateJs(expression) {
  const result = await sendCommand('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return result.result?.value;
}

export async function captureScreenshot(outPath) {
  const result = await sendCommand('Page.captureScreenshot', { format: 'png' });
  const buf = Buffer.from(result.data, 'base64');
  fs.writeFileSync(outPath, buf);
  console.log(`Saved CDP screenshot to ${outPath} (${buf.length} bytes)`);
  return buf.length;
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'screenshot') {
  await captureScreenshot(arg || 'cdp_screen.png');
} else if (cmd === 'eval') {
  const res = await evaluateJs(arg);
  console.log(JSON.stringify(res, null, 2));
}
