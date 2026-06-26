import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const appBuildDir = join(process.cwd(), 'android', 'app', 'build');

if (existsSync(appBuildDir)) {
  rmSync(appBuildDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  console.log(`Removed Android app build output: ${appBuildDir}`);
} else {
  console.log('Android app build output is already clean.');
}
