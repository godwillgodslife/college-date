try {
    const res = await fetch('http://127.0.0.1:9222/json', {
        headers: { Connection: 'close' }
    });
    const data = await res.json();
    console.log('Targets from /json:', data);
} catch (e) {
    console.error('Fetch error on /json:', e.message);
}
