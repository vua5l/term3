#!/usr/bin/env node
/* اختبار الأدوات العامة نفسها. يُشغَّل بعد أي تعديل عليها:  node _tools/common/tests/run.js [--fast]
   1) المقابلة: نتائج الأدوات العامة على بيانات الدولي والدستوري المنشورة تُقابَل بنتائج أدواتهما القديمة (_tools/law135 و_tools/law136).
   2) الصيغة الجديدة: موقع تجريبي في مجلد مؤقت، يُحوَّل إليه فصل من الدولي ليُكتب تعريفه مرة واحدة في الملخص، ثم تُشتق بطاقاته وخانته.
   3) التنبيهات الثلاثة وحال الدفعات وملف الإعدادات بحالات مصنوعة.
   4) المتصفح (يُتخطى مع --fast): المرور على الشاشات وفحص التشغيل ومحاكاة الجهازين.
   5) القراءات الآلية: مقابلة المنقول بقراءات مصنوعة، وفحص المصوَّر، والقصاصات المجمّعة من صفحة مصنوعة، وتجهيز الصفحات بملف مصوَّر مصنوع (يُتخطى ما غابت أداته).
   لا يكتب شيئاً في المستودع: كل كتابة في مجلد مؤقت. */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const lib = require('../lib');
const notes = require('../warnings');
const ocr = require('../ocrlib');

const FAST = process.argv.includes('--fast');
const REPO = lib.REPO, T = lib.TOOLS;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'tools-test-'));
const results = [];
let failed = 0;
function test(name, fn) {
  try { const note = fn(); results.push('PASS  ' + name + (note ? ' — ' + note : '')); }
  catch (e) { failed++; results.push('FAIL  ' + name + ' — ' + String(e.message || e).split('\n').slice(0, 14).join(' | ').slice(0, 1800)); }
}
const skip = (name, why) => results.push('SKIP  ' + name + ' — ' + why);
const must = (cond, msg) => { if (!cond) throw new Error(msg); };
function run(cmd, args, opt) {
  const r = cp.spawnSync(cmd, args, Object.assign({ cwd: REPO, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }, opt || {}));
  return { status: r.status, out: (r.stdout || '') + (r.stderr || ''), stdout: r.stdout || '' };
}
const tool = (name, args, env) => run('node', [path.join(T, name)].concat(args), env ? { env: Object.assign({}, process.env, env) } : undefined);
const old = (code, name, args) => run('node', [path.join(REPO, '_tools', code, name)].concat(args));
const read = (f) => fs.readFileSync(f, 'utf8');
const LEGACY = ['law135', 'law136'].filter((c) => fs.existsSync(path.join(REPO, '_tools', c, 'validate.js')) && fs.existsSync(path.join(REPO, c, 'config.js')));

/* نص منسوخ مصنوع لفصل: من نصوصه الحرفية نفسها، تقرؤه الأدوات القديمة وحدها حين تُقابَل نتائجها بنتائج الأدوات العامة. broken: رقم النص الذي يُفسَد عمداً */
function synthText(code, chFile, kind, broken) {
  const S = lib.loadSubject(code), ch = lib.loadChapter(S, chFile);
  const first = (pg) => { const m = String(pg || '').match(/\d+/); return m ? +m[0] : null; };
  const byPage = {}, seen = new Set();
  const add = (pg, t) => { const n = first(pg); if (n === null || !t || seen.has(t)) return; seen.add(t); (byPage[n] = byPage[n] || []).push(t); };
  ch.lessons.forEach((l) => { (l.summary || []).forEach((b) => { if (b.t === 'q') add(b.pg, b.x); }); (l.cards || []).forEach((k) => { if (k.type === 'def' && k.bk) add(k.pg, k.back); }); });
  (ch.defs || []).forEach((d) => add(d.pg, d.parts.join(' ')));
  const m = String(ch.pages).match(/\d+/g).map(Number), L = [];
  let count = 0;
  for (let n = m[0]; n <= m[1]; n++) {
    L.push(kind === 'eq' ? '=== ص ' + n + ' ===' : '## ص ' + n, '# عنوان الصفحة ' + n);
    (byPage[n] || []).forEach((t) => { count++; L.push(count === broken ? t.replace(/\S+\s+\S+/, 'كلمة_مبدَّلة') : t); });
    L.push('نص عادي من الصفحة ' + n + ' لا يطابق شيئاً.');
    if (kind === 'eq') L.push('حواشي:', '(1) حاشية الصفحة ' + n + '.');
  }
  const f = path.join(TMP, code + '-' + path.basename(chFile, '.js') + (broken ? '-broken' : '') + '.md');
  fs.writeFileSync(f, L.join('\n') + '\n');
  return f;
}
const chapterFiles = (code) => { const S = lib.loadSubject(code); return lib.loadSite(S).cfg.chapters.map((id) => path.join(REPO, code, 'data', id + '.js')); };
const hasPending = (code, f) => lib.loadChapter(lib.loadSubject(code), f).lessons.some((l) => l.pending === true);

/* ======================= 1) المقابلة بالأدوات القديمة ======================= */
if (!LEGACY.length) skip('legacy parity', 'the old tools or sites are not in this repository');
LEGACY.forEach((code) => {
  const kind = code === 'law136' ? 'hash' : 'eq';   /* علامة الصفحة في نصوص الأدوات القديمة */
  const files = chapterFiles(code), full = files.filter((f) => !hasPending(code, f)), pend = files.filter((f) => hasPending(code, f));
  test(code + ': validate equals the old validator on every fully built chapter file', () => {
    full.forEach((f) => { const a = tool('validate.js', [code, f]), b = old(code, 'validate.js', [f]); must(a.out === b.out && a.status === b.status, path.basename(f) + ' differs'); });
    return full.length + ' files';
  });
  test(code + ': validate no longer reads a copied-text file, and says where verbatim texts are matched now', () => {
    const f = full[Math.min(1, full.length - 1)], a = tool('validate.js', [code, f, synthText(code, f, kind)]);
    must(a.status === 2 && /text files are no longer read/.test(a.out) && /--pages/.test(a.out), a.out.slice(0, 300));
  });
  if (pend.length) test(code + ': chapter files with pending lessons pass, their pending lessons listed', () => {
    let n = 0;
    pend.forEach((f) => { const a = tool('validate.js', [code, f]); must(a.status === 0 && /OK: no errors\./.test(a.out), path.basename(f) + ' fails'); n += (a.out.match(/: PENDING — /g) || []).length; });
    return n + ' pending lessons in ' + pend.length + ' files';
  });
  test(code + ': merge writes the same bytes as the old merge', () => {
    let n = 0;
    files.forEach((f) => {
      const S = lib.loadSubject(code), ch = lib.loadChapter(S, f), meta = [ch.id, ch.title, ch.name, ch.pages];
      const o1 = path.join(TMP, 'm-new.js'), o2 = path.join(TMP, 'm-old.js');
      const b = old(code, 'merge.js', [o2].concat(meta, [f]));
      if (b.status !== 0) return;   /* الأداة القديمة تتعطل على فصل مخططه وحده */
      const a = tool('merge.js', [code, o1].concat(meta, [f]));
      must(a.status === 0 && read(o1) === read(o2), path.basename(f) + ' differs'); n++;
    });
    return n + ' files';
  });
  test(code + ': make-lessons reproduces the published lessons.json', () => { must(/^SAME/.test(tool('make-lessons.js', [code, '--check']).out), 'different'); });
  test(code + ': defs-check equals the old one (but for one reworded phrase)', () => {
    const fix = (s) => s.replace(/from (a lesson summary|the l31 summary)/, 'from SUMMARY');
    const a = tool('defs-check.js', [code]), b = old(code, 'defs-check.js', []);
    must(fix(a.out) === fix(b.out) && a.status === b.status, 'differs');
  });
  test(code + ': show prints the same items as the old one', () => {
    const f = full[0], ch = lib.loadChapter(lib.loadSubject(code), f), l = ch.lessons[0].id;
    const ids = [l + '.s2', l + 'k1', l + 'o2', l + 'e1', ch.id + 't1', 'n1', 'map:ال'];
    must(tool('show.js', [code, f].concat(ids)).out === old(code, 'show.js', [f].concat(ids)).out, 'differs');
    must(/ \?$/m.test(tool('show.js', [code, f, 'l9999.s1']).out), 'an unknown lesson must print "?"');
  });
  test(code + ': gate passes on the published site without touching it', () => {
    const before = run('git', ['status', '--porcelain']).out;
    const a = tool('gate.js', [code, '--check', '--no-browser']);
    must(a.status === 0 && /RESULT: PASSED/.test(a.out), a.out.slice(-300));
    must(run('git', ['status', '--porcelain']).out === before, 'the working tree changed');
  });
});
if (LEGACY.includes('law135')) {
  const f = path.join(REPO, 'law135', 'data', 'c2.js'), txt = synthText('law135', f, 'eq');
  test('law135: make-defs reproduces the published defs.js and defs-ids.json', () => { must(/^SAME/.test(tool('make-defs.js', ['law135', '--check']).out), 'different'); });
  test('law135: review-copy equals the old one but for the book text, which it no longer carries', () => {
    const strip = (o) => o.split(/\n(?=### |## )/).filter((x) => !x.startsWith('### نص الكتاب لهذا الدرس')).join('\n').split('\n').slice(2).join('\n');
    const a = tool('review-copy.js', ['law135', f]), b = old('law135', 'review-copy.js', [f, txt]);
    must(a.status === 0 && !/نص الكتاب لهذا الدرس/.test(a.stdout) && /نص الكتاب لهذا الدرس/.test(b.stdout), 'the book text is still in the review copy');
    must(strip(a.stdout) === strip(b.stdout), 'what Claude wrote differs from the old review copy');
    must(tool('review-copy.js', ['law135', f, txt]).status === 2, 'a text file was accepted');
  });
  test('law135: make-gemini differs from the old one only where it tells the reader to compare with the attached pages', () => {
    const rv = path.join(TMP, 'review.md'); fs.writeFileSync(rv, tool('review-copy.js', ['law135', f]).stdout);
    const a = tool('make-gemini.js', ['law135', rv, '2', 'الدروس 6 إلى 10']).stdout.split('\n'), b = old('law135', 'make-gemini.js', [rv, '2', 'الدروس 6 إلى 10']).stdout.split('\n');
    const up = a.filter((x) => /ارفع إلى جيمني مع الرسالة الأولى ملف «صفحات الكتاب [0-9–]+\.pdf»/.test(x)), rest = a.filter((x) => !up.includes(x));
    must(up.length === 1 && rest.length === b.length, 'the line that asks for the pages file: ' + up.length + ', lines ' + rest.length + ' against ' + b.length);
    const d = rest.filter((x, i) => x !== b[i]);
    must(d.length === 4 && d.every((x) => /صفحات الكتاب/.test(x)), d.length + ' lines differ');
  });
  test('patchlib: editing an item keeps every field (error type, expected flag)', () => {
    const c = path.join(TMP, 'patch-c2.js'); fs.copyFileSync(f, c);
    const S = lib.loadSubject('law135'), q = lib.loadChapter(S, c).lessons[0].objective.find((x) => x.k === 'tf' && x.a === false);
    const p = require('../patchlib')(c); p.obj(q.id, (o) => { o.q = o.q + ' (معدَّل)'; }); p.save();
    const q2 = lib.loadChapter(S, c).lessons[0].objective.find((x) => x.id === q.id);
    must(q2.q.endsWith('(معدَّل)') && q2.e === q.e && q2.why === q.why && q2.pg === q.pg, 'a field was lost');
    must(tool('validate.js', ['law135', c]).status === 0, 'the patched file no longer validates');
  });
}

/* ======================= 2) الصيغة الجديدة: التعريف يُكتب مرة في الملخص ======================= */
const SBX = path.join(TMP, 'root');
const ENV = { TERM_ROOT: SBX };
const sbx = (name, args) => tool(name, args, ENV);
const X = { code: 'law900', global: 'LAW900' };
const xData = (id) => path.join(SBX, 'law900', 'data', id + '.js');
const asPart = (ch, f) => fs.writeFileSync(f, '(window.' + X.global + ' = window.' + X.global + ' || { chapters: [] }).chapters.push(' + JSON.stringify(ch) + ');\n');
function xLoad(f) { const ctx = lib.newCtx(); lib.run(ctx, f); return lib.copy(ctx.window[X.global].chapters[0]); }
const xMerge = (ch) => { const part = path.join(TMP, 'part.js'); asPart(ch, part); return sbx('merge.js', [X.code, xData(ch.id), ch.id, ch.title, ch.name, ch.pages, part]); };
const xValidate = (ch) => { const part = path.join(TMP, 'v.js'); asPart(ch, part); return sbx('validate.js', [X.code, part]); };
const defBlocks = (ch) => ch.lessons.flatMap((l) => (l.summary || []).filter((b) => b.def).map((b) => ({ l, b })));

if (!LEGACY.includes('law135')) skip('new format', 'needs the law135 data as raw material');
else {
  /* موقع تجريبي من فصل الدولي الثاني، محوَّلاً إلى الصيغة الجديدة */
  fs.mkdirSync(path.join(SBX, 'law900', 'data'), { recursive: true });
  fs.mkdirSync(path.join(SBX, '_tools', 'law900'), { recursive: true });
  fs.writeFileSync(path.join(SBX, '_tools', 'law900', 'subject.json'), JSON.stringify({ code: 'law900', name: 'مادة تجريبية', exam: 'اختبار', book: { title: 'كتاب', author: 'مؤلف', pdfOffset: 0 }, checks: { intro: 'optional', map: 'require' } }, null, 1));
  fs.writeFileSync(path.join(SBX, 'law900', 'config.js'), "window.LAW900_CONFIG = { code: 'law900', name: 'مادة تجريبية', scope: 'ص 127–152', pdfOffset: 0, storageKey: 'law900-v1', chapters: ['c2'] };\n");
  fs.writeFileSync(path.join(SBX, 'law900', 'index.html'), '<script src="data/c2.js"></script><script src="data/defs.js"></script>\n');
  const S135 = lib.loadSubject('law135'), site135 = lib.loadSite(S135, ['defs.js']);
  const src = lib.copy(site135.byId.c2), published = site135.defs.items.filter((it) => it.ch === 'c2');
  const expected = [];
  (src.defs || []).forEach((d) => {
    const text = d.parts.join(' '), item = published.find((it) => it.term === d.term && it.pg === String(d.pg));
    const lesson = src.lessons.find((l) => l.id === item.les);
    let b = lesson.summary.find((x) => x.t === 'q' && !x.def && x.x === text);
    if (b) delete b.x; else { b = { t: 'q', label: d.term, pg: String(d.pg) }; lesson.summary.push(b); }
    b.def = { term: d.term }; if (d.fam) b.def.fam = d.fam; if (d.hide && d.hide.length) b.def.hide = d.hide;
    b.parts = d.parts;
    lesson.cards = lesson.cards.filter((k) => !(k.type === 'def' && k.bk && k.back === text));
    expected.push({ term: d.term, les: lesson.id, pg: String(d.pg), parts: d.parts, hide: d.hide || [] });
  });
  src.lessons.forEach((l) => l.cards.forEach((k) => { if (k.type === 'def' && k.bk) k.bk = false; }));
  delete src.defs;
  let cur = null, firstBytes = null;

  test('new format: a chapter with its definitions written once in the summary validates', () => {
    const r = xValidate(src); must(r.status === 0, r.out.slice(-500));
    must(new RegExp(', defs ' + expected.length + '\\n').test(r.out), 'definition count missing from the report');
    return expected.length + ' definitions';
  });
  test('new format: merge derives one card per definition and fills its text', () => {
    const r = xMerge(lib.copy(src)); must(r.status === 0 && /derived cards \+/.test(r.out), r.out.slice(-300));
    cur = xLoad(xData('c2')); firstBytes = read(xData('c2'));
    const blocks = defBlocks(cur); must(blocks.length === expected.length, 'blocks lost');
    blocks.forEach(({ l, b }) => {
      const k = l.cards.find((c) => c.id === b.def.card);
      must(k && k.auto === true && k.bk === true && k.back === b.parts.join(' ') && k.front === b.def.term && k.pg === b.pg, 'bad derived card for ' + b.def.term);
      must(b.x === b.parts.join(' '), 'x not filled for ' + b.def.term);
    });
    const ids = cur.lessons.flatMap((l) => l.cards.map((k) => k.id)); must(new Set(ids).size === ids.length, 'duplicate card ids');
    must(sbx('validate.js', [X.code, xData('c2')]).status === 0, 'the merged file does not validate');
  });
  test('new format: merging again changes nothing', () => {
    const r = sbx('merge.js', [X.code, xData('c2'), cur.id, cur.title, cur.name, cur.pages, xData('c2')]);
    must(r.status === 0 && /derived cards unchanged/.test(r.out) && read(xData('c2')) === firstBytes, 'not idempotent: ' + r.out.slice(-200));
  });
  test('mind map: with the default settings it is neither required nor accepted, and a subject whose owner chose it requires it', () => {
    /* الموقع التجريبي اختار الخرائط (map: require). وهذه إعدادات مادة لم تخترها: الأصل */
    const off = path.join(TMP, 'map-off.json');
    fs.writeFileSync(off, JSON.stringify({ code: 'law900', name: 'مادة تجريبية', checks: { intro: 'optional' } }));
    const part = path.join(TMP, 'pmap.js'), out = path.join(TMP, 'map-off-c2.js');
    const vOff = (ch) => { asPart(ch, part); return sbx('validate.js', [off, part]); };
    const bare = lib.copy(src); delete bare.map;
    let r = vOff(bare); must(r.status === 0 && /OK: no errors/.test(r.out), 'a chapter without a mind map was refused: ' + r.out.slice(-300));
    r = vOff(lib.copy(src)); must(r.status === 1 && /map is not used for this subject/.test(r.out), 'a mind map nobody chose was accepted');
    r = xValidate(bare); must(r.status === 1 && /map \{t, c\[\]\} missing/.test(r.out), 'a subject that chose mind maps accepted a chapter without one');
    asPart(bare, part);
    r = sbx('merge.js', [off, out, bare.id, bare.title, bare.name, bare.pages, part]);
    must(r.status === 0 && !/· map/.test(r.out) && !/^\s*map:/m.test(read(out)) && xLoad(out).map === undefined, 'merge wrote a mind map: ' + r.out.slice(-200));
    must(sbx('validate.js', [off, out]).status === 0, 'the merged file without a mind map does not validate');
    asPart(lib.copy(src), part);
    r = sbx('merge.js', [off, out, src.id, src.title, src.name, src.pages, part]);
    must(r.status === 1 && /map is not used for this subject/.test(r.out) && xLoad(out).map === undefined, 'merge accepted a mind map nobody chose');
  });
  test('new format: make-defs builds the definitions box from the summary, equal to the published one', () => {
    const r = sbx('make-defs.js', [X.code]); must(r.status === 0, r.out);
    const c = sbx('defs-check.js', [X.code]); must(c.status === 0 && /OK: no errors/.test(c.out), c.out.slice(-400));
    const ctx = lib.newCtx(); lib.run(ctx, path.join(SBX, 'law900', 'data', 'defs.js'));
    const items = ctx.window.LAW900_DEFS.items, key = (x) => JSON.stringify([x.term, x.les, x.pg, x.parts, x.hide]);
    must(items.length === published.length, 'count ' + items.length + ' vs published ' + published.length);
    const want = new Set(published.map(key)); items.forEach((it) => must(want.has(key(it)), 'differs from the published definition: ' + it.term));
    const fam = (D) => JSON.stringify(D.fams.map((f) => [f.name, f.members.length]).sort());
    const pubFams = site135.defs.fams.map((f) => ({ name: f.name, members: f.members.filter((m) => published.some((p) => p.id === m)) })).filter((f) => f.members.length > 1);
    must(fam(ctx.window.LAW900_DEFS) === fam({ fams: pubFams }), 'families differ');
    return items.length + ' definitions, ' + ctx.window.LAW900_DEFS.fams.length + ' families';
  });
  test('new format: ids stay fixed when a definition is added before the others', () => {
    const idsBefore = JSON.parse(read(path.join(SBX, 'law900', 'data', 'defs-ids.json')));
    const ch = xLoad(xData('c2')), before = defBlocks(ch).map(({ b }) => [b.def.term, b.def.card]);
    const l = defBlocks(ch)[0].l;
    l.summary.unshift({ t: 'q', label: 'تعريف جديد', pg: l.pages.match(/\d+/)[0], def: { term: 'مصطلح تجريبي جديد', fam: 'تجربة' }, parts: ['قطعة أولى', 'قطعة ثانية', 'قطعة ثالثة'] });
    must(xMerge(ch).status === 0, 'merge failed');
    const ch2 = xLoad(xData('c2')), after = defBlocks(ch2).filter(({ b }) => b.def.term !== 'مصطلح تجريبي جديد').map(({ b }) => [b.def.term, b.def.card]);
    must(JSON.stringify(after) === JSON.stringify(before), 'an existing card id changed');
    const added = defBlocks(ch2).find(({ b }) => b.def.term === 'مصطلح تجريبي جديد').b.def.card;
    must(!before.some((x) => x[1] === added), 'the new card reused an id');
    must(sbx('make-defs.js', [X.code]).status === 0, 'make-defs failed');
    const idsAfter = JSON.parse(read(path.join(SBX, 'law900', 'data', 'defs-ids.json')));
    Object.keys(idsBefore).forEach((k) => must(idsAfter[k] === idsBefore[k], 'a definition id changed: ' + k));
    must(Object.keys(idsAfter).length === Object.keys(idsBefore).length + 1, 'expected one new id');
    return 'new card ' + added + ', new id ' + idsAfter['card:' + added];
  });
  test('new format: a removed definition takes its card away, and the id is never reused', () => {
    const ch = xLoad(xData('c2')), hit = defBlocks(ch).find(({ b }) => b.def.term === 'مصطلح تجريبي جديد'), gone = hit.b.def.card;
    hit.l.summary = hit.l.summary.filter((b) => b !== hit.b);
    const r = xMerge(ch); must(r.status === 0 && r.out.includes('-' + gone), r.out.slice(-200));
    const ch2 = xLoad(xData('c2')), l2 = ch2.lessons.find((l) => l.id === hit.l.id);
    must(!l2.cards.some((k) => k.id === gone) && (l2.retired || []).includes(gone), 'card not retired');
    l2.summary.push({ t: 'q', pg: l2.pages.match(/\d+/)[0], def: { term: 'مصطلح تجريبي آخر' }, parts: ['نص أول', 'نص ثانٍ'] });
    must(xMerge(ch2).status === 0, 'merge failed');
    const again = defBlocks(xLoad(xData('c2'))).find(({ b }) => b.def.term === 'مصطلح تجريبي آخر').b.def.card;
    must(again !== gone, 'the retired id ' + gone + ' was reused');
    must(sbx('validate.js', [X.code, xData('c2')]).status === 0, 'no longer validates');
    return gone + ' retired, next card ' + again;
  });
  test('new format: the definitions box is reported stale until make-defs runs again', () => {
    const c = sbx('defs-check.js', [X.code]); must(c.status === 1 && /not up to date/.test(c.out), 'staleness not reported');
    must(sbx('make-defs.js', [X.code]).status === 0 && sbx('defs-check.js', [X.code]).status === 0, 'still failing after make-defs');
    must(sbx('make-lessons.js', [X.code]).status === 0, 'make-lessons failed');
    const g = sbx('gate.js', [X.code, '--no-browser']); must(g.status === 0 && /RESULT: PASSED/.test(g.out), g.out.slice(-400));
  });
  test('new format: every way of writing a definition twice or wrongly is refused', () => {
    const base = () => xLoad(xData('c2'));
    const expectErr = (label, mutate, re) => { const ch = base(); mutate(ch); const r = xValidate(ch); must(r.status === 1 && re.test(r.out), label + ': not refused'); };
    const first = (ch) => defBlocks(ch)[0];
    expectErr('hand-written verbatim card', (ch) => { const { l, b } = first(ch); l.cards.push({ id: l.id + 'k999', type: 'def', front: 'x', back: b.parts.join(' '), bk: true, pg: b.pg }); }, /derived, not written/);
    expectErr('x differs', (ch) => { first(ch).b.x += ' زيادة'; }, /x differs from pre \+ parts \+ post/);
    expectErr('hide not in text', (ch) => { first(ch).b.def.hide = ['ليست في النص']; }, /is not in the definition text/);
    expectErr('part with edge space', (ch) => { const b = first(ch).b; b.parts[0] = b.parts[0] + ' '; }, /space at an edge/);
    expectErr('stale derived card', (ch) => { const b = first(ch).b; b.parts[0] = 'كلمة ' + b.parts[0]; delete b.x; }, /out of date with its definition/);
    expectErr('chapter-level defs', (ch) => { ch.defs = [{ term: 'x', pg: '127', parts: ['a', 'b'] }]; }, /defs\[\] is not used for this subject/);
    expectErr('one piece only', (ch) => { first(ch).b.parts = ['قطعة واحدة']; }, /a definition needs parts/);
    expectErr('orphan derived card', (ch) => { const { l } = first(ch); l.cards.push({ id: l.id + 'k998', type: 'def', front: 'x', back: 'y', bk: true, pg: l.pages.match(/\d+/)[0], auto: true }); }, /has no definition in the summary/);
    return '8 cases';
  });
  test('new format: the simplified opener is checked, shown to reviewers, and required by default', () => {
    const ch = xLoad(xData('c2')), l = ch.lessons[0];
    l.intro = ['جملة أولى.', 'جملة ثانية.']; must(/intro must hold 3–5 sentences/.test(xValidate(ch).out), 'two sentences accepted');
    l.intro = ['جملة أولى.', 'جملة ثانية.', 'جملة ثالثة.']; must(xValidate(ch).status === 0, 'three sentences refused');
    must(xMerge(ch).status === 0 && xLoad(xData('c2')).lessons[0].intro.length === 3, 'intro lost by merge');
    const txt = path.join(TMP, 'x.md'); fs.writeFileSync(txt, '=== ص 127 ===\nنص\n');
    must(/التمهيد المبسّط[\s\S]*l6\.i1 جملة أولى\./.test(sbx('review-copy.js', [X.code, xData('c2')]).out), 'review copy lacks the opener');
    must(sbx('show.js', [X.code, xData('c2'), 'l6.i2']).out.includes('جملة ثانية.'), 'show cannot print it');
    const strict = path.join(TMP, 'strict.json'); fs.writeFileSync(strict, JSON.stringify({ code: 'law900', name: 'x' }));
    const part = path.join(TMP, 'v2.js'); asPart(xLoad(xData('c2')), part);
    must(/intro\[\] missing/.test(tool('validate.js', [strict, part], ENV).out), 'a missing opener is not an error by default');
  });
  test('new format: a pending lesson passes with its outline only, and is refused once it holds content', () => {
    const ch = xLoad(xData('c2'));
    ch.lessons.push({ id: 'l99', title: 'درس معلّق', pages: '150–152', minutes: 20, pending: true });
    must(xValidate(ch).status === 0 && /l99 150–152 20min: PENDING/.test(xValidate(ch).out), 'pending lesson refused');
    ch.lessons[ch.lessons.length - 1].summary = [{ t: 'p', x: 'نص', pg: '150' }];
    must(/a pending lesson has content/.test(xValidate(ch).out), 'content in a pending lesson accepted');
  });
  test('new format: apply edits one item and leaves the rest and the derived cards as they were', () => {
    const before = xLoad(xData('c2')), q = before.lessons[0].objective[0];
    const patch = path.join(TMP, 'patch.js'); fs.writeFileSync(patch, 'module.exports = (ch, H) => { H.find(' + JSON.stringify(q.id) + ').q += " (مصحَّح)"; };\n');
    must(sbx('apply.js', [X.code, xData('c2'), patch]).status === 0, 'apply failed');
    const after = xLoad(xData('c2'));
    must(after.lessons[0].objective[0].q === q.q + ' (مصحَّح)', 'edit not applied');
    after.lessons[0].objective[0].q = q.q; must(JSON.stringify(after) === JSON.stringify(before), 'something else changed');
  });
  test('new format: renumbering lessons carries the card links and step ids along', () => {
    const ch = xLoad(xData('c2')); ch.lessons[0].steps = [{ id: ch.lessons[0].id + 's1', title: 'خطوات', items: ['أ', 'ب', 'ج'], pg: '127' }];
    const part = path.join(TMP, 'rn.js'); asPart(ch, part);
    const o = path.join(TMP, 'rn-out.js'); const r = sbx('merge.js', [X.code, o, ch.id, ch.title, ch.name, ch.pages, part, '--start', '50']);
    must(r.status === 0 && /renumbered/.test(r.out), r.out.slice(-200));
    const v = sbx('validate.js', [X.code, o, '--range', '50-' + (49 + ch.lessons.length)]); must(v.status === 0, v.out.slice(-400));
    const out = xLoad(o); must(out.lessons[0].id === 'l50' && out.lessons[0].steps[0].id === 'l50s1' && defBlocks(out).every(({ l, b }) => b.def.card.startsWith(l.id + 'k')), 'links not renumbered');
  });
  test('new format: an unbuilt chapter is written from the plan as pending lessons, and built lessons are never overwritten', () => {
    const planF = path.join(SBX, '_tools', 'law900', 'plan.json');
    fs.writeFileSync(planF, JSON.stringify({ v: 2, code: 'law900', lessons: [
      { id: 'l80', ch: 'c9', title: 'درس أول', p1: 140, p2: 144, minutes: 30 }, { id: 'l81', ch: 'c9', title: 'درس ثانٍ', p1: 145, p2: 145, minutes: 20 }, { id: 'l82', ch: 'c9', title: 'بلا دقائق', p1: 146, p2: 150 }], batches: [] }));
    let r = sbx('make-skeleton.js', [X.code, 'c9', 'فصل معلّق', 'اسم الفصل المعلّق']); must(r.status === 1 && /needs minutes/.test(r.out), 'a lesson without minutes was accepted');
    r = sbx('make-skeleton.js', [X.code, 'c9', 'فصل معلّق', 'اسم الفصل المعلّق', '--only', '80-81']); must(r.status === 0 && /skeleton -> .*lessons l80,l81/.test(r.out), r.out);
    const ch = xLoad(xData('c9')); must(ch.pages === '140–150' && ch.lessons.length === 2 && ch.lessons[1].pages === '145' && ch.lessons.every((l) => l.pending === true), 'wrong skeleton');
    const v = sbx('validate.js', [X.code, xData('c9')]); must(v.status === 0 && (v.out.match(/PENDING/g) || []).length === 2, v.out.slice(-300));
    r = sbx('make-skeleton.js', [X.code, 'c9', 'فصل معلّق', 'اسم الفصل المعلّق', '--only', '80-80']); must(r.status === 0, 'a file of pending lessons only must be rewritable');
    fs.writeFileSync(planF, JSON.stringify({ v: 2, code: 'law900', lessons: [{ id: 'l6', ch: 'c2', title: 'x', p1: 127, p2: 130, minutes: 10 }], batches: [] }));
    r = sbx('make-skeleton.js', [X.code, 'c2', 'x', 'y']); must(r.status === 1 && /already holds built lessons/.test(r.out), 'a built chapter file was overwritten');
    fs.rmSync(xData('c9')); fs.rmSync(planF);
  });
  test('gate --publish: uploads only the changed files of the subject, with the description and its trailers, and never when a check fails', () => {
    const g = (args, cwd) => run('git', args, { cwd: cwd || SBX });
    const bare = path.join(TMP, 'remote.git');
    must(g(['init', '-q', '--bare', '-b', 'main', bare], TMP).status === 0, 'cannot create a test remote');
    g(['init', '-q', '-b', 'main']); g(['config', 'user.email', 't@example.com']); g(['config', 'user.name', 'T']); g(['config', 'commit.gpgsign', 'false']); g(['remote', 'add', 'origin', bare]);
    fs.writeFileSync(path.join(SBX, 'README.md'), 'x\n'); g(['add', 'README.md']); g(['commit', '-q', '-m', 'init']);
    must(g(['push', '-q', 'origin', 'main']).status === 0, 'cannot push to the test remote');
    fs.writeFileSync(path.join(SBX, 'stray.txt'), 'outside the subject folders\n');
    const pub = (msg, more) => sbx('gate.js', [X.code, '--no-browser', '--publish', msg].concat(more || []));
    let r = pub('english only'); must(r.status === 1 && /one-line Arabic description/.test(r.out), 'a non-Arabic description was accepted');
    r = pub('إضافة دفعة تجريبية', ['--trailer', 'Co-Authored-By: Tester <t@example.com>']);
    must(r.status === 0 && /publish\s+OK/.test(r.out) && /1 other changed file\(s\) left out/.test(r.out), r.out);
    must(g(['log', '-1', '--format=%B', 'main'], bare).out.trim() === 'إضافة دفعة تجريبية\n\nCo-Authored-By: Tester <t@example.com>', 'wrong commit message');
    const files = g(['show', '--name-only', '--format=', 'main'], bare).out.trim().split('\n');
    must(files.includes('law900/data/c2.js') && files.includes('law900/lessons.json') && files.every((f) => f.startsWith('law900/') || f.startsWith('_tools/law900/')), 'wrong files: ' + files.join(','));
    r = pub('لا شيء'); must(r.status === 1 && /nothing to publish/.test(r.out), 'published with nothing changed');
    /* المستودع تقدّم برفع آخر: يُلحق به ثم يُرفع */
    const other = path.join(TMP, 'other'); g(['clone', '-q', bare, other], TMP);
    fs.writeFileSync(path.join(other, 'else.txt'), 'y\n'); g(['add', 'else.txt'], other); g(['-c', 'user.email=o@example.com', '-c', 'user.name=O', 'commit', '-q', '-m', 'another upload'], other); g(['push', '-q', 'origin', 'main'], other);
    const ch = xLoad(xData('c2')), q = ch.lessons[0].objective[1];
    const patch = path.join(TMP, 'p2.js'); fs.writeFileSync(patch, 'module.exports = (ch, H) => { H.find(' + JSON.stringify(q.id) + ').why += " (موضَّح)"; };\n');
    must(sbx('apply.js', [X.code, xData('c2'), patch]).status === 0, 'apply failed');
    r = pub('تصحيح تعليل سؤال'); must(r.status === 0 && /pushed 1 file\(s\)/.test(r.out), r.out.slice(-400));
    must(g(['log', '--format=%s', 'main'], bare).out.trim().split('\n').slice(0, 2).join(' < ') === 'تصحيح تعليل سؤال < another upload', 'not rebased onto the newer upload');
    /* فحص فاشل: لا رفع */
    const broken = xLoad(xData('c2')); broken.lessons[0].objective[0].a = 'x';
    asPart(broken, xData('c2'));
    r = pub('رفع مع خطأ'); must(r.status === 1 && /not published: a check failed/.test(r.out), 'published although a check failed');
    must(g(['log', '-1', '--format=%s', 'main'], bare).out.trim() === 'تصحيح تعليل سؤال', 'the remote moved although a check failed');
    return 'two uploads, three refusals';
  });
}

/* ======================= 3) التنبيهات الثلاثة، وحال الدفعات، وملف الإعدادات ======================= */
test('notes: similar questions are found (the same fact as true/false and as fill-in; a repeated question across lessons)', () => {
  const mk = (id, lesson, q) => ({ id, lesson, text: notes.factText(q), own: true });
  const items = [
    mk('l1o1', 'l1', { k: 'tf', q: 'تشترط المادة الخامسة لدخول الاتفاقية حيز النفاذ تصديق خمس وثلاثين دولة عليها.' }),
    mk('l1o2', 'l1', { k: 'fill', q: 'تشترط المادة الخامسة لدخول الاتفاقية حيز النفاذ تصديق (____) دولة عليها.', a: 'خمس وثلاثين' }),
    mk('l2o1', 'l2', { k: 'tf', q: 'تشترط المادة الخامسة لدخول الاتفاقية حيز النفاذ تصديق خمس وثلاثين دولة عليها.' }),
    mk('l3o1', 'l3', { k: 'tf', q: 'تؤلف جميع دوائر محاكم الاستئناف من ثلاثة قضاة دون استثناء.' }),
    mk('l4o1', 'l4', { k: 'tf', q: 'تتألف جميع دوائر محاكم ديوان المظالم من ثلاثة قضاة دون استثناء.' }),
    mk('l5o1', 'l5', { k: 'tf', q: 'العرف الدولي مصدر من مصادر القانون الدولي العام.' })
  ];
  const r = notes.similar(items, 0.8), has = (a, b) => r.pairs.some((p) => (p.a.id === a && p.b.id === b) || (p.a.id === b && p.b.id === a));
  must(has('l1o1', 'l1o2') && has('l1o1', 'l2o1'), 'a real duplicate was missed');
  must(!has('l3o1', 'l4o1') && !r.pairs.some((p) => p.a.id === 'l5o1' || p.b.id === 'l5o1'), 'two different facts with parallel wording were flagged');
  const A = { k: 'tf', q: 'يرى أنصار الوحدة مع علو القانون الداخلي أن القانون الدولي يستمد وجوده من القانون الداخلي وحده.' };
  const B = { k: 'tf', q: 'يرى أنصار الوحدة مع علو القانون الداخلي أن القانون الدولي يستمد وجوده من القانون الداخلي ويعد جزءاً منه.' };
  const same = notes.similar([mk('a', 'l1', A), mk('b', 'l1', B)], 0.8), cross = notes.similar([mk('a', 'l1', A), mk('b', 'l2', B)], 0.8);
  must(same.pairs.length === 1 && same.pairs[0].same && same.pairs[0].s < 0.8, 'one fact asked twice in a lesson was missed');
  must(cross.pairs.length === 0, 'the looser limit must apply inside one lesson only');
  return r.pairs.length + ' pairs';
});
test('notes: a correct option that stands out by length is reported, one by one and as a share', () => {
  const q = (id, opts, a) => ({ id, k: 'mcq', q: 'س', opts, a });
  const long = 'جواب طويل جداً يتميز عن سائر الخيارات بطوله الظاهر', s = ['قصير', 'قصير ب', 'قصير ج'];
  const ch = { lessons: [{ id: 'l1', objective: [] }] };
  for (let i = 0; i < 6; i++) ch.lessons[0].objective.push(q('l1o' + i, [long].concat(s), 0));
  for (let i = 6; i < 10; i++) ch.lessons[0].objective.push(q('l1o' + i, ['خيار أول', 'خيار ثانٍ', 'خيار ثالث', 'خيار رابع طويل'], 0));
  const r = notes.longest([ch], 0.4);
  must(r.clear.length === 6 && r.n === 10 && r.any === 6 && r.lines.length === 2 && /60%/.test(r.lines[1]), JSON.stringify([r.clear.length, r.n, r.any, r.lines.length]));
  must(notes.longest([ch], 0.7).lines.length === 1, 'the share line must respect the threshold');
});
test('notes: a repeated definition is reported (same term twice; one text under two terms)', () => {
  const r = notes.dupDefs([
    { term: 'المعاهدة الدولية', text: 'اتفاق دولي يبرم كتابة بين دول ويحكمه القانون الدولي', where: 'l1' },
    { term: 'المعاهدة الدوليّة', text: 'اتفاق مكتوب بين شخصين من أشخاص القانون الدولي', where: 'l4' },
    { term: 'الاتفاقية', text: 'اتفاق دولى يبرم كتابة بين دول ويحكمه القانون الدولى', where: 'l5' },
    { term: 'العرف', text: 'عادة عامة مقبولة بمثابة قانون تتبعها الدول في علاقاتها', where: 'l9' }
  ]);
  must(r.lines.some((l) => /term repeated/.test(l) && /l1, l4/.test(l)), 'repeated term missed');
  must(r.lines.some((l) => /nearly the same text/.test(l)), 'same text under two terms missed');
  must(r.lines.length === 2, 'a distinct definition was flagged');
});
LEGACY.forEach((code) => test(code + ': the three notes run on the published bank', () => {
  const S = lib.loadSubject(code), site = lib.loadSite(S, ['defs.js']), items = notes.questionsOf(site.chapters, true);
  const sim = notes.similar(items, 0.8), lon = notes.longest(site.chapters, 0.4);
  must(items.length > 100 && lon.n > 10, 'bank not read');
  return items.length + ' questions: ' + sim.pairs.length + ' similar pair(s), correct option longest in ' + Math.round(100 * lon.any / lon.n) + '% of ' + lon.n + ' mcq';
}));
test('status: batches, their state and the usage before and after are recorded and summed', () => {
  const root = path.join(TMP, 'st'); fs.mkdirSync(path.join(root, '_tools', 'law901'), { recursive: true });
  fs.writeFileSync(path.join(root, '_tools', 'law901', 'subject.json'), JSON.stringify({ code: 'law901', name: 'مادة' }));
  const st = (a) => tool('status.js', ['law901'].concat(a), { TERM_ROOT: root });
  must(st(['add', 'content', '1-5', 'c1', 'أول دفعة']).status === 0 && st(['add', 'content', '6-9', 'c2']).status === 0 && st(['add', 'copy', '21-52']).status === 1, 'add failed, or a copying batch was accepted');
  must(st(['set', '1', 'published']).status === 0 && st(['usage', '1', 'before', '12']).status === 0 && st(['usage', '1', 'after', '31']).status === 0, 'set/usage failed');
  must(st(['set', '2', 'built']).status === 0 && st(['usage', '2', 'before', '31']).status === 0, 'second batch failed');
  must(st(['set', '2', 'done']).status === 1 && st(['usage', '2', 'after', '140']).status === 1 && st(['set', '9', 'built']).status === 1, 'a wrong state, percentage or batch was accepted');
  const o = st([]).out;
  must(/1 \| محتوى \| l1–l5 \(c1\) \| نُشرت \| الاستخدام 12% ← 31% \| الكلفة \+19/.test(o) && /2 \| محتوى \| l6–l9 \(c2\) \| بُنيت \| الاستخدام 31% ← —/.test(o) && /المجموع المسجَّل: \+19/.test(o), o);
  const plan = JSON.parse(read(path.join(root, '_tools', 'law901', 'plan.json'))); must(plan.v === 2 && plan.batches.length === 2 && plan.batches[0].log.length === 2, 'plan file shape');
  if (LEGACY.includes('law135')) { must(/خطة قديمة/.test(tool('status.js', ['law135']).out), 'old plan not read'); const r = tool('status.js', ['law135', 'add', 'content', '1-2', 'c1']); must(r.status === 1 && /old lessons-only plan/.test(r.out), 'an old plan was modified'); }
});
test('settings: the example file loads, and a mistyped or wrong setting is refused', () => {
  const S = lib.loadSubject(path.join(T, 'subject.example.json'));
  must(S.global === 'LAW000' && S.checks.defs === 'summary' && S.checks.intro === 'require' && S.checks.map === 'off' && S.checks.tfReason === false && S.checks.mix.tfMinShare === 0, 'defaults changed');
  const bad = (o) => { const f = path.join(TMP, 'bad.json'); fs.writeFileSync(f, JSON.stringify(o)); return tool('validate.js', [f, 'x.js']); };
  must(/unknown setting/.test(bad({ code: 'law1', name: 'x', checks: { mixx: {} } }).out), 'mistyped key accepted');
  must(/checks\.defs must be one of/.test(bad({ code: 'law1', name: 'x', checks: { defs: 'sumary' } }).out), 'wrong value accepted');
  must(/checks\.map must be one of/.test(bad({ code: 'law1', name: 'x', checks: { map: true } }).out), 'a wrong value for the mind map setting was accepted');
  must(/code must look like/.test(bad({ code: 'Law 1', name: 'x' }).out), 'bad code accepted');
});

/* ======================= 5) القراءات الآلية: مقابلة المنقول وفحص المصوَّر والقصاصات وتجهيز الصفحات ======================= */
const COPY = path.join(TMP, 'copy');
fs.mkdirSync(COPY, { recursive: true });
const subjFile = (name, over) => { const f = path.join(COPY, name + '.json'); fs.writeFileSync(f, JSON.stringify(Object.assign({ code: 'law901', name: 'مادة تجريبية', book: { title: 'ك', author: 'م', pdfOffset: 9 } }, over || {}))); return f; };
/* قراءة آلية مصنوعة: سطور من كلمات، لكل كلمة موضع في صورة الصفحة. k: نسبة دقة القراءة إلى الدقة الأساس */
function fakeTsv(lines, k) {
  const rows = ['level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext', ['1', 1, 0, 0, 0, 0, 0, 0, Math.round(2480 * k), Math.round(3508 * k), -1, ''].join('\t')];
  lines.forEach((ln, i) => { let x = 2100; ln.split(' ').forEach((w, n) => { const wd = 34 * w.length; x -= wd + 30; rows.push(['5', 1, 1, 1, i + 1, n + 1, Math.round(x * k), Math.round((400 + 110 * i) * k), Math.round(wd * k), Math.round(52 * k), 95, w].join('\t')); }); });
  return rows.join('\n') + '\n';
}
const READ_A = ['هذا نص المتن الأول فى الصفحة عليهاء ولايجوز غبن أحد فى النقد', 'وقد رأى الشاهد غبن الحقيقة ثم أنه لايجوز الطعن لا غير', 'الكلمة مطصوة هنا ثم تماما', 'ويبقى الحكم لحكمة النقد', 'وقال إنه لا يصح البيع', '1 انظر قفقف 351 المرجع السايق'];
const READ_B = ['هذا نص المتن الاول فى الصفحة عليها ولا يجوز غبن احد فى النقد', 'وقد رأى الشاهد عين الحقيقة ثم أنه لايجوز الطعن لا غير', 'الكلمة مطموسه هنا ثم تماما', 'ويبقى الحكم لحكمة النقطص', 'وقال إنه لا يصح البيع', '1 انظر فففف المرجع السابق'];
const TWO = { readings: [{ name: 'a', dpi: 300, args: '-l ara --psm 3' }, { name: 'b', dpi: 200, args: '-l ara --psm 3' }] };
const CW = path.join(COPY, 'work'), CSUB = subjFile('law901', { scan: TWO });
fs.mkdirSync(CW, { recursive: true });
fs.writeFileSync(path.join(CW, 'p10.a.tsv'), fakeTsv(READ_A, 1)); fs.writeFileSync(path.join(CW, 'p10.b.tsv'), fakeTsv(READ_B, 200 / 300));
/* صفحتان يعبر بينهما نص: آخر الأولى وأول الثانية */
['a', 'b'].forEach((r) => { const k = r === 'a' ? 1 : 200 / 300;
  fs.writeFileSync(path.join(CW, 'p20.' + r + '.tsv'), fakeTsv(['هذا سطر أول من الصفحة العشرين وفيه كلام', 'ويشترط لصحة العقد'], k));
  fs.writeFileSync(path.join(CW, 'p21.' + r + '.tsv'), fakeTsv(['ثلاثة شروط الرضا والمحل والسبب', 'ثم كلام آخر بعدها'], k)); });
const QS = lib.loadSubject(CSUB), quote = (pg, text) => ocr.checkQuote(QS, CW, pg, text), kinds = (r) => r.flags.map((f) => f.kind + ':' + f.w).join(' ');
test('quote check: a copied text is located on its page, and what a machine reading read otherwise is flagged (dots, a glued particle, a dropped word, an added word)', () => {
  let r = quote('10', 'وقد رأى الشاهد');
  must(r.found && r.sure && r.pieces.length === 1 && r.pieces[0].page === 10 && r.pieces[0].box.w > 100, 'a text both readings confirm: ' + JSON.stringify(r));
  r = quote('10', 'رأى الشاهد عين الحقيقة');
  must(r.found && !r.sure && kinds(r) === 'dots:عين' && /a «غبن» · b «عين»/.test(r.flags[0].read) && r.pieces[0].marks.length === 1, 'dots: ' + kinds(r));
  must(r.flags[0].strong === true && ocr.checkQuote(QS, CW, '10', 'رأى الشاهد عين الحقيقة', new Set(['عين'])).flags[0].strong === false && ocr.checkQuote(QS, CW, '10', 'رأى الشاهد عين الحقيقة', new Set(['عين', 'غبن'])).flags[0].strong === true, 'a misreading counts for the builder only when it is another real word');
  r = quote('10', 'ثم أنه يجوز الطعن');
  must(r.found && kinds(r) === 'glue:يجوز' && r.flags[0].extra.join() === 'لا' && /قُرئت ملتصقة بـ«لا»/.test(ocr.say(r.flags[0])), 'a particle the copier dropped: ' + kinds(r));
  r = quote('10', 'هذا نص المتن فى الصفحة');
  must(r.found && kinds(r) === 'extra:الأول' && r.flags[0].after === 'المتن', 'a word the copier dropped: ' + kinds(r));
  r = quote('10', 'الكلمة مطموسة هنا ثم زائدة تماما');
  must(r.found && kinds(r) === 'dots:مطموسة unread:زائدة', 'a word the copier added: ' + kinds(r));
});
test('quote check: an ellipsis splits the text, a text crossing to the next page gets a crop on each, and a text or page that is not there is reported', () => {
  let r = quote('10', 'هذا نص المتن (...) فى النقد');
  must(r.found && r.sure && r.pieces.length === 2, 'ellipsis: ' + JSON.stringify(r.flags));
  r = quote('20–21', 'ويشترط لصحة العقد ثلاثة شروط الرضا والمحل والسبب');
  must(r.found && r.sure && r.pieces.map((p) => p.page).join() === '20,21', 'crossing pages: ' + JSON.stringify(r));
  r = quote('10', 'كلام ليس فى الصفحة أصلا ولا يشبهها');
  must(!r.found && /not found on page 10/.test(r.why) && !r.unready, 'a text that is not on the page');
  r = quote('14–15', 'صفحة بلا قراءة');
  must(!r.found && r.unready.join() === '14,15', 'a page that was not prepared');
  const ex = path.join(T, 'subject.example.json'), sample = path.join(T, 'sample.js'), empty = path.join(COPY, 'empty'); fs.mkdirSync(empty);
  const v = tool('validate.js', [ex, sample, '--pages', CW]);
  must(v.status === 0 && /verbatim text not located in the machine readings of page \d+/.test(v.out), 'the checker did not match the verbatim texts: ' + v.out.slice(-400));
  must(/verbatim texts were not matched on page\(s\) not prepared in the work dir: \d+/.test(tool('validate.js', [ex, sample, '--pages', empty]).out), 'unprepared pages were not reported');
  must(tool('validate.js', [ex, sample, '--pages', path.join(COPY, 'nowhere')]).status === 2, 'a missing work dir was accepted');
});
test('scan check: a missing page, a repeated page, a faint page, a cropped page and a blank page are reported, and a clean scan passes', () => {
  const sw = path.join(COPY, 'scan'); fs.mkdirSync(sw);
  const AB = 'بتثجحخدذرزسشصضطظعغفقكلمنهوي', word = (i, len) => Array.from({ length: len }, (_, j) => AB[(i * (2 * j + 3) + 5 * j + i % 7) % AB.length]).join('');
  const body = (n, len, per) => [0, 1, 2].map((j) => Array.from({ length: per }, (_, i) => word(n * 37 + j * per + i, len)).join(' '));
  const page = (n, lines, printed, conf) => ['a', 'b'].forEach((r) => {
    const all = lines.concat(Array.from({ length: 26 - lines.length }, () => ''), printed === null ? [] : [String(printed)]);
    fs.writeFileSync(path.join(sw, 'p' + n + '.' + r + '.tsv'), fakeTsv(all, r === 'a' ? 1 : 200 / 300).replace(/\t95\t/g, '\t' + (conf || 95) + '\t'));
  });
  for (let n = 30; n <= 41; n++) page(n, n === 33 ? body(32, 4, 8) : n === 35 ? body(n, 5, 12) : body(n, 4, 8), n >= 36 ? n + 1 : n, n === 34 ? 40 : 95);
  page(42, [], null);
  const r = tool('scan.js', [CSUB, sw, '--pages', '30-44']);
  must(r.status === 0 && /scan check: 13 page\(s\) read, 2 not prepared · blank 1 · weak 1 · cropped 1 · duplicate pairs 1/.test(r.out), r.out);
  must(/SHIFT from p36: the printed page number is the file name \+1 on 6 page\(s\) up to p41 -> a page is missing from the scan at p36/.test(r.out), 'missing page: ' + r.out);
  must(/DUPLICATE p32 = p33 \(100% of the words\)/.test(r.out) && /WEAK p34 \(reading confidence 40, book median 95\)/.test(r.out) && /CROPPED p35 \(left edge, 3 lines\)/.test(r.out), r.out);
  must(/BLANK p42 /.test(r.out) && /NOT RUN p43–p44/.test(r.out) && /RESULT: 4 thing\(s\) to look at before building/.test(r.out), r.out);
  const ok = tool('scan.js', [CSUB, sw, '--pages', '30-31']);
  must(ok.status === 0 && /RESULT: nothing to look at$/m.test(ok.out), 'a clean scan: ' + ok.out);
  must(tool('scan.js', [CSUB, path.join(COPY, 'empty')]).status === 3, 'an empty work dir was not reported as not run');
});
test('settings: three readings on different images are the default, and a wrong reading is refused', () => {
  const D = lib.loadSubject(path.join(T, 'subject.example.json')).scan;
  must(D.dpi === 300 && D.zoom === 600 && D.readings.length === 3 && D.readings[0].args === '-l ara --psm 3' && new Set(D.readings.map((r) => r.dpi + ' ' + r.args)).size === 3, 'defaults changed: ' + JSON.stringify(D));
  must(lib.loadSubject(CSUB).scan.readings.length === 2 && /ara\+fra/.test(lib.loadSubject('law135').scan.readings[2].args), 'a subject could not set its own readings');
  const bad = (scan) => tool('validate.js', [subjFile('bad', { scan }), 'x.js']).out;
  must(/at least two readings/.test(bad({ readings: [{ name: 'a', dpi: 300, args: '-l ara' }] })), 'one reading accepted');
  must(/scan\.readings\[1\] must be/.test(bad({ readings: [{ name: 'a', dpi: 300, args: '-l ara' }, { name: 'b', dpi: 'x', args: '-l ara' }] })), 'bad dpi accepted');
  must(/used twice/.test(bad({ readings: [{ name: 'a', dpi: 300, args: '-l ara' }, { name: 'a', dpi: 200, args: '-l ara' }] })), 'repeated name accepted');
});
const pngSize = (f) => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const PY = (code, args) => run('python3', ['-I', '-c', code].concat(args || []));
const hasPil = PY('import PIL').status === 0;
const hasPoppler = run('pdftoppm', ['-v']).status !== null;
/* صورة صفحة مصنوعة وملف مصوَّر منها: مستطيل أسود في موضع كل كلمة */
if (hasPil) {
  const boxes = fakeTsv(READ_A, 1).split('\n').filter((l) => l.startsWith('5\t')).map((l) => l.split('\t').slice(6, 10).map(Number));
  fs.writeFileSync(path.join(COPY, 'boxes.json'), JSON.stringify(boxes));
  const mk = PY('import sys,json\nfrom PIL import Image,ImageDraw\nim=Image.new("L",(2480,3508),255)\nd=ImageDraw.Draw(im)\nfor x,y,w,h in json.load(open(sys.argv[1])): d.rectangle([x,y,x+w,y+h],fill=0)\nim.save(sys.argv[2]); im.save(sys.argv[3],resolution=300.0)', [path.join(COPY, 'boxes.json'), path.join(CW, 'p10.png'), path.join(COPY, 'book.pdf')]);
  if (mk.status !== 0) throw new Error('could not draw the test page: ' + mk.out);
}
if (!hasPil) skip('crops', 'the Python imaging library (Pillow) is not installed');
else test('crops: every copied text is cut from its page at full resolution into sheets no reader has to shrink, with what the machine readings flagged', () => {
  const out = path.join(COPY, 'crops');
  const lf = path.join(COPY, 'list.txt'); fs.writeFileSync(lf, '# نصوص منقولة\n10 | رأى الشاهد عين الحقيقة\nk7 | 10 | ويبقى الحكم\n10 | ثم أنه يجوز الطعن\n10 | كلام ليس فى الصفحة أصلا ولا يشبهها\n14 | صفحة بلا صورة\n');
  const r = tool('crops.js', [CSUB, CW, out, '--list', lf]);
  must(r.status === 0 && /crops: 3 spot\(s\) in 1 sheet\(s\), 1100 px wide.* flagged by the machine readings 2 · skipped 2/.test(r.out) && /SKIPPED q5 \(not found on page 10/.test(r.out) && /SKIPPED q6 \(page 14 has no image/.test(r.out), r.out);
  const [w, h] = pngSize(path.join(out, 'sheet-001.png'));
  must(w === 1100 && h > 200 && w * h <= 1150000, 'sheet size ' + w + 'x' + h);
  const idx = read(path.join(out, 'index.md')), known = JSON.parse(read(path.join(out, 'crops.json')));
  must(known.k7 && known.q2.sheets[0] === 'sheet-001.png' && known.q2.marks.length === 1 && known.k7.marks.length === 0, 'an id is missing, or a flagged word is not underlined');
  must(/- q2 · ص 10 · «رأى الشاهد عين الحقيقة» — انتبه: «عين» بنقاط أو همزات أخرى في قراءة \(a «غبن» · b «عين»\)/.test(idx) && /- q4 · .*قُرئت ملتصقة بـ«لا» وليست في المنقول/.test(idx) && /- k7 · ص 10 · «ويبقى الحكم»$/m.test(idx), 'the index does not say what the readings flagged');
  must(read(path.join(out, 'verdicts.template.tsv')).trim().split('\n').length === 4, 'verdict sheet');
  must(tool('crops.js', [CSUB, CW, path.join(REPO, '_crops_test'), '--list', lf]).status === 2 && !fs.existsSync(path.join(REPO, '_crops_test')), 'crops were written inside the repository');
  must(tool('crops.js', [CSUB, CW, out]).status === 2, 'crops ran with nothing to cut');
  if (!hasPoppler) return '3 spots in one sheet ' + w + 'x' + h + ' (zoom NOT RUN: pdftoppm missing)';
  const z = tool('crops.js', [CSUB, CW, out, '--zoom', path.join(COPY, 'book.pdf'), 'q2']);
  const zf = path.join(out, 'zoom-q2.png');
  must(z.status === 0 && fs.existsSync(zf), z.out);
  const [zw, zh] = pngSize(zf);
  must(zw <= 1560 && zw >= 600 && zh > 150 && !fs.readdirSync(out).some((f) => f.startsWith('.zoom')), 'zoomed crop ' + zw + 'x' + zh);
  return '3 spots in one sheet ' + w + 'x' + h + ', one zoomed alone ' + zw + 'x' + zh;
});
const langs = run('tesseract', ['--list-langs']);
if (!hasPil || !hasPoppler || langs.status === null || !/^eng$/m.test(langs.out)) skip('page preparation', 'needs pdftoppm, tesseract with eng, and Pillow');
else test('page preparation: pages are drawn by their book numbers and read with both settings, a rerun does nothing, a line is located in the readings, and the pages are also written as one pdf', () => {
  const pdf = path.join(COPY, 'latin.pdf'), work = path.join(COPY, 'work-latin');
  const mk = PY('import sys\nfrom PIL import Image,ImageDraw,ImageFont\ndef page(lines):\n    try:\n        f=ImageFont.load_default(size=44); im=Image.new("L",(1240,1754),255); d=ImageDraw.Draw(im)\n        for i,t in enumerate(lines): d.text((120,200+110*i),t,fill=0,font=f)\n        return im\n    except TypeError:\n        im=Image.new("L",(310,438),255); d=ImageDraw.Draw(im)\n        for i,t in enumerate(lines): d.text((30,50+27*i),t,fill=0)\n        return im.resize((1240,1754))\na=page(["the first page of the test book","holds two short lines of words"]); b=page(["second page with other words","and nothing else on it today"])\na.save(sys.argv[1],save_all=True,append_images=[b],resolution=150.0)', [pdf]);
  must(mk.status === 0, mk.out);
  const sub = subjFile('latin', { scan: { dpi: 150, readings: [{ name: 'a', dpi: 150, args: '-l eng --psm 6' }, { name: 'b', dpi: 100, args: '-l eng --psm 6' }] } });
  const r = tool('pages.js', [sub, pdf, work, '--pages', '10-11']);
  must(r.status === 0 && /2 of 2 ready · rendered now 2 · read now a 2, b 2 · failed 0/.test(r.out), r.out);
  must(/\tfirst\n/.test(read(path.join(work, 'p10.a.tsv'))) && /\tsecond\n/.test(read(path.join(work, 'p11.b.tsv'))) && !fs.existsSync(path.join(work, 'p10.100.png')), 'the readings are not what the pages say');
  must(/2 of 2 ready · rendered now 0 · read now a 0, b 0/.test(tool('pages.js', [sub, pdf, work, '--pages', '10-11']).out), 'a rerun did the work again');
  must(/outside the scanned file/.test(tool('pages.js', [sub, pdf, work, '--pages', '10-12']).out), 'a page outside the file was accepted');
  must(/must be outside the repository/.test(tool('pages.js', [sub, pdf, path.join(REPO, '_pages_test'), '--pages', '10-10']).out), 'page images were written inside the repository');
  const q = ocr.checkQuote(lib.loadSubject(sub), work, '10', 'the first page of the test book');
  must(q.found && q.pieces[0].page === 10, 'a line of the page was not located in its readings: ' + JSON.stringify(q));
  const pf = path.join(work, 'صفحات الكتاب 10–11.pdf'), wp = tool('pages.js', [sub, pdf, work, '--pages', '10-11', '--pdf', '--txt']);
  must(/pdf of these pages: /.test(wp.out) && fs.existsSync(pf) && /^Pages:\s+2$/m.test(run('pdfinfo', [pf]).out), 'the pdf of the pages: ' + wp.out);
  must(/machine reading as text \(a\): 2 page\(s\)/.test(wp.out) && /^\[قراءة آلية للصفحة 10،.*\]\n.*first/.test(read(path.join(work, 'p10.txt'))), 'the reading as text: ' + wp.out);
  return 'two pages read twice; a line located on its page; both pages written as one pdf';
});

test('instructions: the format sample passes the checker with the default settings, and the general instructions carry no subject of their own', () => {
  const ex = path.join(T, 'subject.example.json');
  const v = tool('validate.js', [ex, path.join(T, 'sample.js')]);
  must(v.status === 0 && /OK: no errors/.test(v.out) && !/WARNING/.test(v.out), v.out.slice(-700));
  must(/l2 .*PENDING/.test(v.out) && /defs 1/.test(v.out), 'the sample no longer shows a pending lesson and a definition written once');
  ['BUILDER.md', 'REVIEWER.md', 'PROMPTS.md', 'LESSONS.md', 'APPENDIX.example.md'].forEach((f) => {
    const t = read(path.join(T, f));
    must(!/law13[56]|القانون الدولي|الدستوري|\d{1,2} (Nov|نوفمبر)|\/home\/|\/mnt\//.test(t), f + ' names a subject, a date or a conversation path');
  });
  const b = read(path.join(T, 'BUILDER.md'));
  must(/التعريف يُكتب مرة واحدة/.test(b) && /intro/.test(b) && /pending: true/.test(b) && /ولا تبنِ من الفرق فخاً/.test(b), 'the builder instructions lost a rule of the new format');
  must(/لا تكتبها إلا إن قال ملحق المادة إن صاحب الموقع اختارها/.test(b) && /checks\.map: require/.test(read(path.join(T, 'APPENDIX.example.md'))), 'the mind map must stay a choice of the site owner, not part of the base');
  must(!/60–70%|بيّن مدى صحة العبارة/.test(b) && /60–70%/.test(read(path.join(T, 'tests', 'subjects', 'law135.APPENDIX.md'))), 'what one subject needed must stay in its appendix');
  ['BUILDER.md', 'REVIEWER.md', 'PROMPTS.md', 'LESSONS.md', 'APPENDIX.example.md', 'README.md'].forEach((f) => must(!/النص المنسوخ|الناسخ|تدقيق النسخ|compare\.js|make-gemini-text|copylib/.test(read(path.join(T, f))), f + ' still describes copying the book text'));
  must(/صور صفحات/.test(b) && /لا تنسخ نص الكتاب/.test(b) && /مقابلة المنقول بالصور/.test(read(path.join(T, 'README.md'))), 'the builder reads the page images and never copies the book text');
  must(!['compare.js', 'make-gemini-text.js', 'copylib.js'].some((f) => fs.existsSync(path.join(T, f))), 'a retired tool is back');
});

/* ======================= 4) المتصفح ======================= */
if (FAST) skip('browser checks', 'asked for the fast run (--fast)');
else LEGACY.forEach((code) => test(code + ': gate with the browser passes on one lesson (screens, run check, two devices)', () => {
  const a = run('node', [path.join(T, 'gate.js'), code, '--check', '--lessons', '1-1', '--full'], { timeout: 600000 });
  must(a.status === 0 && /browser\s+OK/.test(a.out) && /run check OK/.test(a.out) && /two devices OK/.test(a.out), a.out.slice(-500));
}));

fs.rmSync(TMP, { recursive: true, force: true });
console.log(results.join('\n'));
console.log('\n' + (failed ? failed + ' FAILED of ' : 'ALL PASSED: ') + results.filter((r) => !r.startsWith('SKIP')).length + ' tests' + (results.some((r) => r.startsWith('SKIP')) ? ' (' + results.filter((r) => r.startsWith('SKIP')).length + ' skipped)' : ''));
process.exit(failed ? 1 : 0);
