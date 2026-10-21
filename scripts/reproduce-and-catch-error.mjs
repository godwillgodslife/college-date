import { connectEmulatorWebview } from './emulator-qa-controller.mjs';

async function main() {
    const c = await connectEmulatorWebview();
    
    c.ws.send(JSON.stringify({ id: 50, method: 'Runtime.enable' }));
    c.ws.send(JSON.stringify({ id: 51, method: 'Log.enable' }));

    const logs = [];
    c.ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.method === 'Runtime.consoleAPICalled') {
            const args = msg.params.args.map(a => a.value ?? a.description ?? JSON.stringify(a)).join(' ');
            logs.push(`[Console ${msg.params.type}] ${args}`);
        } else if (msg.method === 'Runtime.exceptionThrown') {
            logs.push(`[Exception] ${JSON.stringify(msg.params.exceptionDetails)}`);
        }
    });

    console.log('Clicking Try Again...');
    await c.click('button');
    await new Promise(r => setTimeout(r, 2000));

    console.log('Captured logs:');
    console.log(logs.join('\n'));

    c.screencap('native_screen_after_try_again.png');
    c.close();
}

main().catch(console.error);
