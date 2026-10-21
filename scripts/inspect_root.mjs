import { connectEmulatorWebview } from './emulator-qa-controller.mjs';

async function main() {
    const c = await connectEmulatorWebview();
    const html = await c.evaluate('document.getElementById("root")?.innerHTML || document.body.innerHTML');
    console.log('HTML length:', html?.length);
    console.log('HTML snippet:', html?.slice(0, 500));
    const url = await c.evaluate('window.location.href');
    console.log('Current URL:', url);
    c.close();
}

main().catch(console.error);
