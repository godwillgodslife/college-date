async function test() {
  const res = await fetch('http://127.0.0.1:9222/json');
  const tabs = await res.json();
  console.log('Tabs:', tabs.map(t => ({ id: t.id, title: t.title, url: t.url, ws: t.webSocketDebuggerUrl })));
}
test().catch(console.error);
