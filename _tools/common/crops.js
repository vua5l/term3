#!/usr/bin/env node
/* القصاصات المجمّعة للمدقق المستقل: يقصّ موضع كل نص منقول من صورة صفحته بدقتها الكاملة، بضع قصاصات في الصورة الواحدة، بلا تصغير.
   المدقق لا يحمل صور الصفحات: يقرأ الصور المجمّعة وindex.md، ويكتب حكمه في ملف الأحكام. وما لم يتضح يُعرض وحده مكبّراً بـ --zoom.
   موضع النص تدلّ عليه القراءات الآلية لصفحته، وما خالفته فيه قراءة يُكتب في الفهرس ويُخطّ تحته بالأحمر. والحكم للصورة وحدها.
   ثلاثة استعمالات، ويجتمع الأولان:
     node _tools/common/crops.js <الرمز> <مجلد العمل> <مجلد الإخراج> --chapter <فصل.js ...>
         كل نص حرفي في ملف فصل أو جزء منه (كتل q وتعريفاتها، وبطاقات التعريف بنص الكتاب)، بمعرّفاته في show.js: l7.s3.
     node _tools/common/crops.js <الرمز> <مجلد العمل> <مجلد الإخراج> --list <ملف>
         نصوص بصفحاتها، سطر لكل نص «الصفحة | النص» أو «المعرّف | الصفحة | النص»: ما نُقل من أرقام وتواريخ وأرقام مواد وألفاظ أجنبية، واقتباسات بنود جيمني والمراجع.
     node _tools/common/crops.js <الرمز> <مجلد العمل> <مجلد الإخراج> --zoom <الكتاب.pdf> <معرّف ...>
         قصاصة واحدة لكل معرّف بدقة التكبير (scan.zoom)، لما لم يتضح في الصور المجمّعة.
   --width عرض الصورة (1100) و--pixels أقصى عدد نقاطها (1150000): ما زاد عليهما يصغّره قارئ الصور فتضيع الدقة.
   مجلد العمل ما كتبته pages.js. ومجلد الإخراج خارج المستودع. يكتب: sheet-001.png … وindex.md وcrops.json وverdicts.template.tsv. */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const C = require('./ocrlib');
const L = C.L;

const { rest, flags } = L.args(process.argv.slice(2), { list: 1, chapter: 'many', zoom: 1, width: 1, pixels: 1 });
if (rest.length < 3 || !(flags.list || flags.chapter || flags.zoom)) L.die('usage: node _tools/common/crops.js <code> <work dir> <out dir> --chapter <chapter.js ...> | --list <file> | --zoom <book.pdf> <id ...>');
const S = L.loadSubject(rest[0]);
const WORK = path.resolve(rest[1]), OUT = path.resolve(rest[2]);
if (OUT.startsWith(L.REPO + path.sep) || OUT === L.REPO) L.die('the out dir must be outside the repository (crops are pieces of the book): ' + OUT);
fs.mkdirSync(OUT, { recursive: true });
const W = +(flags.width || 1100), PIXELS = +(flags.pixels || 1150000), LABEL = 28;
const HMAX = Math.min(1560, Math.floor(PIXELS / W));

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
  if (pageCache[p] !== undefined) return pageCache[p];
  const pr = C.pageReadings(S, WORK, p);
  if (!pr || !pr.img) return (pageCache[p] = null);
  const rd = pr.R[0], hs = rd.toks.map((t) => t.box.h).sort((a, b) => a - b);
  return (pageCache[p] = { img: pr.img, rd, lh: hs.length ? hs[hs.length >> 1] : Math.round(S.scan.dpi / 6), w: rd.page ? rd.page.w : 0, h: rd.page ? rd.page.h : 0 });
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
  const k = S.scan.zoom / S.scan.dpi, sheets = [];
  ids.forEach((id) => {
    const t = known[id];
    if (!t) L.die('unknown id: ' + id);
    const hi = path.join(OUT, '.zoom-p' + t.page);
    if (!fs.existsSync(hi + '.png')) {
      const pp = String(t.page - S.book.pdfOffset);
      const r = spawnSync('pdftoppm', ['-r', String(S.scan.zoom), '-gray', '-f', pp, '-l', pp, '-singlefile', '-png', path.resolve(flags.zoom), hi], { encoding: 'utf8' });
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
  console.log('zoomed crops (' + S.scan.zoom + ' dpi): ' + sheets.map((s) => path.basename(s.out)).join(' '));
  process.exit(0);
}

/* --- المواضع --- */
const targets = [], skipped = [];
/* نص منقول بصفحته (رقم أو مدى «130–131»): تدلّ القراءات الآلية على موضعه في صورة صفحته، وعلى ما خالفته فيه. والنص العابر إلى صفحة تالية قصاصتان */
function addQuote(id, pages, text) {
  if (!L.span(pages) || !text) { skipped.push(id + ' (no page or no text)'); return; }
  const r = C.checkQuote(S, WORK, pages, text);
  if (!r.found) { skipped.push(id + ' (' + (r.unready ? 'page ' + r.unready.join(', ') + ' has no image in the work dir' : r.why + ': pass a few distinctive words of it') + ')'); return; }
  const note = '«' + text + '»' + (r.flags.length ? ' — انتبه: ' + r.flags.map(C.say).join('؛ ') : '');
  r.pieces.forEach((pc, n) => targets.push({ id: r.pieces.length > 1 ? id + '~' + (n + 1) : id, page: pc.page, box: pc.box, marks: pc.marks, flagged: r.flags.length,
    note: (r.pieces.length > 1 ? '(قصاصة ' + (n + 1) + ' من ' + r.pieces.length + ') ' : '') + note }));
}
if (flags.list) fs.readFileSync(flags.list, 'utf8').split('\n').forEach((ln, n) => {
  if (!ln.trim() || ln.trim().startsWith('#')) return;
  const c = ln.split('|').map((x) => x.trim());
  if (c.length >= 3) addQuote(c[0], c[1], c.slice(2).join('|')); else addQuote('q' + (n + 1), c[0], c.slice(1).join('|'));
});
/* ملف فصل أو جزء منه: كل نص حرفي فيه (كتلة q، وبطاقة تعريف بنص الكتاب، وخانة defs) بمعرّفه في show.js */
(flags.chapter || []).forEach((f) => {
  const ch = L.loadChapter(S, f);
  (ch.lessons || []).forEach((l) => {
    (l.summary || []).forEach((b, n) => { if (b && b.t === 'q') addQuote(l.id + '.s' + (n + 1), b.pg, L.isDefBlock(b) ? L.defFull(b) : b.x); });
    (l.cards || []).forEach((k) => { if (k.type === 'def' && k.bk === true && !k.auto) addQuote(k.id, k.pg, k.back); });
  });
  (ch.defs || []).forEach((d, n) => addQuote(ch.id + '.d' + (n + 1), d.pg, d.parts.join(' ')));
});
targets.sort((a, b) => a.page - b.page || a.box.y - b.box.y);

/* --- التجميع في صور --- */
const sheets = [], index = {}, lines = [];
let cur = null;
const flush = () => { if (cur && cur.crops.length) sheets.push(cur); cur = null; };
targets.forEach((t) => {
  const pg = pageOf(t.page);
  if (!pg) { skipped.push(t.id + ' (page ' + t.page + ' has no image in the work dir)'); return; }
  const rs = rects(pg, t.box);
  /* خط أحمر تحت كل كلمة نبّهت إليها القراءة الآلية */
  const marks = (t.marks || []).map((b) => [b.x, Math.min(b.y + b.h + Math.round(0.25 * pg.lh), (pg.h || 1e9) - 2), b.x + b.w]);
  index[t.id] = { page: t.page, box: t.box, lh: pg.lh, marks, sheets: [] };
  rs.forEach((r, n) => {
    const h = LABEL + (r[3] - r[1]);
    if (cur && cur.height + h > HMAX) flush();
    if (!cur) cur = { out: path.join(OUT, 'sheet-' + String(sheets.length + 1).padStart(3, '0') + '.png'), width: W, height: 0, crops: [], ids: [] };
    cur.crops.push({ label: t.id + (rs.length > 1 ? ' (' + (n + 1) + '/' + rs.length + ')' : '') + '  p' + t.page, img: pg.img, rect: r, marks: marks.filter((m) => m[1] >= r[1] && m[1] <= r[3] && m[2] > r[0] && m[0] < r[2]) });
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
lines.push('# قصاصات للمقابلة بالصورة — ' + S.name, '',
  'لكل قصاصة معرّفها في الشريط الرمادي فوقها. وفي كل سطر هنا النص المنقول إلى الموقع، ثم ما نبّهت إليه القراءة الآلية إن خالفته، وتحته في القصاصة خط أحمر.',
  'قابل المنقول بما في الصورة حرفاً بحرف (النقاط والهمزات خاصة، وكل كلمة ساقطة أو زائدة)، واكتب سطراً لكل معرّف في ملف الأحكام: «المعرّف <tab> ok أو wrong أو unclear <tab> ما في الصورة إن خالف المنقول».',
  'ok: المنقول مطابق للصورة · wrong: الصورة تخالف المنقول · unclear: لم يتضح، فيُطلب مكبّراً وحده. والقراءة الآلية تخطئ: الحكم للصورة وحدها.', '');
sheets.forEach((s) => {
  lines.push('## ' + path.basename(s.out));
  s.ids.forEach((id) => { const t = byId[id]; lines.push('- ' + id + ' · ص ' + t.page + ' · ' + t.note); });
  lines.push('');
});
fs.writeFileSync(path.join(OUT, 'index.md'), lines.join('\n'));
fs.writeFileSync(path.join(OUT, 'crops.json'), JSON.stringify(index));
fs.writeFileSync(path.join(OUT, 'verdicts.template.tsv'), '# id\tok|wrong|unclear\twhat the image says\n' + targets.filter((t) => t.done).map((t) => t.id + '\t\t').join('\n') + '\n');
const tall = sheets.reduce((m, s) => Math.max(m, s.height), 0);
console.log('crops: ' + targets.filter((t) => t.done).length + ' spot(s) in ' + sheets.length + ' sheet(s), ' + W + ' px wide, tallest ' + tall + ' px, full resolution (' + S.scan.dpi + ' dpi)'
  + ' · flagged by the machine readings ' + targets.filter((t) => t.done && t.flagged).length + (skipped.length ? ' · skipped ' + skipped.length : '') + ' · ' + OUT);
skipped.slice(0, 15).forEach((s) => console.log('  SKIPPED ' + s));
