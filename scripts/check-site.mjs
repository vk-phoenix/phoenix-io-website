// Screenshots every page at desktop and phone width and fails on console errors,
// horizontal overflow, or broken internal links. Run after `npm run build`;
// it serves dist/ itself unless BASE_URL points at a running site.
import { chromium } from 'playwright';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

process.on('uncaughtException', (e) => { console.log(`::error::check crashed: ${e.stack || e}`); process.exit(1); });
process.on('unhandledRejection', (e) => { console.log(`::error::check crashed: ${e?.stack || e}`); process.exit(1); });

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json' };
let server;
let base = process.env.BASE_URL;
if (!base) {
  const root = path.resolve('dist');
  server = http.createServer((req, res) => {
    let file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(4399, '127.0.0.1', r));
  base = 'http://127.0.0.1:4399';
}
const pages = ['/', '/capabilities/', '/projects/', '/past-performance/', '/contracting/', '/teaming/', '/about/', '/contact/', '/accessibility/', '/privacy/'];
const outDir = process.env.SHOTS || 'shots';
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
let failed = 0;
const links = new Set();
for (const [label, viewport] of [['d', { width: 1366, height: 900 }], ['m', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  // Console errors from third-party scripts (Turnstile, analytics) are theirs, not ours.
  page.on('console', (m) => m.type() === 'error' && (m.location().url || base).startsWith(base) && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  // Third-party scripts (Turnstile, analytics) may be unreachable in CI; only our own files must load.
  page.on('requestfailed', (r) => r.url().startsWith(base) && errors.push(`failed to load ${r.url()}`));
  for (const p of pages) {
    errors.length = 0;
    await page.goto(base + p, { waitUntil: 'networkidle' });
    for (let y = 0; y < 20000; y += 600) { await page.mouse.wheel(0, 600); await page.waitForTimeout(40); }
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - innerWidth,
      hidden: [...document.querySelectorAll('.reveal:not(.in)')].length,
      hrefs: [...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href')),
    }));
    r.hrefs.forEach((h) => links.add(h.split('#')[0]));
    const bad = errors.filter((e) => !/^Failed to load resource/.test(e));
    const ok = r.overflow <= 0 && r.hidden === 0 && bad.length === 0;
    if (!ok) failed++;
    const line = `${label} ${p} overflow=${r.overflow} unrevealed=${r.hidden} errors=${bad.join(' | ')}`;
    console.log(ok ? `ok   ${line}` : `::error::${line}`);
    await page.screenshot({ path: `${outDir}/${label}${p.replace(/\//g, '_') || '_'}.png`, fullPage: true });
  }
  await page.close();
}
for (const h of links) {
  const res = await fetch(base + h);
  if (!res.ok) { failed++; console.log(`::error::broken link ${h} ${res.status}`); }
}
await browser.close();
server?.close();
process.exit(failed ? 1 : 0);
