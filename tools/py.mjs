// Run a Python script with UTF-8 mode on every OS (Windows defaults to the ANSI code page).
import {spawnSync} from 'node:child_process';
const args = ['-X', 'utf8', ...process.argv.slice(2)];
for (const py of process.platform === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python']) {
  const r = spawnSync(py, py === 'py' ? ['-3', ...args] : args, {stdio: 'inherit', env: {...process.env, PYTHONUTF8: '1'}});
  if (r.error?.code === 'ENOENT') continue;
  process.exit(r.status ?? 1);
}
console.error('Python 3.9+ not found on PATH.'); process.exit(1);
