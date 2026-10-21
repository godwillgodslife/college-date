import { connectEmulatorWebview } from './emulator-qa-controller.mjs';

async function main() {
    const c = await connectEmulatorWebview();
    
    // Check if error boundary captured error details or if there are console errors
    const errorInfo = await c.evaluate(`
        (() => {
            const errEl = document.querySelector('.error-boundary-details, .error-message, pre');
            return {
                text: document.body.innerText,
                errText: errEl?.innerText || 'No error element found'
            };
        })()
    `);
    console.log('Error info:', errorInfo);
    c.close();
}

main().catch(console.error);
