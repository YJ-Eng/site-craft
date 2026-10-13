#!/usr/bin/env node
// gzserve.js <root-dir> [port=8080]
//
// Static file server on 127.0.0.1 that gzips text types (text/*, JavaScript,
// JSON, SVG) when the request accepts gzip. Sets Content-Length, Vary and
// Cache-Control: no-store; serves <dir>/index.html for a directory; answers
// 404 for anything missing and 403 for a path that escapes the root.
//
// Why: Lighthouse against a plain dev server that does not compress measures
// a slower page than production serves. Run Lighthouse against this twin
// instead.
//
// Exit codes: 2 bad arguments; otherwise runs until killed.

'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const rootArg = process.argv[2];
const port = process.argv[3] === undefined ? 8080 : Number(process.argv[3]);
if (!rootArg || !Number.isInteger(port) || port < 0 || port > 65535) {
  console.error('usage: node gzserve.js <root-dir> [port=8080]');
  process.exit(2);
}
let root;
try {
  root = fs.realpathSync(path.resolve(rootArg));
  if (!fs.statSync(root).isDirectory()) throw new Error('not a directory');
} catch (e) {
  console.error(`gzserve: cannot serve ${rootArg}: ${e.message}`);
  process.exit(2);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.pdf': 'application/pdf',
};
const COMPRESSIBLE = /^(text\/|application\/(json|xml|manifest\+json)|image\/svg\+xml)|javascript/;

function send(res, status, body, headers) {
  res.writeHead(status, Object.assign({
    'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store',
    'Content-Type': 'text/plain; charset=utf-8',
  }, headers));
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'method not allowed\n');
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch (e) { return send(res, 400, 'bad request\n'); }
  if (rel.includes('\0')) return send(res, 400, 'bad request\n');

  let file = path.normalize(path.join(root, rel));
  if (file !== root && !file.startsWith(root + path.sep)) return send(res, 403, 'forbidden\n');
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    file = fs.realpathSync(file); // a symlink may not lead out of the root
    if (!file.startsWith(root + path.sep)) return send(res, 403, 'forbidden\n');
  } catch (e) {
    return send(res, 404, 'not found\n');
  }
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'not found\n');
    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const headers = { 'Content-Type': type, 'Cache-Control': 'no-store', Vary: 'Accept-Encoding' };
    let body = data;
    if (COMPRESSIBLE.test(type) && /\bgzip\b/i.test(req.headers['accept-encoding'] || '')) {
      body = zlib.gzipSync(data, { level: 6 });
      headers['Content-Encoding'] = 'gzip';
    }
    headers['Content-Length'] = body.length;
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`gzserve: serving ${root} at http://127.0.0.1:${server.address().port}/`);
});
