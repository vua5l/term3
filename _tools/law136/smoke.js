/* فحص موقع law136 في متصفح حقيقي من نسخة محلية، بلا مفتاح مزامنة (فلا يُكتب شيء في المستودع).
   الاستعمال: node smoke.js <جذر المستودع> <أول درس جديد> <آخر درس جديد> */
'use strict';
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = process.argv[2], first = +process.argv[3], last = +process.argv[4];
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
  const base = 'http://127.0.0.1:' + port + '/law136/index.html';
  const browser = await chromium.launch();
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
    const routes = ['#home', '#imp', '#imp-1', '#imp-2', '#plan', '#sum', '#quiz', '#rev', '#review', '#eve', '#nb', '#cells'];
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
      await page.screenshot({ path: '/home/claude/work/tools/shot-home.png' });
      await page.evaluate((h) => { location.hash = h; }, '#l-' + first);
      await page.waitForTimeout(300);
      await page.screenshot({ path: '/home/claude/work/tools/shot-lesson.png' });
      await page.evaluate(() => { location.hash = '#quiz'; });
      await page.waitForTimeout(300);
      const quizText = await page.evaluate(() => (document.querySelector('main') || document.body).innerText);
      out.push('#quiz mentions chapters: ' + ['الفصل الأول', 'الفصل الخامس', 'الفصل السادس', 'الفصل السابع', 'الفصل الثامن', 'الفصل التاسع', 'الفصل العاشر'].filter((c) => quizText.indexOf(c) > -1).join('، '));
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
