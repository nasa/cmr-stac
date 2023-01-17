const fs = require('fs');
const { join, resolve } = require('path');
const cp = require('child_process');
const os = require('os');

const npmCmd = os.platform().startsWith('win') ? 'npm.cmd' : 'npm';
const libDirectory = resolve(__dirname, '..');

fs.readdirSync(libDirectory).forEach((entry) => {
  var modPath = join(libDirectory, entry);
  if (!fs.existsSync(join(modPath, 'package.json'))) return;
  cp.spawn(npmCmd, ['test'], { env: process.env, cwd: modPath, stdio: 'inherit' });
});
