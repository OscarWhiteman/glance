#!/usr/bin/env node
/**
 * Create a DMG from the built .app using hdiutil.
 * This avoids electron-builder's --prepackaged quirks
 * and gives us a clean DMG with Glance.app + Applications symlink.
 */
const { execSync } = require('child_process');
const { existsSync, unlinkSync, mkdirSync } = require('fs');
const { join } = require('path');

const pkg = require('../package.json');
const version = pkg.version;
const appName = pkg.build.productName || 'Glance';
const arch = process.arch === 'arm64' ? 'arm64' : 'x64';

const releaseDir = join(__dirname, '..', 'release');
const appPath = join(releaseDir, `mac-${arch}`, `${appName}.app`);
const dmgPath = join(releaseDir, `${appName}-${version}-${arch}.dmg`);
const tmpDir = join(releaseDir, 'dmg-staging');

if (!existsSync(appPath)) {
  console.error(`App not found at ${appPath}`);
  process.exit(1);
}

// Clean up previous DMG
if (existsSync(dmgPath)) unlinkSync(dmgPath);

// Create staging directory with app + Applications symlink
execSync(`rm -rf "${tmpDir}"`);
mkdirSync(tmpDir, { recursive: true });
execSync(`cp -R "${appPath}" "${tmpDir}/${appName}.app"`);
execSync(`ln -s /Applications "${tmpDir}/Applications"`);

// Create DMG
console.log(`Creating ${dmgPath}...`);
execSync(
  `hdiutil create -volname "${appName} ${version}" -srcfolder "${tmpDir}" -ov -format UDZO "${dmgPath}"`,
  { stdio: 'inherit' },
);

// Clean up staging
execSync(`rm -rf "${tmpDir}"`);

console.log(`DMG created: ${dmgPath}`);
