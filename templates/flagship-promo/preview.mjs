import http from 'node:http';
import path from 'node:path';
import {readFile, realpath, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
await mkdir(path.join(root, '.build'), {recursive: true});
await build({
  absWorkingDir: root,
  entryPoints: ['templates/flagship-promo/boot.jsx'],
  bundle: true,
  platform: 'browser',
  format: 'esm',
  jsx: 'automatic',
  outfile: '.build/flagship.js',
  define: {'process.env.NODE_ENV': '"production"'},
  logLevel: 'error',
});

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
};

// The shot factory asks for site/index.html and clips/ from the page root.
// Those files live under public/ in this repo.
const mounts = [
  ['/boot.js', '.build/flagship.js'],
  ['/site/', 'public/site/'],
  ['/clips/', 'public/clips/'],
];

const base = await realpath(root);
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') rel = '/templates/flagship-promo/index.html';
    for (const [from, to] of mounts) {
      if (rel === from || (from.endsWith('/') && rel.startsWith(from))) {
        rel = to + rel.slice(from.length);
        break;
      }
    }
    const file = await realpath(path.join(base, rel));
    if (file !== base && !file.startsWith(base + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'});
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(5183, '127.0.0.1', () => {
  console.log('Template: http://127.0.0.1:5183/');
  console.log('This page plays the film site shot into the code shot. seek(t) is seconds into that pair.');
});
