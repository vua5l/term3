/* مكتبة الأدوات العامة: تقرأ ملف إعدادات المادة وبيانات موقعها، وتكتب ملف الفصل بصيغة ملفات الموقع.
   لا يُكتب هنا اسم مادة ولا موعد ولا كتاب ولا مسار محادثة: كل ذلك من ملف إعدادات المادة أو من سطر الأمر. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const TOOLS = __dirname;
/* جذر المستودع: مجلدان فوق هذا الملف. TERM_ROOT يبدّله للاختبار على نسخة جانبية. */
const REPO = process.env.TERM_ROOT ? path.resolve(process.env.TERM_ROOT) : path.resolve(TOOLS, '..', '..');

/* أنواع الأخطاء الستة التي يُعلَّم بها كل خيار خاطئ وكل عبارة خاطئة */
const ETYPES = ['خلط مصطلح بشبيهه', 'حكم لحالة أخرى', 'شرط أو ركن ناقص', 'رقم أو تاريخ قريب', 'رأي منسوب إلى غير قائله', 'تعميم وإطلاق'];

/* الأصل. ملف إعدادات المادة لا يكتب إلا ما يخالفه. وما خُصّت به مادة فمطفأ هنا. */
const DEFAULTS = {
  code: '',                 /* رمز المادة، وهو اسم مجلد موقعها: law140 */
  name: '',                 /* اسم المادة كما يظهر */
  course: '',               /* اسم المقرر في رسالة جيمني إن خالف name */
  exam: '',                 /* اسم الاختبار في رسالة جيمني */
  global: '',               /* اسم الكائن في ملفات البيانات، والأصل الرمز بحروف كبيرة: LAW140 */
  site: '',                 /* مجلد الموقع، والأصل الرمز */
  book: { title: '', author: '', pdfOffset: 0 },   /* pdfOffset: صفحة الملف المصوَّر = صفحة الكتاب − هذا الرقم */
  text: { pageMark: 'eq' }, /* علامة الصفحة في ملفات النص المنسوخ: eq «=== ص 127 ===» أو hash «# ص 127» */
  checks: {
    blocks: ['h', 'p', 'list', 'q', 'note', 'dr'],
    errorTypes: true,       /* كل خيار خاطئ وعبارة خاطئة معلَّمة بنوع خطئها */
    exp: true,              /* علامة «متوقع» المستترة exp: 1 */
    steps: true,            /* خطوات مرتبة في الدرس (اختيارية) */
    defs: 'summary',        /* summary: التعريف يُكتب مرة في الملخص وتُشتق بطاقته وخانته · chapter: خانة defs في ملف الفصل · manual: defs.js يُكتب باليد */
    intro: 'require',       /* التمهيد المبسّط في رأس الدرس: require | optional | off */
    dates: 'off',           /* warn: ينبّه إلى ما يشبه التواريخ، لمادة تُحذف تواريخها */
    tfReason: false,        /* أستاذ المادة يطلب التعليل في الصح والخطأ: يغيّر صيغة السؤال في نسخة المراجعة ورسالة جيمني وحدهما */
    minutesMax: 75,
    mix: { cardsMin: 5, objectiveMin: 8, essayMin: 2, tfMinShare: 0, tfAim: '', mcqMaxPerLesson: 0 },   /* 0 = لا حدّ */
    similar: 0.8,           /* تنبيه الأسئلة المتقاربة: حدّ التشابه، و0 يطفئه */
    longest: 0.4,           /* تنبيه الجواب الصحيح الأطول: حصة الأسئلة التي يُنبَّه عندها، و0 يطفئه */
    dupDefs: true           /* تنبيه التعريفات المكررة */
  },
  smoke: { routes: ['#home', '#plan', '#sum', '#quiz', '#rev', '#review', '#eve', '#nb', '#cells'] }
};
const ENUMS = { 'checks.defs': ['summary', 'chapter', 'manual'], 'checks.intro': ['require', 'optional', 'off'], 'checks.dates': ['off', 'warn'], 'text.pageMark': ['eq', 'hash'] };

function die(msg, code) { console.error(msg); process.exit(code === undefined ? 2 : code); }
const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const isStr = (s) => typeof s === 'string' && s.trim().length > 0;

function mergeCfg(base, over, where, bad) {
  const out = Object.assign({}, base);
  Object.keys(over).forEach((k) => {
    if (k.startsWith('//') || k.startsWith('_')) return;          /* ملاحظات في الملف */
    if (!(k in base)) { bad.push(where + k); return; }
    out[k] = isObj(base[k]) && isObj(over[k]) ? mergeCfg(base[k], over[k], where + k + '.', bad) : over[k];
  });
  return out;
}

/* يقرأ إعدادات المادة من رمزها أو من مسار ملفها. يبحث في _tools/<الرمز>/subject.json ثم في إعدادات المواد القديمة المحفوظة للاختبار. */
function loadSubject(arg) {
  if (!arg) die('missing subject: pass the subject code first, e.g. law140');
  let file = null;
  if (/\.json$/.test(arg)) { if (fs.existsSync(arg)) file = path.resolve(arg); }
  else file = [path.join(REPO, '_tools', arg, 'subject.json'), path.join(TOOLS, 'tests', 'subjects', arg + '.json')].find((f) => fs.existsSync(f)) || null;
  if (!file) die('no subject file for "' + arg + '". Create _tools/' + arg + '/subject.json from _tools/common/subject.example.json');
  let raw;
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { die(file + ': not valid JSON: ' + e.message); }
  const bad = [];
  const S = mergeCfg(JSON.parse(JSON.stringify(DEFAULTS)), raw, '', bad);
  if (bad.length) die(file + ': unknown setting(s): ' + bad.join(', ') + ' (see _tools/common/README.md)');
  if (!/^[a-z]+\d+[a-z0-9]*$/.test(S.code)) die(file + ': code must look like law140');
  if (!isStr(S.name)) die(file + ': name missing');
  Object.keys(ENUMS).forEach((k) => {
    const v = k.split('.').reduce((o, p) => o[p], S);
    if (!ENUMS[k].includes(v)) die(file + ': ' + k + ' must be one of ' + ENUMS[k].join(' | ') + ' (got ' + JSON.stringify(v) + ')');
  });
  S.global = S.global || S.code.toUpperCase();
  S.site = S.site || S.code;
  S.course = S.course || S.name;
  S.file = file; S.repo = REPO; S.siteDir = path.join(REPO, S.site);
  return S;
}

/* --- تحميل ملفات البيانات --- */
function newCtx() { const ctx = { window: {} }; vm.createContext(ctx); return ctx; }
function run(ctx, file) { vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file }); }
/* ملف فصل واحد: الكائن كما هو (بلا نسخ)، أو خطأ إن لم يُدخل فصلاً واحداً */
function loadChapter(S, file) {
  const ctx = newCtx();
  run(ctx, file);
  const list = ctx.window[S.global] && ctx.window[S.global].chapters;
  if (!list || list.length !== 1) { const e = new Error('the file must push exactly one chapter into window.' + S.global + '.chapters'); e.shape = true; throw e; }
  return list[0];
}
const copy = (o) => JSON.parse(JSON.stringify(o));
/* الموقع كله: config.js ثم فصوله بترتيبه */
function loadSite(S, extra) {
  const ctx = newCtx();
  const cfgFile = path.join(S.siteDir, 'config.js');
  if (!fs.existsSync(cfgFile)) throw new Error(path.relative(REPO, cfgFile) + ' not found');
  run(ctx, cfgFile);
  const cfg = ctx.window[S.global + '_CONFIG'];
  if (!cfg || !Array.isArray(cfg.chapters)) throw new Error('window.' + S.global + '_CONFIG {chapters[]} missing in ' + path.relative(REPO, cfgFile));
  cfg.chapters.forEach((id) => {
    const f = path.join(S.siteDir, 'data', id + '.js');
    if (!fs.existsSync(f)) throw new Error('missing ' + path.relative(REPO, f));
    run(ctx, f);
  });
  (extra || []).forEach((f) => { const p = path.join(S.siteDir, 'data', f); if (fs.existsSync(p)) run(ctx, p); });
  const all = (ctx.window[S.global] && ctx.window[S.global].chapters) || [];
  const byId = {}; all.forEach((c) => { byId[c.id] = c; });
  return { ctx, cfg, chapters: cfg.chapters.map((id) => byId[id]).filter(Boolean), byId, defs: ctx.window[S.global + '_DEFS'] || null };
}

/* --- النص والأرقام --- */
const toLatin = (s) => String(s).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
/* توحيد للمقابلة الآلية: الأرقام، والتشكيل، وصور الألف والياء والهمزة، وكل ما ليس حرفاً أو رقماً يصير مسافة */
function norm(s) {
  return String(s).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[ً-ْٰـ]/g, '')
    .replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/[^ء-يA-Za-z0-9٠-٩]+/g, ' ').replace(/\s+/g, ' ').trim();
}
const ws = (s) => String(s).replace(/\s+/g, ' ').trim();   /* توحيد المسافات وحدها */
function pgNums(pg) {
  if (!isStr(pg)) return null;
  const out = [];
  for (const part of toLatin(pg).split(/[،,]/)) {
    const m = part.trim().match(/^(\d+)(?:\s*[–-]\s*(\d+))?$/);
    if (!m) return null;
    const a = +m[1], b = m[2] ? +m[2] : a;
    if (b < a) return null;
    out.push(a, b);
  }
  return out;
}
function span(pg) {
  const m = toLatin(String(pg || '')).match(/\d+/g);
  return m ? [Math.min(...m.map(Number)), Math.max(...m.map(Number))] : null;
}

/* --- ملفات النص المنسوخ --- */
const MARKS = {
  eq: { line: /^===\s*ص\s*[0-9٠-٩]+\s*===\s*$/, lines: /^===\s*ص\s*[0-9٠-٩]+\s*===\s*$/gm, split: /^===\s*ص\s*([0-9٠-٩]+)\s*===\s*$/m },
  hash: { line: /^#+\s*ص\s*[0-9٠-٩]+.*$/, lines: /^#+\s*ص\s*[0-9٠-٩]+.*$/gm, split: /^#+\s*ص\s*([0-9٠-٩]+).*$/m }
};
/* فهرس للمقابلة الآلية: all النص كله موحَّداً، وbody المتن وحده (تُحذف الحواشي حتى علامة الصفحة التالية، فيتصل نص يعبر من صفحة إلى التي بعدها) */
function sourceIndex(S, files) {
  const text = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  const M = MARKS[S.text.pageMark];
  if (S.text.pageMark === 'hash') return { all: norm(text.replace(M.lines, ' ').replace(/\[هامش[^\]]*\]/g, ' ')), body: null };
  const all = norm(text.replace(M.lines, ' ').replace(/^#+\s*/gm, ' ').replace(/\*\*/g, ' ').replace(/^حواشي:\s*$/gm, ' ').replace(/\[هامش[^\]]*\]/g, ' '));
  let inFn = false;
  const body = text.split('\n').filter((ln) => {
    if (M.line.test(ln)) { inFn = false; return false; }
    if (/^حواشي:\s*$/.test(ln)) { inFn = true; return false; }
    return !inFn;
  }).join('\n').replace(/^#+\s*/gm, ' ').replace(/\*\*/g, ' ');
  return { all, body: norm(body) };
}
/* نص كل صفحة برقمها */
function sourcePages(S, files) {
  const PAGES = {};
  const M = MARKS[S.text.pageMark];
  files.forEach((f) => {
    const parts = fs.readFileSync(f, 'utf8').split(M.split);
    for (let i = 1; i < parts.length; i += 2) PAGES[+toLatin(parts[i])] = parts[i + 1].trim();
  });
  return PAGES;
}

/* --- تعريف الملخص (حين checks.defs = summary): كتلة q فيها def وparts --- */
const isDefBlock = (b) => !!b && b.t === 'q' && b.def !== undefined;
const defText = (b) => (Array.isArray(b.parts) ? b.parts.join(' ') : '');
const defFull = (b) => [b.pre, defText(b), b.post].filter((s) => typeof s === 'string' && s.length).join(' ');

/* --- سطر الأمر --- */
/* يفصل الأعلام عن بقية الوسائط. spec: { range: 1, site: 0 } عدد قيم كل علم */
function args(argv, spec) {
  const rest = [], flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--') && Object.prototype.hasOwnProperty.call(spec, a.slice(2))) {
      const k = a.slice(2);
      if (spec[k] === 0) flags[k] = true;
      else if (spec[k] === 'many') (flags[k] = flags[k] || []).push(argv[++i]);
      else flags[k] = argv[++i];
    } else rest.push(a);
  }
  return { rest, flags };
}

module.exports = { TOOLS, REPO, ETYPES, DEFAULTS, die, isObj, isStr, loadSubject, newCtx, run, loadChapter, loadSite, copy, toLatin, norm, ws, pgNums, span, MARKS, sourceIndex, sourcePages, isDefBlock, defText, defFull, args };
