const { spawn } = require('child_process');
const http = require('http');

console.log('========================================================');
console.log('       🚀 VOEXI WEB ENGINE - LAUNCHING PORT 3000');
console.log('========================================================\n');

console.log('[1/2] Starting Local Server on Port 3000...');

const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const serve = spawn(cmd, ['serve', 'dist', '-s', '-p', '3000'], {
  shell: true,
  stdio: 'inherit',
});

let opened = false;

const checkAndOpen = () => {
  if (opened) return;

  http.get('http://localhost:3000', (res) => {
    if (res.statusCode === 200 && !opened) {
      opened = true;
      console.log('\n✅ [2/2] VOEXI Web Server Active! Opening Chrome Browser...\n');
      spawn('start http://localhost:3000', { shell: true });
    } else if (!opened) {
      setTimeout(checkAndOpen, 500);
    }
  }).on('error', () => {
    if (!opened) {
      setTimeout(checkAndOpen, 500);
    }
  });
};

setTimeout(checkAndOpen, 800);
