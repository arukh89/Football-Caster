import { spawn } from 'node:child_process';

const args = ['build'];
const child = spawn('next', args, { shell: true, env: process.env });

const FILTERS = [
  /baseline-browser-mapping/i,
  /DeprecationWarning/i,
  /Using edge runtime on a page currently disables static generation/i,
];

function shouldSuppress(line) {
  return FILTERS.some((re) => re.test(line));
}

child.stdout.setEncoding('utf8');
child.stderr.setEncoding('utf8');

child.stdout.on('data', (chunk) => {
  const lines = chunk.split(/\r?\n/);
  for (const line of lines) {
    if (!line) continue;
    if (shouldSuppress(line)) continue;
    process.stdout.write(line + '\n');
  }
});

child.stderr.on('data', (chunk) => {
  const lines = chunk.split(/\r?\n/);
  for (const line of lines) {
    if (!line) continue;
    if (shouldSuppress(line)) continue;
    process.stderr.write(line + '\n');
  }
});

child.on('close', (code) => {
  process.exit(code ?? 1);
});
