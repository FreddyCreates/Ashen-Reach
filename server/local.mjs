import {createServer} from 'node:http';
import {readFile, realpath, stat} from 'node:fs/promises';
import {resolve, relative, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const contentTypes = {'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
  '.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webmanifest':'application/manifest+json',
  '.webp':'image/webp','.png':'image/png','.json':'application/json','.ao':'application/octet-stream'};
const documentRoot = await realpath(fileURLToPath(new URL('../dist/', import.meta.url)));
const port = Number(process.env.PORT ?? 4178);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw Error('PORT must be a number from 0 to 65535.');
const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, {Allow:'GET, HEAD'}).end(); return;
  }
  try {
    const url = new URL(request.url, 'http://localhost');
    const path = decodeURIComponent(url.pathname);
    if (path.includes('\0') || path.includes('\\')) throw Error('Invalid file path');
    const file = await realpath(resolve(documentRoot, '.' + (path === '/' ? '/index.html' : path)));
    const local = relative(documentRoot, file);
    if (local.startsWith('..' + sep) || local === '..' || !(await stat(file)).isFile()) throw Error('Unknown file');
    const data = await readFile(file);
    response.writeHead(200, {'Content-Type':contentTypes[extname(file)] ?? 'application/octet-stream',
      'Content-Length':data.length, 'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff'});
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch {
    response.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}).end('Game asset not found.');
  }
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? 'Port is in use. Close the previous launcher or set PORT to another port.' : error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log('Ashen Reach is ready at http://127.0.0.1:' + server.address().port + '/'));
