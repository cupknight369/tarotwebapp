import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = join(root, '.env');
const tsxCli = join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const script = join(root, 'server', 'index.ts');

const nodeArgs = [];
if (existsSync(envFile)) {
  nodeArgs.push('--env-file', envFile);
}
nodeArgs.push(tsxCli, script);

const result = spawnSync(process.execPath, nodeArgs, {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status === null ? 1 : result.status);
