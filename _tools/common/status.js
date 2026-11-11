#!/usr/bin/env node
/* حال الدفعات ونسبة الاستخدام قبل كل دفعة وبعدها، في _tools/<رمز المادة>/plan.json مع خطة الدروس.
   الدفعة دفعة محتوى: دروس تُبنى من صور صفحاتها وتُراجَع وتُنشر.
   الاستعمال:
     node _tools/common/status.js <رمز>                              الجدول كله في أسطر قليلة
     node _tools/common/status.js <رمز> add content 1-5 c1 ["ملاحظة"]  دفعة محتوى لدروس l1..l5 في ملف c1
     node _tools/common/status.js <رمز> set <رقم الدفعة> <الحال>
     node _tools/common/status.js <رمز> usage <رقم الدفعة> before|after <النسبة>     من Settings > Usage
     node _tools/common/status.js <رمز> note <رقم الدفعة> "ملاحظة"
   الأحوال:  planned built checked reviewed gemini published */
'use strict';
const fs = require('fs');
const path = require('path');
const lib = require('./lib');

const STATES = {
  content: { planned: 'مخطّطة', built: 'بُنيت', checked: 'اجتازت الفحص الآلي', reviewed: 'راجعها المراجع المستقل وصُحّحت', gemini: 'عادت من جيمني', published: 'نُشرت' }
};
const KIND = { content: 'محتوى' };
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });

function planFile(S) { return path.join(S.repo, '_tools', S.code, 'plan.json'); }
function loadPlan(S) {
  const f = planFile(S);
  if (!fs.existsSync(f)) return { file: f, plan: { v: 2, code: S.code, lessons: [], batches: [] }, legacy: false, missing: true };
  const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (Array.isArray(raw)) return { file: f, plan: { v: 2, code: S.code, lessons: raw, batches: [] }, legacy: true };   /* خطة قديمة: دروس وحدها */
  if (!Array.isArray(raw.batches)) raw.batches = [];
  if (!Array.isArray(raw.lessons)) raw.lessons = [];
  return { file: f, plan: raw, legacy: false };
}
function savePlan(P) {
  if (P.legacy) throw new Error(path.relative(lib.REPO, P.file) + ' is an old lessons-only plan kept as it is; batches are recorded for subjects built with the common tools');
  fs.mkdirSync(path.dirname(P.file), { recursive: true });
  fs.writeFileSync(P.file, JSON.stringify(P.plan, null, 1) + '\n');
}
const pct = (x) => (typeof x === 'number' ? x + '%' : '—');
function rangeText(b) { return 'l' + String(b.range).replace('-', '–l') + (b.file ? ' (' + b.file + ')' : ''); }
function table(S, P) {
  const B = P.plan.batches, L = [];
  L.push(S.code + ' ' + S.name + ' · الدروس في الخطة ' + P.plan.lessons.length + ' · الدفعات ' + B.length + (P.legacy ? ' (خطة قديمة بلا دفعات)' : ''));
  const missing = [];
  let sum = 0;
  B.forEach((b) => {
    const u = b.usage || {}, both = typeof u.before === 'number' && typeof u.after === 'number';
    const cost = both ? u.after - u.before : null;
    if (cost !== null && cost >= 0) sum += cost;
    if (typeof u.before !== 'number') missing.push(b.n + ' (قبل)');
    else if (typeof u.after !== 'number' && b.state === 'published') missing.push(b.n + ' (بعد)');
    const last = (b.log || []).slice(-1)[0];
    L.push(' ' + b.n + ' | ' + (KIND[b.kind] || b.kind) + ' | ' + rangeText(b) + ' | ' + ((STATES[b.kind] || {})[b.state] || b.state) + ' | الاستخدام ' + pct(u.before) + ' ← ' + pct(u.after) +
      ' | الكلفة ' + (cost === null ? '—' : cost < 0 ? 'تجدّد الرصيد بين القياسين' : '+' + cost) + (last ? ' | ' + last.date : '') + (b.note ? ' | ' + b.note : ''));
  });
  if (B.length) L.push('المجموع المسجَّل: +' + sum);
  if (missing.length) L.push('تذكير: نسبة الاستخدام ناقصة في الدفعات: ' + missing.join('، ') + '. تُسأل من Settings > Usage.');
  return L;
}

function main(argv) {
  const [code, cmd, ...a] = argv;
  if (!code) lib.die('usage: node status.js <subject> [add content A-B cN | set N state | usage N before|after P | note N "text"]');
  const S = lib.loadSubject(code);
  const P = loadPlan(S);
  const find = (n) => { const b = P.plan.batches.find((x) => x.n === +n); if (!b) throw new Error('no batch ' + n); return b; };
  try {
    if (!cmd) { console.log(table(S, P).join('\n')); return; }
    if (cmd === 'add') {
      const [kind, range, x, y] = a;
      if (!STATES[kind] || !/^\d+-\d+$/.test(range || '')) throw new Error('add content 1-5 c1 ["note"]');
      const b = { n: P.plan.batches.reduce((m, q) => Math.max(m, q.n), 0) + 1, kind, range, state: 'planned', usage: { before: null, after: null }, log: [{ state: 'planned', date: today() }] };
      if (kind === 'content') { if (!/^c\d+[a-z]?$/.test(x || '')) throw new Error('add content needs the chapter file id, e.g. c1'); b.file = x; if (y) b.note = y; }
      else if (x) b.note = x;
      P.plan.batches.push(b); savePlan(P);
    } else if (cmd === 'set') {
      const b = find(a[0]);
      if (!STATES[b.kind][a[1]]) throw new Error('state of a ' + b.kind + ' batch is one of: ' + Object.keys(STATES[b.kind]).join(' '));
      b.state = a[1]; (b.log = b.log || []).push({ state: a[1], date: today() }); savePlan(P);
    } else if (cmd === 'usage') {
      const b = find(a[0]), v = Number(a[2]);
      if (!['before', 'after'].includes(a[1]) || !(v >= 0 && v <= 100)) throw new Error('usage N before|after <0..100>');
      (b.usage = b.usage || {})[a[1]] = v; savePlan(P);
    } else if (cmd === 'note') {
      const b = find(a[0]); b.note = a.slice(1).join(' '); savePlan(P);
    } else throw new Error('unknown command ' + cmd);
    console.log(table(S, P).join('\n'));
  } catch (e) { lib.die('ERROR: ' + e.message, 1); }
}
if (require.main === module) main(process.argv.slice(2));
module.exports = { loadPlan, savePlan, table, STATES };
