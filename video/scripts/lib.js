// Shared helpers: open the animation page in headless Chromium.
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const FILM = process.env.FILM || 'index';          // which film page to use (index = Ask Twice)
const PAGE = 'file://' + path.join(ROOT, FILM + '.html') + '?render';

async function openPage(extraQuery = '', sharedBrowser = null) {
  const browser = sharedBrowser || await chromium.launch({ args: ['--force-color-profile=srgb', '--disable-gpu-vsync'] });
  const page = await browser.newPage({ viewport: { width: 720, height: 1280 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
  page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(PAGE + extraQuery);
  await page.evaluate(() => document.fonts.ready);
  // make sure the caption font is actually loaded before the first frame
  await page.evaluate(() => document.fonts.load('800 50px "JetBrains Mono"'));
  return { browser, page };
}

// Render frame t and return it as a PNG buffer.
async function frame(page, t) {
  const b64 = await page.evaluate(t => { window.render(t); return document.getElementById('c').toDataURL('image/png').slice(22); }, t);
  return Buffer.from(b64, 'base64');
}

module.exports = { ROOT, FILM, openPage, frame };
