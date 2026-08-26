// Minimal zero-dependency static server for local preview of the site.
// Lives in .claude/, not the site tree, so the repo itself stays build-step-free:
// this is dev tooling for previewing the static pages, never shipped or served.
// Start it via `preview_start {name: "site"}` (see .claude/launch.json) or
// `node .claude/static-server.js <port>`.
const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
// PORT env first-class so two sessions can preview at once (preview_start assigns one).
const PORT = Number(process.argv[2] || process.env.PORT || 8099);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.woff2':'font/woff2'
};

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/index.html';
  const abs = path.join(ROOT, rel);
  if (!abs.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }
  fs.readFile(abs, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found: ' + rel); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(abs).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(PORT, () => console.log('serving ' + ROOT + ' on http://localhost:' + PORT));
