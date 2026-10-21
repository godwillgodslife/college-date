import WebSocket from 'ws';

async function test() {
  const res = await fetch('http://127.0.0.1:9222/json');
  const pages = await res.json();
  const page = pages.find(p => p.type === 'page' && p.title) || pages[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: '({ avatarBtns: Array.from(document.querySelectorAll("button")).map(b => ({ class: b.className, text: b.textContent.trim(), aria: b.getAttribute("aria-label"), title: b.getAttribute("title") })).filter(b => b.class.includes("status") || b.aria?.includes("Status") || b.title?.includes("Status") || b.class.includes("avatar")), profileAvatar: !!document.querySelector(".profile-avatar-container") })',
      returnByValue: true
    }
  }));
  ws.onmessage = evt => {
    console.log(JSON.stringify(JSON.parse(evt.data), null, 2));
    ws.close();
    process.exit(0);
  };
}
test().catch(console.error);
