import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const findTests = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = join(directory, entry.name);
  if (entry.isDirectory()) return findTests(path);
  return entry.isFile() && entry.name.endsWith('.test.js') ? [path] : [];
});

const testFiles = findTests('src');
if (testFiles.length === 0) throw new Error('Không tìm thấy tệp kiểm thử frontend.');

const result = spawnSync(process.execPath, ['--test', ...testFiles], { stdio: 'inherit' });
process.exit(result.status ?? 1);
