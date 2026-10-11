import fs from 'fs';
import path from 'path';

// 1. Update BottomNav.jsx
const bottomNavPath = 'src/components/BottomNav.jsx';
let bottomNavContent = fs.readFileSync(bottomNavPath, 'utf8');

const oldNavItemsRegex = /const navItems = \[\s*\{\s*path: '\/dashboard'[\s\S]*?label: 'Home'\s*\},/;
if (oldNavItemsRegex.test(bottomNavContent)) {
    bottomNavContent = bottomNavContent.replace(oldNavItemsRegex, 'const navItems = [');
    fs.writeFileSync(bottomNavPath, bottomNavContent, 'utf8');
    console.log('✓ Updated BottomNav.jsx: Removed Home item');
} else {
    console.log('Note: BottomNav.jsx Home item not found or already removed');
}

// 2. Update test/bottom-nav-and-ux-refinements.test.mjs
const testPath = 'test/bottom-nav-and-ux-refinements.test.mjs';
let testContent = fs.readFileSync(testPath, 'utf8');
testContent = testContent.replace(
    /assert\.match\(bottomNavJsx, \/label:\\s\*'Home'\/\);\s*assert\.match\(bottomNavJsx, \/path:\\s\*'\\\/dashboard'\/\);/,
    "// Home icon removed from bottom nav; default tab is Match\n    assert.doesNotMatch(bottomNavJsx, /path:\\s*'\\/dashboard'/);"
);
fs.writeFileSync(testPath, testContent, 'utf8');
console.log('✓ Updated test/bottom-nav-and-ux-refinements.test.mjs');

// 3. Update App.jsx default route to /match
const appPath = 'src/App.jsx';
let appContent = fs.readFileSync(appPath, 'utf8');
appContent = appContent.replace(
    'return isProfileComplete ? <Navigate to="/dashboard" replace /> : <Navigate to="/mini-profile-setup" replace />;',
    'return isProfileComplete ? <Navigate to="/match" replace /> : <Navigate to="/mini-profile-setup" replace />;'
);
fs.writeFileSync(appPath, appContent, 'utf8');
console.log('✓ Updated App.jsx: default smart home route points to /match');
