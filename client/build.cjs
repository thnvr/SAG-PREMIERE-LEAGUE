const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('[Build] Starting universal build script...');
console.log('[Build] Current working directory:', process.cwd());

const isRoot = fs.existsSync(path.join(process.cwd(), 'client/package.json'));

if (isRoot) {
  console.log('[Build] Detected root directory. Building client...');
  const clientDir = path.join(process.cwd(), 'client');
  execSync('npm run build', { cwd: clientDir, stdio: 'inherit' });

  // Mirror client/dist to root/dist
  const src = path.join(process.cwd(), 'client/dist');
  const dest = path.join(process.cwd(), 'dist');
  if (fs.existsSync(src)) {
    try {
      fs.cpSync(src, dest, { recursive: true });
      console.log('[Build] Mirrored client/dist -> dist');
    } catch (e) {
      console.warn('[Build] Mirror warning:', e.message);
    }
  }
} else {
  console.log('[Build] Detected client directory. Building directly...');
  execSync('npm run build', { stdio: 'inherit' });
}

console.log('[Build] Build completed successfully!');
