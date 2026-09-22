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
