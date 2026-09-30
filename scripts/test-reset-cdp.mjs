import WebSocket from 'ws';

async function run() {
  const pages = await fetch('http://127.0.0.1:9223/json').then(r => r.json());
  const page = pages.find(p => p.type === 'page');
  if (!page) {
    console.error('No page found');
    return;
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  ws.on('open', () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: 
          (function() {
            const btn = document.querySelector('button[type="submit"]');
            if (btn) {
              btn.click();
              return 'Clicked submit button: ' + btn.innerText;
            }
            return 'Button not found';
          })()
        ,
        returnByValue: true
      }
    }));
  });
  ws.on('message', (data) => {
    console.log('Result:', JSON.parse(data.toString()));
    ws.close();
  });
}
run();
