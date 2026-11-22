const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '../dist');

if (!fs.existsSync(distDir)) {
  console.log('⚠️ dist folder not found. Please run "npx expo export -p web -c" first.');
  process.exit(1);
}

// 1. Create Netlify / Cloudflare Pages _redirects file
const redirectsContent = `/* /index.html 200\n`;
fs.writeFileSync(path.join(distDir, '_redirects'), redirectsContent, 'utf8');
console.log('✅ Created Netlify / Cloudflare _redirects file in dist/');

// 2. Create cPanel / Apache .htaccess file
const htaccessContent = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>\n`;
fs.writeFileSync(path.join(distDir, '.htaccess'), htaccessContent, 'utf8');
console.log('✅ Created Apache / cPanel .htaccess file in dist/');

// 3. Create Vercel vercel.json file
const vercelContent = JSON.stringify({
  rewrites: [{ source: "/(.*)", destination: "/index.html" }]
}, null, 2);
fs.writeFileSync(path.join(distDir, 'vercel.json'), vercelContent, 'utf8');
fs.writeFileSync(path.resolve(__dirname, '../vercel.json'), vercelContent, 'utf8');
console.log('✅ Created Vercel vercel.json configuration in dist/');

console.log('\n========================================================');
console.log('🎉 DEPLOYMENT BUNDLE IS 100% READY FOR PRODUCTION WEB HOSTING!');
console.log('========================================================');
console.log('You can now upload the "dist/" folder to Netlify, Vercel, Cloudflare, or cPanel.');
console.log('All single-page app routes (SPA rewrites) are pre-configured.\n');
