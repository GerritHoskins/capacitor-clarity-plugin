import { spawnSync } from 'node:child_process';

const mode = process.argv[2];
const macOnly = mode === 'ios' || mode === 'swiftlint';
if (macOnly && process.platform !== 'darwin') {
  console[mode === 'swiftlint' ? 'warn' : 'error'](
    `${mode} requires macOS; ${mode === 'swiftlint' ? 'skipped (Swift was not linted)' : 'iOS compilation is unverified'}.`,
  );
  process.exit(mode === 'swiftlint' ? 0 : 1);
}
const commands = {
  android: [
    process.platform === 'win32' ? 'gradlew.bat' : './gradlew',
    ['clean', 'build', 'test', '--console=plain'],
    'android',
  ],
  ios: [
    'xcodebuild',
    [
      '-scheme',
      'GerrithoskinsCapacitorClarityPlugin',
      '-destination',
      'generic/platform=iOS',
      'CODE_SIGNING_ALLOWED=NO',
    ],
    '.',
  ],
  swiftlint: ['node', ['node_modules/swiftlint/bin.js', 'lint', '--strict'], '.'],
};
if (!commands[mode]) throw new Error('Unknown native check');
const [command, args, cwd] = commands[mode];
const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
