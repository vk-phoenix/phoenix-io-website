// Screenshots every page at desktop and phone width and fails on console errors,
// horizontal overflow, or broken internal links. Run after `npm run build`
// with a static server on :4321 (`npx astro preview`).
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.BASE_URL || 'http://localhost:4321';
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
process.exit(failed ? 1 : 0);
