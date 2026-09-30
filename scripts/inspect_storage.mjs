const res = await fetch("http://localhost:9223/json/list");
const targets = await res.json();
const target = targets[0];
const ws = new WebSocket(target.webSocketDebuggerUrl);

ws.addEventListener("open", async () => {
    ws.send(JSON.stringify({ 
        id: 1, 
        method: "Runtime.evaluate", 
        params: { 
            expression: `({
                storageOnboardingData: window.localStorage.getItem('onboarding_data'),
                storageStep: window.localStorage.getItem('onboarding_step')
            })`,
            returnByValue: true
        } 
    }));
});
ws.addEventListener("message", (e) => {
    console.log("Onboarding storage:", JSON.parse(e.data).result?.result?.value);
    ws.close();
    process.exit(0);
});
