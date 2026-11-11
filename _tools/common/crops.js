#!/usr/bin/env node
/* القصاصات المجمّعة للمدقق المستقل: يقصّ المواضع من صور الصفحات بدقتها الكاملة، بضع قصاصات في الصورة الواحدة، بلا تصغير.
   المدقق لا يحمل صور الصفحات: يقرأ الصور المجمّعة وindex.md، ويكتب حكمه في ملف الأحكام. وما لم يتضح يُعرض وحده مكبّراً بـ --zoom.
   أربعة استعمالات:
     node _tools/common/crops.js <الرمز> <مجلد العمل> <مجلد الإخراج> [--queue compare.json] [--which img|open|all|dots,agree,…] [--ids 120.45,…] [--pages A-B]
         مواضع برنامج المقارنة. الأصل --which img: ما يُرجع فيه إلى الصورة. وopen: ما قُبل بلا صورة. وagree: ما اتفقت فيه القراءتان على لفظ آخر.
     node _tools/common/crops.js <الرمز> <مجلد العمل> <مجلد الإخراج> --list <ملف>
         نصوص بصفحاتها، سطر لكل نص «الصفحة | النص» أو «المعرّف | الصفحة | النص»: ما نُقل من أرقام وتواريخ وحواشٍ أجنبية، وبنود تقرير جيمني.
     node _tools/common/crops.js <الرمز> <مجلد العمل> <مجلد الإخراج> --chapter <فصل.js ...>
         كل نص حرفي في ملف فصل (كتل q وتعريفاتها)، بمعرّفاته في show.js: l7.s3. يجتمع مع --list.
     node _tools/common/crops.js <الرمز> <مجلد العمل> <مجلد الإخراج> --zoom <الكتاب.pdf> <معرّف ...>
         قصاصة واحدة لكل معرّف بدقة التكبير (copy.zoom)، لما لم يتضح في الصور المجمّعة.
   --width عرض الصورة (1100) و--pixels أقصى عدد نقاطها (1150000): ما زاد عليهما يصغّره قارئ الصور فتضيع الدقة.
   مجلد العمل ما كتبته pages.js. ومجلد الإخراج خارج المستودع. يكتب: sheet-001.png … وindex.md وcrops.json وverdicts.template.tsv. */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const C = require('./copylib');
const L = C.L;

const { rest, flags } = L.args(process.argv.slice(2), { queue: 1, which: 1, ids: 1, pages: 1, list: 1, chapter: 'many', zoom: 1, width: 1, pixels: 1 });
if (rest.length < 3) L.die('usage: node _tools/common/crops.js <code> <work dir> <out dir> [--queue compare.json] [--which img|open|all|reasons] [--pages A-B] | --list <file> | --chapter <chapter.js> | --zoom <book.pdf> <id ...>');
const S = L.loadSubject(rest[0]);
const WORK = path.resolve(rest[1]), OUT = path.resolve(rest[2]);
if (OUT.startsWith(L.REPO + path.sep) || OUT === L.REPO) L.die('the out dir must be outside the repository (crops are pieces of the book): ' + OUT);
fs.mkdirSync(OUT, { recursive: true });
const W = +(flags.width || 1100), PIXELS = +(flags.pixels || 1150000), LABEL = 28;
const HMAX = Math.min(1560, Math.floor(PIXELS / W));
const WHY = { dots: 'نقاط أو همزات', glue: 'كلمة ملتصقة', agree: 'اتفقت قراءتان على غيره', word: 'كلمة أخرى', absent: 'لم تقرأه قراءة', missed: 'قرأته قراءتان وليس في المنسوخ', open: 'غير مؤكد', quote: 'نص حرفي' };

const draw = (job) => {
  const jf = path.join(OUT, '.job.json');
  fs.writeFileSync(jf, JSON.stringify(job));
  const r = spawnSync('python3', ['-I', path.join(__dirname, 'crops_draw.py'), jf], { encoding: 'utf8' });
  fs.unlinkSync(jf);
  if (r.error) L.die('NOT RUN: python3 is not installed', 3);
  if (r.status === 3) L.die((r.stdout || '').trim(), 3);
  if (r.status !== 0) L.die('crops_draw.py failed: ' + ((r.stderr || '').trim().split('\n').pop() || r.stdout));
};
const pageCache = {};
const pageOf = (p) => {
  if (pageCache[p]) return pageCache[p];
  const img = path.join(WORK, 'p' + p + '.png'), tsv = path.join(WORK, 'p' + p + '.' + S.copy.readings[0].name + '.tsv');
  if (!fs.existsSync(img) || !fs.existsSync(tsv)) return (pageCache[p] = null);
  const rd = C.readTsv(tsv, S.copy.dpi / S.copy.readings[0].dpi);
  const hs = rd.toks.map((t) => t.box.h).sort((a, b) => a - b);
  return (pageCache[p] = { img, rd, lh: hs.length ? hs[hs.length >> 1] : Math.round(S.copy.dpi / 6), w: rd.page ? rd.page.w : 0, h: rd.page ? rd.page.h : 0 });
};
/* مستطيلات القصّ لموضع: قصاصة واحدة حول الكلمة بعرض الصورة، أو بلاطات متداخلة من اليمين إلى اليسار إن كان أعرض أو أطول */
function rects(pg, box) {
  const pad = Math.round(1.1 * pg.lh), maxH = HMAX - LABEL;
  const y0 = Math.max(0, box.y - pad), y1 = Math.min(pg.h || 1e9, box.y + box.h + pad);
  const xs = [], ys = [];
  if (box.w + 80 <= W) {
    const cx = box.x + box.w / 2;
    xs.push(Math.round(Math.max(0, Math.min((pg.w || 1e9) - W, cx - W / 2))));
  } else {
    for (let x1 = Math.min(pg.w || 1e9, box.x + box.w + 40); ; x1 -= W - 100) { xs.push(Math.max(0, x1 - W)); if (x1 - W <= box.x - 40) break; }
  }
  if (y1 - y0 <= maxH) ys.push([y0, y1]);
  else for (let y = y0; ; y += maxH - 60) { ys.push([y, Math.min(y1, y + maxH)]); if (y + maxH >= y1) break; }
  const out = [];
  ys.forEach(([a, b]) => xs.forEach((x) => out.push([x, a, x + W, b])));
  return out;
}

/* --- التكبير: قصاصة واحدة لكل معرّف --- */
if (flags.zoom) {
  const idx = path.join(OUT, 'crops.json');
  if (!fs.existsSync(idx)) L.die('no crops.json in ' + OUT + ': make the grouped crops first');
  const known = JSON.parse(fs.readFileSync(idx, 'utf8'));
  const ids = rest.slice(3);
  if (!ids.length) L.die('give the id(s) to zoom on');
  const k = S.copy.zoom / S.copy.dpi, sheets = [];
  ids.forEach((id) => {
    const t = known[id];
    if (!t) L.die('unknown id: ' + id);
    const hi = path.join(OUT, '.zoom-p' + t.page);
    if (!fs.existsSync(hi + '.png')) {
      const pp = String(t.page - S.book.pdfOffset);
      const r = spawnSync('pdftoppm', ['-r', String(S.copy.zoom), '-gray', '-f', pp, '-l', pp, '-singlefile', '-png', path.resolve(flags.zoom), hi], { encoding: 'utf8' });
      if (r.error) L.die('NOT RUN: pdftoppm is not installed (poppler-utils)', 3);
      if (r.status !== 0 || !fs.existsSync(hi + '.png')) L.die('could not render page ' + t.page + ': ' + (r.stderr || '').trim());
    }
    const b = t.box, width = Math.min(1560, Math.max(600, Math.round((b.w + 6 * t.lh) * k)));
    const cx = (b.x + b.w / 2) * k, top = Math.round((b.y - 0.8 * t.lh) * k), bot = Math.round((b.y + b.h + 0.8 * t.lh) * k);
    const x0 = Math.max(0, Math.round(cx - width / 2));
    const name = 'zoom-' + id.replace(/[^0-9A-Za-z._-]/g, '_') + '.png';
    sheets.push({ out: path.join(OUT, name), width, crops: [{ label: id + '  p' + t.page + '  x' + k, img: hi + '.png', rect: [x0, top, x0 + width, Math.min(bot, top + 1560 - LABEL)], marks: (t.marks || []).map((m) => [Math.round(m[0] * k), Math.round(m[1] * k), Math.round(m[2] * k)]) }] });
  });
  draw({ sheets });
  fs.readdirSync(OUT).filter((f) => /^\.zoom-p\d+\.png$/.test(f)).forEach((f) => fs.unlinkSync(path.join(OUT, f)));
  console.log('zoomed crops (' + S.copy.zoom + ' dpi): ' + sheets.map((s) => path.basename(s.out)).join(' '));
  process.exit(0);
}

/* --- المواضع --- */
const targets = [], skipped = [];
/* نص بصفحته: يُبحث عن أقرب نافذة إليه في قراءة الصفحة، ثم يُقابل بها كلمةً كلمة، فيُعرف موضعه في صورتها */
function locate(page, text) {
  const pg = pageOf(page);
  if (!pg) return 'page ' + page + ' has no image in the work dir';
  const T = C.words(text), O = pg.rd.toks;
  if (!T.length) return 'no words';
  const need = {}; T.forEach((t) => { need[t.sk] = (need[t.sk] || 0) + 1; });
  const span = Math.min(O.length, T.length + Math.max(4, Math.ceil(T.length * 0.3)));
  let best = -1, at = 0;
  for (let j = 0; j + span <= O.length; j++) {
    const got = {}; let n = 0;
    for (let q = j; q < j + span; q++) { const k = O[q].sk; if (need[k] && (got[k] = (got[k] || 0) + 1) <= need[k]) n++; }
    if (n > best) { best = n; at = j; }
  }
  const win = O.slice(at, at + span), al = C.align(T, win), hit = [];
  al.res.forEach((r) => { if (r.t === 'eq' || r.t === 'var' || r.t === 'near') r.o.forEach((j) => hit.push(win[j])); });
  if (hit.length < Math.max(1, Math.ceil(T.length * 0.5))) return 'not found on page ' + page + ': pass a few distinctive words of it';
  const x0 = Math.min(...hit.map((o) => o.box.x)), y0 = Math.min(...hit.map((o) => o.box.y));
  return { x: x0, y: y0, w: Math.max(...hit.map((o) => o.box.x + o.box.w)) - x0, h: Math.max(...hit.map((o) => o.box.y + o.box.h)) - y0 };
}
/* pages: صفحة أو مدى «130–131»: يُجرَّب النص في صفحاته واحدة واحدة */
function addQuote(id, pages, text) {
  const sp = L.span(pages);
  if (!sp || !text) { skipped.push(id + ' (no page or no text)'); return; }
  let why = '';
  for (let p = sp[0]; p <= Math.min(sp[1], sp[0] + 3); p++) {
    const box = locate(p, text);
    if (typeof box !== 'string') { targets.push({ id, page: p, why: 'quote', box, exact: false, note: '«' + text + '»' }); return; }
    why = why || box;
  }
  skipped.push(id + ' (' + why + ')');
}
if (flags.list || flags.chapter) {
  if (flags.list) fs.readFileSync(flags.list, 'utf8').split('\n').forEach((ln, n) => {
    if (!ln.trim() || ln.trim().startsWith('#')) return;
    const c = ln.split('|').map((x) => x.trim());
    if (c.length >= 3) addQuote(c[0], c[1], c.slice(2).join('|')); else addQuote('q' + (n + 1), c[0], c.slice(1).join('|'));
  });
  /* ملف فصل: كل نص حرفي فيه (كتلة q، وبطاقة تعريف بنص الكتاب، وخانة defs) بمعرّفه في show.js */
  (flags.chapter || []).forEach((f) => {
    const ch = L.loadChapter(S, f);
    (ch.lessons || []).forEach((l) => {
      (l.summary || []).forEach((b, n) => { if (b && b.t === 'q') addQuote(l.id + '.s' + (n + 1), b.pg, L.isDefBlock(b) ? L.defFull(b) : b.x); });
      (l.cards || []).forEach((k) => { if (k.type === 'def' && k.bk === true && !k.auto) addQuote(k.id, k.pg, k.back); });
    });
    (ch.defs || []).forEach((d, n) => addQuote(ch.id + '.d' + (n + 1), d.pg, d.parts.join(' ')));
  });
} else {
  const qf = flags.queue ? path.resolve(flags.queue) : path.join(WORK, 'compare.json');
  if (!fs.existsSync(qf)) L.die('no comparison file: ' + qf + ' (run compare.js first, or use --list)');
  const Q = JSON.parse(fs.readFileSync(qf, 'utf8'));
  const which = (flags.which || 'img').split(','), only = flags.ids ? flags.ids.split(',') : null;     /* --ids: مواضع بعينها بمعرّفاتها */
  let range = null;
  if (flags.pages) { const m = L.toLatin(flags.pages).match(/^(\d+)\s*[-–]\s*(\d+)$/); if (!m) L.die('bad --pages'); range = [+m[1], +m[2]]; }
  const names = Q.readings.map((r) => r.name);
  Q.items.forEach((it) => {
    if (range && (it.page < range[0] || it.page > range[1])) return;
    if (only ? !only.includes(it.id) : !(which.includes('all') || which.includes(it.s) || which.includes(it.why))) return;
    if (!it.box) { skipped.push(it.id + ' (no place on the page image)'); return; }
    const read = it.why === 'missed' ? 'قرأت قراءتان هنا «' + it.read[0].join(' ') + '» وليس في المنسوخ'
      : 'القراءات: ' + names.map((nm, r) => nm + ' «' + it.read.map((f) => f[r] || '∅').join(' ') + '»').join(' · ');
    targets.push({ id: it.id, page: it.page, why: it.why, box: it.box, exact: it.exact,
      note: (it.sec === 'fn' ? 'حاشية · ' : '') + it.ctx[0] + ' [[' + (it.words.join(' ') || '؟') + ']] ' + it.ctx[1] + ' — ' + read });
  });
}
targets.sort((a, b) => a.page - b.page || a.box.y - b.box.y);

/* --- التجميع في صور --- */
const sheets = [], index = {}, lines = [];
let cur = null;
const flush = () => { if (cur && cur.crops.length) sheets.push(cur); cur = null; };
targets.forEach((t) => {
  const pg = pageOf(t.page);
  if (!pg) { skipped.push(t.id + ' (page ' + t.page + ' has no image in the work dir)'); return; }
  const rs = rects(pg, t.box);
  const single = t.exact && t.box.h < 1.8 * pg.lh;
  const marks = single ? [[t.box.x, Math.min(t.box.y + t.box.h + Math.round(0.25 * pg.lh), (pg.h || 1e9) - 2), t.box.x + t.box.w]] : [];
  index[t.id] = { page: t.page, box: t.box, lh: pg.lh, marks, sheets: [] };
  /* موضع يقع في قصاصة جاره (السطر نفسه أو الذي يليه، وداخل عرضها) يُضاف إليها بخطّه، وتُمدّ إلى سطره إن لزم، ولا تُقصّ له قصاصة ثانية */
  const last = cur && cur.crops[cur.crops.length - 1];
  if (last && rs.length === 1 && single && last.page === t.page && last.n < 4 && t.box.x >= last.rect[0] + 30 && t.box.x + t.box.w <= last.rect[2] - 30
      && t.box.y >= last.rect[1] + Math.round(0.3 * pg.lh)) {
    const grow = Math.max(0, rs[0][3] - last.rect[3]);
    if (grow <= Math.round(2.2 * pg.lh) && cur.height + grow <= HMAX) {
      last.rect[3] += grow; cur.height += grow;
      last.label = last.label.replace(/  p\d+$/, '') + ' + ' + t.id + '  p' + t.page; last.marks.push(marks[0]); last.n++;
      cur.ids.push(t.id); index[t.id].sheets.push(path.basename(cur.out)); t.done = true;
      return;
    }
  }
  rs.forEach((r, n) => {
    const h = LABEL + (r[3] - r[1]);
    if (cur && cur.height + h > HMAX) flush();
    if (!cur) cur = { out: path.join(OUT, 'sheet-' + String(sheets.length + 1).padStart(3, '0') + '.png'), width: W, height: 0, crops: [], ids: [] };
    cur.crops.push({ label: t.id + (rs.length > 1 ? ' (' + (n + 1) + '/' + rs.length + ')' : '') + '  p' + t.page, img: pg.img, rect: r, marks: marks.filter((m) => m[1] >= r[1] && m[1] <= r[3]), page: t.page, n: rs.length === 1 && single ? 1 : 9 });
    cur.height += h;
    if (!cur.ids.includes(t.id)) cur.ids.push(t.id);
    const nm = path.basename(cur.out);
    if (!index[t.id].sheets.includes(nm)) index[t.id].sheets.push(nm);
  });
  t.done = true;
});
flush();
if (sheets.length) draw({ sheets: sheets.map((s) => ({ out: s.out, width: s.width, crops: s.crops.map((c) => ({ label: c.label, img: c.img, rect: c.rect, marks: c.marks })) })) });

const byId = {}; targets.forEach((t) => { byId[t.id] = t; });
lines.push('# قصاصات للتحقق بالصورة — ' + S.name, '',
  'لكل قصاصة معرّفها في الشريط الرمادي فوقها. الكلمات المقصودة بين [[ ]] في النص المنسوخ، وتحتها في القصاصة خط أحمر إن عُرف موضعها بدقة.',
  'قابل المنسوخ بما في الصورة حرفاً بحرف (النقاط والهمزات خاصة)، واكتب سطراً لكل معرّف في ملف الأحكام: «المعرّف <tab> ok أو wrong أو unclear <tab> ما في الصورة إن خالف المنسوخ».',
  'ok: المنسوخ مطابق للصورة · wrong: الصورة تخالف المنسوخ · unclear: لم يتضح، فيُطلب مكبّراً وحده.', '');
sheets.forEach((s) => {
  lines.push('## ' + path.basename(s.out));
  s.ids.forEach((id) => { const t = byId[id]; lines.push('- ' + id + ' · ص ' + t.page + ' · ' + (WHY[t.why] || t.why) + ' · ' + t.note); });
  lines.push('');
});
fs.writeFileSync(path.join(OUT, 'index.md'), lines.join('\n'));
fs.writeFileSync(path.join(OUT, 'crops.json'), JSON.stringify(index));
fs.writeFileSync(path.join(OUT, 'verdicts.template.tsv'), '# id\tok|wrong|unclear\twhat the image says\n' + targets.filter((t) => t.done).map((t) => t.id + '\t\t').join('\n') + '\n');
const tall = sheets.reduce((m, s) => Math.max(m, s.height), 0);
console.log('crops: ' + targets.filter((t) => t.done).length + ' spot(s) in ' + sheets.length + ' sheet(s), ' + W + ' px wide, tallest ' + tall + ' px, full resolution (' + S.copy.dpi + ' dpi)'
  + (skipped.length ? ' · skipped ' + skipped.length : '') + ' · ' + OUT);
skipped.slice(0, 15).forEach((s) => console.log('  SKIPPED ' + s));
