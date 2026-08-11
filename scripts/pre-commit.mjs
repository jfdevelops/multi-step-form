import { execFileSync } from 'node:child_process';

const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function runCommand(command, args) {
  try {
    if (process.platform === 'win32') {
      const commandProcessor = process.env.ComSpec ?? 'cmd.exe';
      const commandParts = [command, ...args];

      if (commandParts.some((argument) => !/^[\w@./:*=+-]+$/.test(argument))) {
        throw new TypeError('Unsafe command argument in pre-commit runner.');
      }

      const commandLine = commandParts.join(' ');

      execFileSync(commandProcessor, ['/d', '/s', '/c', commandLine], {
        stdio: 'inherit',
      });
    } else {
      execFileSync(command, args, { stdio: 'inherit' });
    }
  } catch (error) {
    const status =
      error !== null &&
      typeof error === 'object' &&
      'status' in error &&
      typeof error.status === 'number'
        ? error.status
        : 1;

    process.exit(status);
  }
}

function getStagedFiles() {
  return execFileSync('git', ['diff', '--cached', '--name-only'], {
    encoding: 'utf8',
  });
}

console.log('🔍 Checking for relevant file changes...');

const stagedFiles = getStagedFiles();
const testRelevantPatterns = /\.(js|jsx|ts|tsx|json)$|package(-lock)?\.json$|yarn\.lock$|pnpm-lock\.yaml$|\.(test|spec)\.|__tests__|src\/|lib\/|components\//;

if (stagedFiles.length === 0) {
  console.log('Empty commit or no file changes detected.');
}

console.log('🧪 Running tests before commit...');
// Git hooks can inherit an interactive terminal, so force Vitest into one-shot mode
// instead of allowing it to enter watch mode and block the commit indefinitely.
runCommand(pnpmCommand, [
  'run',
  'test:packages',
  '--run',
  '--browser.headless=true',
]);

console.log('🔎 Typechecking packages...');
runCommand(pnpmCommand, ['run', 'typecheck:packages']);

console.log('📦 Building packages...');
runCommand(pnpmCommand, ['run', 'build:packages']);

console.log('✅ Tests, typecheck, and build succeeded - proceeding with commit.');
