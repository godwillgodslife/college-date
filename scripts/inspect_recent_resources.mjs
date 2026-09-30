import { evalInPage } from './cdp_helper.mjs';

async function inspectRequests() {
    const entries = await evalInPage(`
        window.performance.getEntriesByType('resource').filter(r => r.name.includes('supabase.co/rest')).map(r => ({
            name: decodeURIComponent(r.name.replace('https://gedoyoleoscgxgdqszzc.supabase.co/rest/v1/', '')),
            duration: Math.round(r.duration),
            size: r.transferSize
        })).slice(-30)
    `, '9224');
    console.log(JSON.stringify(entries, null, 2));
}
inspectRequests();
