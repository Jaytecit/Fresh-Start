/**
 * Build a Vite dist zip for itch.io HTML5 upload.
 * Uses tar so zip paths use forward slashes (Compress-Archive breaks on itch/Linux).
 *
 * Run: npx tsx scripts/package-itch.mts
 * Or:  npm run package:itch
 */
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const outDir = join(root, 'itch-upload');
const zipPath = join(root, 'solemn-sandbox-itch.zip');

function run(cmd: string, args: string[], opts?: { shell?: boolean }): void {
  // Prefer shell:false so paths with spaces (e.g. "Fresh Start") stay intact.
  // npm on Windows still needs shell so npm.cmd resolves.
  const res = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: opts?.shell ?? false,
  });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

console.log('Building…');
run('npm', ['run', 'build'], { shell: true });

if (!existsSync(join(dist, 'index.html'))) {
  console.error('Build did not produce dist/index.html');
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
rmSync(zipPath, { force: true });
mkdirSync(outDir, { recursive: true });

cpSync(join(dist, 'index.html'), join(outDir, 'index.html'));
cpSync(join(dist, 'assets'), join(outDir, 'assets'), { recursive: true });
// Omit public/disco (copyrighted default track not required to run).

// Explicit members (not ".") so entries are index.html / assets/... with `/`
// separators. PowerShell Compress-Archive uses `\`, which breaks on itch/Linux.
run('tar', ['-a', '-cf', zipPath, '-C', outDir, 'index.html', 'assets']);

const assets = readdirSync(join(outDir, 'assets'));
const pngs = assets.filter((n) => n.endsWith('.png')).length;
const zipBytes = statSync(zipPath).size;
console.log(
  `itch package ready: ${zipPath} (${zipBytes} bytes, ${pngs} pngs, no disco/)`,
);
console.log('Upload solemn-sandbox-itch.zip as Kind: HTML — index.html at zip root.');
