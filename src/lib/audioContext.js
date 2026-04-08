// ── Shared Audio System (Singleton) ──────────────────────────────────
// One AudioContext, warmed once on first click, shared by ALL components.

let ctx = null;
let warmed = false;

function getContext() {
    if (!ctx || ctx.state === 'closed') {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return ctx;
}

function warmUp() {
    if (warmed) return;
    warmed = true;
    try {
        const c = getContext();
        c.resume().then(() => {
            // Play a silent buffer to fully unlock
            const b = c.createBuffer(1, 1, 22050);
            const s = c.createBufferSource();
            s.buffer = b;
            s.connect(c.destination);
            s.start(0);
            console.log('[Audio] Global AudioContext warmed ✓ state:', c.state);
        });
    } catch (e) {
        console.warn('[Audio] Warm-up failed:', e);
    }
    ['click', 'touchstart', 'keydown'].forEach(e =>
        document.removeEventListener(e, warmUp, true)
    );
}

// Auto-attach warm-up to first user gesture
if (typeof document !== 'undefined') {
    ['click', 'touchstart', 'keydown'].forEach(e =>
        document.addEventListener(e, warmUp, { capture: true })
    );
}

// ── Sound Players ────────────────────────────────────────────────────

export async function playNotificationDing() {
    try {
        const c = getContext();
        await c.resume();
        const now = c.currentTime;
        [660, 880].forEach((freq, i) => {
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.1);
            gain.gain.setValueAtTime(0.5, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.4);
            osc.connect(gain);
            gain.connect(c.destination);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.4);
        });
        console.log('[Audio] Ding played ✓');
    } catch (e) {
        console.warn('[Audio] Ding failed:', e);
    }
}

export async function playSendSwoosh() {
    try {
        const c = getContext();
        await c.resume();
        const now = c.currentTime;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(now);
        osc.stop(now + 0.12);
        console.log('[Audio] Swoosh played ✓');
    } catch (e) {
        console.warn('[Audio] Swoosh failed:', e);
    }
}

export async function playMatchSuccess() {
    try {
        const c = getContext();
        await c.resume();
        const now = c.currentTime;
        // Ascending celebratory three-tone chime
        [523, 659, 784].forEach((freq, i) => {
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.15);
            gain.gain.setValueAtTime(0.5, now + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.6);
            osc.connect(gain);
            gain.connect(c.destination);
            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.6);
        });
        console.log('[Audio] Match success chime played ✓');
    } catch (e) {
        console.warn('[Audio] Match chime failed:', e);
    }
}

export async function playCardSwipe() {
    try {
        const c = getContext();
        await c.resume();
        const now = c.currentTime;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.stop(now + 0.1);
    } catch (e) {}
}

export async function playLikePop() {
    try {
        const c = getContext();
        await c.resume();
        const now = c.currentTime;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';
        // Soft, heart-like ascending bloop
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(now);
        osc.stop(now + 0.15);
        console.log('[Audio] Like pop played ✓');
    } catch (e) {}
}

export async function playViewChime() {
    try {
        const c = getContext();
        await c.resume();
        const now = c.currentTime;
        // Two quick short high-frequency chirps (Radar feel)
        [1200, 1500].forEach((freq, i) => {
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);
            gain.gain.setValueAtTime(0.15, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.05);
            osc.connect(gain);
            gain.connect(c.destination);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.05);
        });
        console.log('[Audio] View radar chirped ✓');
    } catch (e) {}
}

export async function playSocialFlutter() {
    try {
        const c = getContext();
        await c.resume();
        const now = c.currentTime;
        // Fast, sparkly descending multi-tone flutter
        [1000, 800, 600].forEach((freq, i) => {
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.05);
            gain.gain.setValueAtTime(0.2, now + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.15);
            osc.connect(gain);
            gain.connect(c.destination);
            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.15);
        });
        console.log('[Audio] Social flutter played ✓');
    } catch (e) {}
}

export async function playMoneySound() {
    try {
        const c = getContext();
        await c.resume();
        const now = c.currentTime;
        // MetallicDescending clink (Cash register style)
        [1500, 500].forEach((freq, i) => {
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = i === 0 ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.02);
            gain.gain.setValueAtTime(0.3, now + i * 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.02 + 0.3);
            osc.connect(gain);
            gain.connect(c.destination);
            osc.start(now + i * 0.02);
            osc.stop(now + i * 0.02 + 0.3);
        });
        console.log('[Audio] Payment ching played ✓');
    } catch (e) {}
}

export async function playSystemPock() {
    try {
        const c = getContext();
        await c.resume();
        const now = c.currentTime;
        // Subtle, neutral high-frequency pock
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(now);
        osc.stop(now + 0.02);
    } catch (e) {}
}

