import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('imageCompressor.js exports compressImage and compressWithCanvas with WebP & 300KB budget', async () => {
    const code = readFileSync(resolve('src/utils/imageCompressor.js'), 'utf8');
    assert.match(code, /export async function compressWithCanvas/);
    assert.match(code, /export async function compressImage/);
    assert.match(code, /fileType:\s*'image\/webp'/);
    assert.match(code, /compressedFile\.size > 300 \* 1024/);
    assert.match(code, /canvasFallback/);
});

test('confessionService.js compresses media client-side before uploading to confessions-media', async () => {
    const code = readFileSync(resolve('src/services/confessionService.js'), 'utf8');
    assert.match(code, /import\s*\{\s*compressImage\s*\}\s*from\s*'\.\.\/utils\/imageCompressor'/);
    assert.match(code, /uploadFile\s*=\s*await\s*compressImage\(file/);
    assert.match(code, /\.from\('confessions-media'\)\s*\.upload\(filePath,\s*uploadFile/);
});

test('snapshotService.js compresses snapshot media client-side before uploading to snapshot-media', async () => {
    const code = readFileSync(resolve('src/services/snapshotService.js'), 'utf8');
    assert.match(code, /import\s*\{\s*compressImage\s*\}\s*from\s*'\.\.\/utils\/imageCompressor'/);
    assert.match(code, /uploadFile\s*=\s*await\s*compressImage\(file/);
    assert.match(code, /\.from\('snapshot-media'\)\s*\.upload\(filePath,\s*uploadFile/);
});

test('chatService.js compresses chat images client-side before uploading to chat-media', async () => {
    const code = readFileSync(resolve('src/services/chatService.js'), 'utf8');
    assert.match(code, /import\s*\{\s*compressImage\s*\}\s*from\s*'\.\.\/utils\/imageCompressor'/);
    assert.match(code, /uploadFile\s*=\s*await\s*compressImage\(file/);
    assert.match(code, /\.from\('chat-media'\)\s*\.upload\(fileName,\s*uploadFile/);
});

test('profileService.js compresses avatars and profile photos to sub-100KB budget', async () => {
    const code = readFileSync(resolve('src/services/profileService.js'), 'utf8');
    assert.match(code, /compressImage\(file,\s*\{\s*maxWidth:\s*800,\s*targetSizeKB:\s*80\s*\}\)/);
    assert.match(code, /compressImage\(file,\s*\{\s*maxWidth:\s*800,\s*targetSizeKB:\s*90\s*\}\)/);
    assert.match(code, /\.from\('pending-avatars'\)\s*\.upload/);
});
