import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const androidPublic = join(root, 'android', 'app', 'src', 'main', 'assets', 'public');

if (existsSync(androidPublic)) {
  rmSync(androidPublic, { recursive: true, force: true });
  console.log(`Removed stale Android web asset directory: ${androidPublic}`);
}

console.log('Android web assets are clean.');
