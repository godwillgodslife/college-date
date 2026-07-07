import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const androidPublic = join(root, 'android', 'app', 'src', 'main', 'assets', 'public');

const nativeOnlyRemovals = [
  join(androidPublic, 'private-downloads'),
];

// Perform removals first
for (const target of nativeOnlyRemovals) {
  if (existsSync(target)) {
    try {
      rmSync(target, { recursive: true, force: true });
      console.log(`Removed Android-only bundled asset: ${target}`);
    } catch (err) {
      console.warn(`Warning: Could not remove ${target}: ${err.message}`);
    }
  }
}

function materializeRegularFiles(dir) {
  if (!existsSync(dir)) return;
  
  // Skip if dir is one of the removed paths
  if (nativeOnlyRemovals.some(rem => dir.startsWith(rem))) return;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    
    // Skip if path is in removals
    if (nativeOnlyRemovals.some(rem => fullPath.startsWith(rem))) continue;

    if (entry.isDirectory()) {
      materializeRegularFiles(fullPath);
      continue;
    }

    if (!entry.isFile()) continue;

    const stats = statSync(fullPath);
    const hasReparsePoint = (stats.mode & 0o170000) === 0o120000 || stats.isSymbolicLink?.();
    const attributes = stats.birthtimeMs; // Touch stats so OneDrive resolves metadata before reading.
    void attributes;

    try {
      const content = readFileSync(fullPath);
      rmSync(fullPath, { force: true });
      writeFileSync(fullPath, content);
    } catch (error) {
      console.warn(`Warning: Skipping materialization for ${fullPath} due to lock/access: ${error.message}`);
    }

    if (hasReparsePoint) {
      console.log(`Materialized Android asset as regular file: ${fullPath}`);
    }
  }
}

materializeRegularFiles(androidPublic);

const forbiddenFiles = [
  'TheCollegeDate-native-prototype-debug.apk',
];

for (const fileName of forbiddenFiles) {
  const target = join(androidPublic, 'private-downloads', fileName);
  if (existsSync(target)) {
    try {
      rmSync(target, { force: true });
      console.log(`Removed forbidden Android bundled file: ${target}`);
    } catch (err) {
      console.warn(`Warning: Could not remove forbidden file ${target}: ${err.message}`);
    }
  }
}

console.log('Android web assets are prepared for release.');
