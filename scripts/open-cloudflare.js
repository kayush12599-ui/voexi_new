const { spawn, execSync } = require('child_process');

console.log('========================================================');
console.log('       🚀 VOEXI CLOUDFLARE AUTOMATED LIVE LINK');
console.log('========================================================\n');

// 1. Clear stale process on Port 8081, Apply Metro Patches & Generate Missing Assets
console.log('[1/3] Applying Metro Patches, Icon Assets & Clearing Port 8081...');
try {
  execSync('node scripts/generate_missing_assets.js', { stdio: 'inherit' });
  execSync('node scripts/patch-metro.js', { stdio: 'inherit' });
  execSync('cmd /c "for /f \\"tokens=5\\" %a in (\'netstat -aon ^| findstr :8081\') do taskkill /f /pid %a"', { stdio: 'ignore' });
} catch (e) {}

// 2. Launch Metro Web Live Server explicitly on Port 8081 (Standard Mode)
console.log('[2/3] Launching Metro Web Engine on Port 8081...');
const metro = spawn('npx', ['expo', 'start', '--web', '-c', '--port', '8081'], {
  shell: true,
  stdio: 'inherit'
});

// 3. Connect Cloudflare Global Network to Port 8081 via Ultra-Stable TCP HTTP/2 Protocol
console.log('[3/3] Connecting Cloudflare Global Network to Port 8081 (HTTP/2 TCP Mode)...\n');

setTimeout(() => {
  const cf = spawn('npx', ['cloudflared', 'tunnel', '--protocol', 'http2', '--url', 'http://127.0.0.1:8081'], { shell: true });

  let opened = false;

  function handleTunnelOutput(data) {
    const text = data.toString();
    process.stdout.write(text);

    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match && !opened) {
      opened = true;
      const url = match[0];
      console.log('\n========================================================');
      console.log(`🎉 YOUR REAL LIVE LINK: ${url}`);
      console.log('========================================================\n');

      spawn(`start ${url}`, { shell: true });
      spawn(`echo ${url}| clip`, { shell: true });
      console.log('📋 Link AUTOMATICALLY COPIED to Clipboard! Press Ctrl+V on WhatsApp to send!\n');
    }
  }

  if (cf.stdout) cf.stdout.on('data', handleTunnelOutput);
  if (cf.stderr) cf.stderr.on('data', handleTunnelOutput);
}, 3000);
