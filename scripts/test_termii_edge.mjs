async function run() {
    const res = await fetch('https://gedoyoleoscgxgdqszzc.supabase.co/functions/v1/send-notification-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            phoneNumber: '12345',
            message: 'Test message'
        })
    });
    const data = await res.json();
    console.log('Status:', res.status, 'Response:', data);
}
run();
