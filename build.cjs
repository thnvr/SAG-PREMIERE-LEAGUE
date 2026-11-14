const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('[Build] Starting universal build script...');
console.log('[Build] Current working directory:', process.cwd());

const isRoot = fs.existsSync(path.join(process.cwd(), 'client/package.json'));

if (isRoot) {
  console.log('[Build] Detected root directory. Ensuring client dependencies...');
  const clientDir = path.join(process.cwd(), 'client');
  const clientNodeModules = path.join(clientDir, 'node_modules');

  if (!fs.existsSync(clientNodeModules)) {
    console.log('[Build] client/node_modules not found. Installing client dependencies...');
    execSync('npm install --include=dev', { cwd: clientDir, stdio: 'inherit', env: process.env });
  }

  console.log('[Build] Building client...');
  execSync('npm run build', { cwd: clientDir, stdio: 'inherit', env: process.env });

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
  const nodeModules = path.join(process.cwd(), 'node_modules');
  if (!fs.existsSync(nodeModules)) {
    console.log('[Build] node_modules not found. Running npm install...');
    execSync('npm install --include=dev', { stdio: 'inherit', env: process.env });
  }
  execSync('npm run build', { stdio: 'inherit', env: process.env });
}

console.log('[Build] Build completed successfully!');
