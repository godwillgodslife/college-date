import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('StoryShareModal.jsx: 1080x1920 canvas rendering, luxury styling, and viral prompts', () => {
    const modalPath = path.resolve('src/components/StoryShareModal.jsx');
    assert.ok(fs.existsSync(modalPath), 'StoryShareModal.jsx must exist');
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // 1. Standard 9:16 vertical resolution (1080 x 1920)
    assert.match(modalCode, /const\s+W\s*=\s*1080;/, 'Canvas width must be 1080px');
    assert.match(modalCode, /const\s+H\s*=\s*1920;/, 'Canvas height must be 1920px');

    // 2. Luxury brand header & platform badge
    assert.match(modalCode, /✨ The College Date • Campus Q&A/, 'Canvas must draw platform brand badge');

    // 3. Viral Q&A sticker box and prompt presets
    assert.match(modalCode, /DEFAULT_PROMPTS/, 'StoryShareModal must define preset prompt options');
    assert.match(modalCode, /Send me anonymous confessions & questions 🤫/, 'Default prompt must be present');
    assert.match(modalCode, /ANONYMOUS CAMPUS Q&A/, 'Sticker header must be drawn');
    assert.match(modalCode, /I cannot see who asked!/, 'Anonymity reassurance must be drawn on sticker');

    // 4. Link & trust callout
    assert.match(modalCode, /thecollegedate\.com\/ask\/\$\{(username|displaySlug)\}/, 'Canvas must render ask URL footer');
    assert.match(modalCode, /100% Anonymous • Zero Identity Leak/, 'Canvas must include security trust footnote');
});

test('StoryShareModal.jsx: Native WhatsApp sharing with Web Share API and download fallback', () => {
    const modalCode = fs.readFileSync(path.resolve('src/components/StoryShareModal.jsx'), 'utf-8');

    // 1. handleWhatsAppShare function
    assert.match(modalCode, /const\s+handleWhatsAppShare\s*=\s*async/, 'handleWhatsAppShare must be defined');

    // 2. Web Share API file capability check
    assert.match(modalCode, /navigator\.share\s*&&\s*canvasRef\.current/, 'Must check for Web Share API support');
    assert.match(modalCode, /navigator\.canShare\(\{\s*files:\s*\[file\]\s*\}\)/, 'Must verify file share support');

    // 3. WhatsApp redirect and download fallback
    assert.match(modalCode, /https:\/\/wa\.me\/\?text=/, 'Must provide WhatsApp web/app redirect fallback');
    assert.match(modalCode, /handleDownload\(\)/, 'Must trigger automatic image download when web share is unsupported');

    // 4. Download PNG and Copy Link actions
    assert.match(modalCode, /const\s+handleDownload\s*=\s*\(\)/, 'handleDownload must be defined');
    assert.match(modalCode, /const\s+handleCopyLink\s*=\s*\(\)/, 'handleCopyLink must be defined');
});

test('Confessions.jsx & Confessions.css: Wires StoryShareModal into Anonymous Q&A banner', () => {
    const confessionsCode = fs.readFileSync(path.resolve('src/pages/Confessions.jsx'), 'utf-8');
    const confessionsCss = fs.readFileSync(path.resolve('src/pages/Confessions.css'), 'utf-8');

    // 1. Lazy import of StoryShareModal
    assert.match(confessionsCode, /const\s+StoryShareModal\s*=\s*lazy\(\(\)\s*=>\s*import\('\.\.\/components\/StoryShareModal'\)\);/);

    // 2. State for modal visibility
    assert.match(confessionsCode, /const\s*\[showStoryModal,\s*setShowStoryModal\]\s*=\s*useState\(false\);/);

    // 3. Trigger button in Anonymous banner
    assert.match(confessionsCode, /className="btn-ngl-story"/, 'Confessions.jsx must render btn-ngl-story');
    assert.match(confessionsCode, /onClick=\{\(\)\s*=>\s*setShowStoryModal\(true\)\}/, 'btn-ngl-story must open StoryShareModal');
    assert.match(confessionsCode, /📸 Story Card/, 'Button text must display 📸 Story Card');

    // 4. Modal unmounting / mounting
    assert.match(confessionsCode, /\{showStoryModal\s*&&\s*\(\s*<StoryShareModal/, 'Must render StoryShareModal when showStoryModal is true');

    // 5. Confessions.css styles
    assert.match(confessionsCss, /\.btn-ngl-story\s*\{[\s\S]*?background:[\s\S]*?#f43f5e/, 'Confessions.css must style .btn-ngl-story');
});

test('StoryShareModal.css: Dialog layout, prompt chips, and responsive light theme support', () => {
    const css = fs.readFileSync(path.resolve('src/components/StoryShareModal.css'), 'utf-8');

    assert.match(css, /\.story-share-overlay/, 'Overlay styling must be defined');
    assert.match(css, /\.story-share-dialog/, 'Dialog styling must be defined');
    assert.match(css, /\.story-prompt-chips/, 'Prompt chips container must be defined');
    assert.match(css, /\.btn-story-share-wa/, 'WhatsApp status button styling must be defined');
    assert.match(css, /html\[data-theme="light"\] \.story-share-dialog/, 'Light theme styles must be provided');
});
