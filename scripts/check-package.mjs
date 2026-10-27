import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const metadata = JSON.parse(readFileSync('package.json', 'utf8'));
assert.equal(metadata.name, '@gerrithoskins/capacitor-clarity-plugin');
assert.equal(metadata.publishConfig?.access, 'public');
assert.ok(
  ['https://registry.npmjs.org/', 'https://npm.pkg.github.com'].includes(metadata.publishConfig?.registry),
  'Unexpected publication registry.',
);
assert.notEqual(metadata.private, true);

const npmCli = process.env.npm_execpath;
assert.ok(npmCli, 'Run this check through npm run verify:package.');
// npm 10 may run prepare and prepend its stdout even with --ignore-scripts.
const output = execFileSync(
  process.execPath,
  [npmCli, 'pack', '--dry-run', '--ignore-scripts', '--json', '--offline'],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
);
const manifestStart = output.search(/\[\s*\{\s*"id"\s*:/);
assert.ok(manifestStart >= 0, 'npm pack did not return a JSON manifest.');
const [packed] = JSON.parse(output.slice(manifestStart));
assert.equal(packed.name, metadata.name);
assert.equal(packed.version, metadata.version);
const names = new Set(packed.files.map(({ path }) => path));
for (const required of [
  'package.json',
  'README.md',
  'LICENSE',
  'THIRD_PARTY_NOTICES.md',
  'Package.swift',
  'GerrithoskinsCapacitorClarityPlugin.podspec',
  'android/build.gradle',
  'android/src/main/AndroidManifest.xml',
  'android/src/main/java/com/gerrithoskins/capacitor/clarity/ClarityPlugin.java',
  'ios/Sources/ClarityPlugin/ClarityPlugin.swift',
  metadata.main,
  metadata.module,
  metadata.types,
  metadata.unpkg,
]) {
  assert.ok(names.has(required), `Missing package file: ${required}`);
}
for (const name of names) {
  assert.ok(
    /^(dist\/|android\/src\/main\/|ios\/Sources\/)/.test(name) ||
      [
        'android/build.gradle',
        'package.json',
        'README.md',
        'LICENSE',
        'THIRD_PARTY_NOTICES.md',
        'Package.swift',
        'GerrithoskinsCapacitorClarityPlugin.podspec',
      ].includes(name),
    `Unexpected package file: ${name}`,
  );
  assert.ok(!/(^|\/)\.env(?:\.|$)|\.npmrc$|\.tgz$/.test(name), `Local configuration in package: ${name}`);
}
console.log(
  `Package contents verified: ${packed.name}@${packed.version}, ${packed.entryCount} files, ${packed.size} bytes.`,
);
console.log(
  'Includes compiled entry points, types, both native bridges, and license notices; excludes the example and local configuration.',
);
