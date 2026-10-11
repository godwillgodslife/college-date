import { evalInPage } from './cdp_helper.mjs';

async function run() {
    process.env.CDP_PORT = '9222';
    const res = await evalInPage(`(() => {
        let el = document.querySelector('.test-teaser');
        if (!el) {
            el = document.createElement('div');
            el.className = 'viewer-teaser-card test-teaser';
            el.innerHTML = '<div class="teaser-content"><div class="viewer-avatars-blur"><div class="blur-dot dot-1"></div><div class="blur-dot dot-2"></div><div class="blur-dot dot-3"></div></div><div class="teaser-text"><span class="teaser-highlight">👀 2 people</span> viewed your profile today</div></div><div class="teaser-arrow">→</div>';
            const streak = document.querySelector('.dashboard-streak-card');
            streak.parentNode.insertBefore(el, streak);
        }
        const bHero = document.querySelector('.dashboard-hero-content').getBoundingClientRect();
        const bTeaser = el.getBoundingClientRect();
        const bStreak = document.querySelector('.dashboard-streak-card').getBoundingClientRect();
        return {
            hero: { left: bHero.left, right: bHero.right, width: bHero.width },
            teaser: { left: bTeaser.left, right: bTeaser.right, width: bTeaser.width },
            streak: { left: bStreak.left, right: bStreak.right, width: bStreak.width }
        };
    })()`);
    console.log('Bounding boxes:', JSON.stringify(res, null, 2));
}

run().catch(console.error);
