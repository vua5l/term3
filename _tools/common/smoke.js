/* فحص موقع المادة في متصفح حقيقي من نسخة محلية، بلا مفتاح مزامنة (فلا يُكتب شيء في المستودع).
   يمرّ على شاشات الموقع (smoke.routes في ملف الإعدادات) وعلى دروس النطاق المعطى، بالوضعين الفاتح والداكن على مقاس الجوال.
   الاستعمال: node _tools/common/smoke.js <رمز المادة> <أول درس جديد> <آخر درس جديد> */
'use strict';
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const lib = require('./lib');

if (process.argv.length < 5) lib.die('usage: node smoke.js <subject> <first lesson no> <last lesson no>');
const S = lib.loadSubject(process.argv[2]);
const root = S.repo, first = +process.argv[3], last = +process.argv[4];
const shot = (name) => path.join(os.tmpdir(), 'smoke-' + S.code + '-' + name + '.png');
/* المتصفح: ما يأتي مع playwright، وإلا فالمتصفح المثبت في الجهاز (CHROME يحدد مساره) */
async function launch() {
  try { return await chromium.launch(); }
  catch (e) { return chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] }); }
}
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(root, u);
  if (u.endsWith('/')) f = path.join(f, 'index.html');
  fs.readFile(f, (err, buf) => {
    if (err) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(0, async () => {
  const port = server.address().port;
  const base = 'http://127.0.0.1:' + port + '/' + S.site + '/index.html';
  const browser = await launch();
  const out = [];
  let bad = 0;
  for (const [label, vp, scheme] of [['phone-light', { width: 390, height: 844 }, 'light'], ['phone-dark', { width: 390, height: 844 }, 'dark']]) {
    const ctx = await browser.newContext({ viewport: vp, colorScheme: scheme, locale: 'ar-SA' });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|api\.github|githubusercontent|401|403|404/.test(m.text())) errs.push('console: ' + m.text()); });
    await page.goto(base, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const routes = S.smoke.routes.slice();
    for (let n = first; n <= last; n++) routes.push('#l-' + n, '#r-' + n);
    for (const r of routes) {
      await page.evaluate((h) => { location.hash = h; }, r);
      await page.waitForTimeout(150);
      const info = await page.evaluate(() => {
        const main = document.querySelector('main') || document.body;
        const t = main.innerText || '';
        return { len: t.length, head: t.slice(0, 120).replace(/\s+/g, ' '), overflow: document.documentElement.scrollWidth > window.innerWidth + 1 };
      });
      if (info.len < 40) { bad++; out.push(label + ' ' + r + ': EMPTY? ' + JSON.stringify(info.head)); }
      if (info.overflow) out.push(label + ' ' + r + ': horizontal overflow');
      if (r.startsWith('#l-') && label === 'phone-light') out.push(r + ': ' + info.head);
    }
    if (label === 'phone-light') {
      await page.evaluate(() => { location.hash = '#home'; });
      await page.waitForTimeout(300);
      await page.screenshot({ path: shot('home') });
      await page.evaluate((h) => { location.hash = h; }, '#l-' + first);
      await page.waitForTimeout(300);
      await page.screenshot({ path: shot('lesson') });
      await page.evaluate(() => { location.hash = '#quiz'; });
      await page.waitForTimeout(300);
      const quizText = await page.evaluate(() => (document.querySelector('main') || document.body).innerText);
      out.push('#quiz first 160 chars: ' + quizText.slice(0, 160).replace(/\s+/g, ' '));
      await page.evaluate(() => { location.hash = '#sum'; });
      await page.waitForTimeout(300);
      const sumText = await page.evaluate(() => (document.querySelector('main') || document.body).innerText);
      out.push('#sum lesson count by «الدرس N»: ' + (sumText.match(/الدرس\s+\d+/g) || []).length);
    }
    if (errs.length) { bad += errs.length; out.push(label + ' ERRORS:\n  ' + errs.join('\n  ')); }
    await ctx.close();
  }
  await browser.close();
  server.close();
  console.log(out.join('\n'));
  console.log(bad ? '\nPROBLEMS: ' + bad : '\nSMOKE OK');
  process.exit(bad ? 1 : 0);
});
