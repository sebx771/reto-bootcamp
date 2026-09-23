// Servidor HTTP local ligero con módulos nativos de Node.js (Sin librerías externas ni scripts de PowerShell)
// Ejecutar con: node server.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Manejo de URL y ruta por defecto
  let reqUrl = req.url.split('?')[0];
  if (reqUrl === '/') {
    reqUrl = '/smartops-frontend/index.html';
  } else if (reqUrl === '/smartops-frontend' || reqUrl === '/smartops-frontend/') {
    reqUrl = '/smartops-frontend/index.html';
  }

  // Rewrite assets referenced with relative paths from index.html
  // e.g. /css/styles.css → /smartops-frontend/css/styles.css
  if (!reqUrl.startsWith('/smartops-frontend/')) {
    const assetPrefixes = ['/css/', '/js/', '/images/', '/icons/'];
    const rootAssets = ['/manifest.json', '/sw.js'];
    if (assetPrefixes.some(p => reqUrl.startsWith(p)) || rootAssets.includes(reqUrl)) {
      reqUrl = '/smartops-frontend' + reqUrl;
    }
  }

  // Responder favicon inline para evitar el 404
  if (reqUrl === '/favicon.ico') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#F97316"/><text x="16" y="22" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="16" fill="white">SB</text></svg>`;
    res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'max-age=86400' });
    return res.end(svg);
  }

  const filePath = path.join(ROOT, reqUrl);

  // Evitar Directory Traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Prohibido');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Archivo No Encontrado');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 SmartOps SuperBrix iniciado con éxito`);
  console.log(`📡 URL Local: http://localhost:${PORT}/smartops-frontend/index.html`);
  console.log('====================================================');
  console.log('Presione Ctrl + C para detener el servidor.');
});
