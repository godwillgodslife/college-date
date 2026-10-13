import WebSocket from 'ws';

const SUPABASE_URL = 'https://gedoyoleoscgxgdqszzc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZG95b2xlb3NjZ3hnZHFzenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQ4ODcsImV4cCI6MjA4NjQwMDg4N30.pVnlTBOwxYSFgC0fQ2Wo1oEsrBWak6X2FBBeNGariys';

async function main() {
  const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({
      email: 'student.tester2026@gmail.com',
      password: 'CollegeDate2026!VerifiedPass'
    })
  });
  const session = await tokenRes.json();
  if (!session.access_token) throw new Error('Login failed: ' + JSON.stringify(session));
  console.log('Got session for:', session.user.email);

  const adbPath = 'C:\\\\Users\\\\DELL\\\\AppData\\\\Local\\\\Android\\\\Sdk\\\\platform-tools\\\\adb.exe';
  const { execSync } = await import('node:child_process');
  const unixSockets = execSync(`"${adbPath}" -s emulator-5554 shell "cat /proc/net/unix | grep webview_devtools_remote"`).toString();
  const match = unixSockets.match(/@(webview_devtools_remote_\\d+)/);
  if (match) {
    try { execSync(`"${adbPath}" -s emulator-5554 forward --remove tcp:9222`); } catch (_) {}
    execSync(`"${adbPath}" -s emulator-5554 forward tcp:9222 localabstract:${match[1]}`);
  }

  const targetsJson = execSync('C:\\\\Windows\\\\System32\\\\curl.exe -s http://127.0.0.1:9222/json').toString();
  const targets = JSON.parse(targetsJson);
  const page = targets.find(t => t.type === 'page');

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });

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

  const sessionStr = JSON.stringify(session);
  await evaluate(`(() => {
    localStorage.setItem("sb-gedoyoleoscgxgdqszzc-auth-token", ${JSON.stringify(sessionStr)});
    window.location.href = '/chat';
  })()`);

  console.log('Session injected, navigated to /chat');
  ws.close();
}

main().catch(console.error);
