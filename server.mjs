import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 4173);
const contentTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.sql': 'text/plain; charset=utf-8' };

createServer(async (request, response) => {
  const requestPath = decodeURIComponent((request.url || '/').split('?')[0]);
  const relativePath = (requestPath === '/' ? '/index.html' : requestPath).replace(/^[/\\]+/, '');
  const filePath = normalize(join(root, relativePath));
  if (filePath !== root && !filePath.startsWith(root + sep)) { response.writeHead(403); response.end('Forbidden'); return; }
  try {
    const data = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    response.end(data);
  } catch {
    response.writeHead(404); response.end('Not found');
  }
}).listen(port, '0.0.0.0', () => console.log(`облік listening on port ${port}`));
