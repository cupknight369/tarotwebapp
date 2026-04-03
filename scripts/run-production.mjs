import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const entry = join(root, 'dist', 'index.cjs');
const envFile = join(root, '.env');

const nodeArgs = [];
if (existsSync(envFile)) {
  nodeArgs.push('--env-file', envFile);
}
nodeArgs.push(entry);

const result = spawnSync(process.execPath, nodeArgs, {
  cwd: root,
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: 'inherit',
});

process.exit(result.status === null ? 1 : result.status);
