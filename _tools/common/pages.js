#!/usr/bin/env node
/* تجهيز صفحات الكتاب المصوَّر: يرسم كل صفحة صورةً، ويقرؤها آلياً بإعدادات القراءة المختلفة.
   الاستعمال: node _tools/common/pages.js <الرمز> <الكتاب.pdf> <مجلد العمل> --pages 98-353 [--pdf] [--txt] [--jobs N] [--force] [--keep]
   - الصفحات بأرقام الكتاب المطبوعة، وصفحة الملف المصوَّر = صفحة الكتاب − book.pdfOffset من ملف الإعدادات.
   - إعدادات القراءة في scan.readings (الأصل في lib.js). والمسارات كلها من سطر الأمر، ومجلد العمل خارج المستودع.
   - يكتب في مجلد العمل: p127.png (صورة الصفحة بالدقة الأساس) وp127.a.tsv وp127.b.tsv … (كلمات كل قراءة بمواضعها).
   - --pdf يكتب فيه أيضاً «صفحات الكتاب A–B.pdf»: هذه الصفحات كما هي في المصوَّر، يرفعها صاحب الموقع إلى جيمني مع نسخة المراجعة.
   - --txt يكتب فيه p127.txt: القراءة الأولى نصاً، لمراجع يقرؤها بدل الصور. قراءة آلة فيها أغلاط، لا نص معتمد للكتاب.
   - يكمل من حيث توقف: ما وُجد لا يُعاد إلا مع --force. وصور الدقة الأخرى تُحذف بعد قراءتها إلا مع --keep.
   - القراءات مساعد في التدقيق: لا يُبنى منها محتوى ولا يُجمع منها نص للكتاب. */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');
const L = require('./lib');

const { rest, flags } = L.args(process.argv.slice(2), { pages: 1, jobs: 1, force: 0, keep: 0, pdf: 0, txt: 0 });
if (rest.length < 3 || !flags.pages) L.die('usage: node _tools/common/pages.js <code> <book.pdf> <work dir> --pages A-B[,C-D] [--pdf] [--txt] [--jobs N] [--force] [--keep]');
const S = L.loadSubject(rest[0]);
const PDF = path.resolve(rest[1]), OUT = path.resolve(rest[2]);
if (!fs.existsSync(PDF)) L.die('book file not found: ' + PDF);
if (OUT.startsWith(L.REPO + path.sep) || OUT === L.REPO) L.die('the work dir must be outside the repository (the book never enters it): ' + OUT);

const has = (cmd, arg) => { const r = spawnSync(cmd, [arg], { encoding: 'utf8' }); return r.error ? null : (r.stdout || '') + (r.stderr || ''); };
if (has('pdftoppm', '-v') === null) L.die('NOT RUN: pdftoppm is not installed (poppler-utils)', 3);
const langs = has('tesseract', '--list-langs');
if (langs === null) L.die('NOT RUN: tesseract is not installed', 3);
const have = new Set(langs.split('\n').map((s) => s.trim()).filter(Boolean));
S.scan.readings.forEach((r) => {
  const m = r.args.match(/(?:^|\s)-l\s+(\S+)/);
  (m ? m[1].split('+') : []).forEach((lg) => { if (!have.has(lg)) L.die('NOT RUN: tesseract language "' + lg + '" (reading ' + r.name + ') is not installed', 3); });
});

const pages = [];
L.toLatin(flags.pages).split(',').forEach((part) => {
  const m = part.trim().match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
  if (!m || (m[2] && +m[2] < +m[1])) L.die('bad --pages: ' + flags.pages);
  for (let p = +m[1]; p <= +(m[2] || m[1]); p++) pages.push(p);
});
const info = has('pdfinfo', PDF), count = info && (info.match(/^Pages:\s+(\d+)/m) || [])[1];
const off = S.book.pdfOffset;
const outside = pages.filter((p) => p - off < 1 || (count && p - off > +count));
if (outside.length) L.die('book page(s) outside the scanned file (' + (count || '?') + ' pages, pdfOffset ' + off + '): ' + outside.slice(0, 8).join(', ') + (outside.length > 8 ? ' …' : ''));
fs.mkdirSync(OUT, { recursive: true });

const run = (cmd, args) => new Promise((resolve) => {
  const c = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'], env: Object.assign({}, process.env, { OMP_THREAD_LIMIT: '1' }) });
  let err = '';
  c.stderr.on('data', (d) => { err += d; });
  c.on('error', (e) => resolve({ ok: false, err: String(e) }));
  c.on('close', (code) => resolve({ ok: code === 0, err: err.trim().split('\n').pop() }));
});
const full = (f) => fs.existsSync(f) && fs.statSync(f).size > 0;
const stat = { rendered: 0, read: {}, failed: [] };
S.scan.readings.forEach((r) => { stat.read[r.name] = 0; });

async function render(p, dpi, file) {
  const base = file.replace(/\.png$/, '') + '.part';
  const r = await run('pdftoppm', ['-r', String(dpi), '-gray', '-f', String(p - off), '-l', String(p - off), '-singlefile', '-png', PDF, base]);
  if (!r.ok || !full(base + '.png')) return 'render ' + dpi + ': ' + r.err;
  fs.renameSync(base + '.png', file);
  return '';
}
async function onePage(p) {
  const img = path.join(OUT, 'p' + p + '.png');
  if (flags.force || !full(img)) { const e = await render(p, S.scan.dpi, img); if (e) return stat.failed.push('p' + p + ' ' + e); stat.rendered++; }
  for (const r of S.scan.readings) {
    const tsv = path.join(OUT, 'p' + p + '.' + r.name + '.tsv');
    if (!flags.force && full(tsv)) continue;
    let src = img;
    if (r.dpi !== S.scan.dpi) {
      src = path.join(OUT, 'p' + p + '.' + r.dpi + '.png');
      if (flags.force || !full(src)) { const e = await render(p, r.dpi, src); if (e) { stat.failed.push('p' + p + ' ' + e); continue; } }
    }
    const tmp = path.join(OUT, 'p' + p + '.' + r.name + '.part');
    const t = await run('tesseract', [src, tmp].concat(r.args.split(/\s+/).filter(Boolean), ['tsv']));
    if (!t.ok || !fs.existsSync(tmp + '.tsv')) { stat.failed.push('p' + p + ' reading ' + r.name + ': ' + t.err); continue; }
    fs.renameSync(tmp + '.tsv', tsv);
    stat.read[r.name]++;
  }
  if (!flags.keep) S.scan.readings.forEach((r) => { const f = path.join(OUT, 'p' + p + '.' + r.dpi + '.png'); if (r.dpi !== S.scan.dpi && fs.existsSync(f)) fs.unlinkSync(f); });
}
(async () => {
  const t0 = Date.now(), queue = pages.slice();
  const jobs = Math.max(1, +(flags.jobs || os.cpus().length) || 1);
  await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, async () => { while (queue.length) await onePage(queue.shift()); }));
  const done = pages.filter((p) => full(path.join(OUT, 'p' + p + '.png')) && S.scan.readings.every((r) => full(path.join(OUT, 'p' + p + '.' + r.name + '.tsv')))).length;
  console.log('pages ' + pages[0] + '–' + pages[pages.length - 1] + ': ' + done + ' of ' + pages.length + ' ready · rendered now ' + stat.rendered
    + ' · read now ' + S.scan.readings.map((r) => r.name + ' ' + stat.read[r.name]).join(', ') + ' · failed ' + stat.failed.length + ' · ' + Math.round((Date.now() - t0) / 1000) + 's');
  stat.failed.slice(0, 20).forEach((f) => console.log('  FAILED ' + f));
  if (flags.txt) {                       /* القراءة الأولى نصاً، لمراجع يقرؤها بدل الصور */
    const r0 = S.scan.readings[0].name;
    let n = 0;
    pages.forEach((p) => {
      const tsv = path.join(OUT, 'p' + p + '.' + r0 + '.tsv');
      if (!full(tsv)) return;
      const lines = [];
      let key = '';
      fs.readFileSync(tsv, 'utf8').split('\n').forEach((row) => {
        const c = row.split('\t');
        if (c[0] !== '5' || !(c[11] || '').trim()) return;
        const k = c[2] + '.' + c[3] + '.' + c[4];
        if (k !== key) { key = k; lines.push([]); }
        lines[lines.length - 1].push(c.slice(11).join(' ').trim());
      });
      fs.writeFileSync(path.join(OUT, 'p' + p + '.txt'), '[قراءة آلية للصفحة ' + p + '، الإعداد ' + r0 + ': تخطئ في النقاط والهمزات والأرقام وتلصق الكلمات، وليست نصاً معتمداً للكتاب]\n' + lines.map((l) => l.join(' ')).join('\n') + '\n');
      n++;
    });
    console.log('  machine reading as text (' + r0 + '): ' + n + ' page(s), p<N>.txt in the work dir');
  }
  if (flags.pdf) {                       /* ملف صفحات الدفعة كما هي في المصوَّر */
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pg-')), parts = [];
    pages.forEach((p) => { const r = spawnSync('pdfseparate', ['-f', String(p - off), '-l', String(p - off), PDF, path.join(tmp, 'p-%d.pdf')], { encoding: 'utf8' }); const f = path.join(tmp, 'p-' + (p - off) + '.pdf'); if (!r.error && r.status === 0 && fs.existsSync(f)) parts.push(f); });
    const out = path.join(OUT, 'صفحات الكتاب ' + pages[0] + '–' + pages[pages.length - 1] + '.pdf');
    let ok = parts.length === pages.length;
    if (ok && parts.length === 1) fs.copyFileSync(parts[0], out);
    else if (ok) { const u = spawnSync('pdfunite', parts.concat([out]), { encoding: 'utf8' }); ok = !u.error && u.status === 0; }
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(ok ? '  pdf of these pages: ' + out : '  NOT RUN: the pdf of these pages was not written (pdfseparate and pdfunite, from poppler-utils, are needed)');
  }
  process.exit(stat.failed.length || done < pages.length ? 1 : 0);
})();
