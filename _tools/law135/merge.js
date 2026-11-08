#!/usr/bin/env node
/* يدمج ملفات أجزاء الفصل (c9a.js وc9b.js...) في ملف فصل واحد بصيغة ملفات الموقع.
   الاستعمال: node merge.js <الناتج.js> <id> <title> <name> <pages> <جزء1.js> [جزء2.js ...]
   - الدروس والجداول والعقد والليلة تُضم بالترتيب.
   - الجداول يُعاد ترقيمها بالتسلسل (<id>t1، t2...)، فتبقى أرقام الجزء الأول كما هي إن كانت متسلسلة. */
'use strict';
const fs = require('fs');
const vm = require('vm');

const argv = process.argv.slice(2);
let start = null;
const si = argv.indexOf('--start');
if (si > -1) { start = +argv[si + 1]; argv.splice(si, 2); }   /* --start N: يُعاد ترقيم الدروس متسلسلة من lN مع معرّفات بنودها */
const [out, id, title, name, pages, ...parts] = argv;
if (!parts.length) { console.error('usage: node merge.js out.js id title name pages part1.js [part2.js ...] [--start N]'); process.exit(2); }

function load(f) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
  const list = ctx.window.LAW135 && ctx.window.LAW135.chapters;
  if (!list || list.length !== 1) throw new Error(f + ': must push exactly one chapter');
  return JSON.parse(JSON.stringify(list[0]));
}

const chs = parts.map(load);
const lessons = [], tables = [], mapC = [], night = [];
let mapT = null;
const seen = new Set();
for (const c of chs) {
  for (const l of c.lessons || []) {
    if (seen.has(l.id) && !start) throw new Error('duplicate lesson id ' + l.id + ' (use --start to renumber)');
    seen.add(l.id); lessons.push(l);
  }
  for (const t of c.tables || []) tables.push(t);
  if (c.map) { if (!mapT) mapT = c.map.t; for (const n of c.map.c || []) mapC.push(n); }
  for (const n of c.night || []) night.push(n);
}
tables.forEach((t, i) => { t.id = id + 't' + (i + 1); });
const renamed = [];
if (start) {
  lessons.forEach((l, i) => {
    const o = l.id, n = 'l' + (start + i);
    if (o === n) return;
    const re = new RegExp('^' + o + '([koe]\\d+)$');
    const fix = (x) => { if (!re.test(x.id)) throw new Error('unexpected id ' + x.id + ' in ' + o); x.id = x.id.replace(re, n + '$1'); };
    (l.cards || []).forEach(fix); (l.objective || []).forEach(fix); (l.essay || []).forEach(fix);
    l.id = n; renamed.push(o + '→' + n);
  });
  const all = lessons.flatMap((l) => [l.id].concat((l.cards || []).map((x) => x.id), (l.objective || []).map((x) => x.id), (l.essay || []).map((x) => x.id)));
  if (new Set(all).size !== all.length) throw new Error('duplicate ids after renumbering');
}

const lit = (v) => {
  if (Array.isArray(v)) return '[' + v.map(lit).join(', ') + ']';
  if (v && typeof v === 'object') return '{ ' + Object.keys(v).map((k) => k + ': ' + lit(v[k])).join(', ') + ' }';
  return JSON.stringify(v);
};
const head = (o, skip) => Object.keys(o).filter((k) => !skip.includes(k)).map((k) => k + ': ' + lit(o[k])).join(', ');
const L = [];
const P = (s) => L.push(s);
const items = (arr, ind, fn) => arr.forEach((x, i) => P(ind + fn(x) + (i < arr.length - 1 ? ',' : '')));

P('/* القانون الدستوري (law135) — ' + title + ': ' + name + ' (ص' + pages + ') — بيانات فقط */');
P('(window.LAW135 = window.LAW135 || { chapters: [] }).chapters.push({');
P('  id: ' + lit(id) + ', title: ' + lit(title) + ', name: ' + lit(name) + ', pages: ' + lit(pages) + ',');
P('  lessons: [');
lessons.forEach((l, li) => {
  P('    {');
  P('      ' + head(l, ['summary', 'cards', 'objective', 'essay']) + ',');
  P('      summary: ['); items(l.summary || [], '        ', lit); P('      ],');
  P('      cards: ['); items(l.cards || [], '        ', lit); P('      ],');
  P('      objective: ['); items(l.objective || [], '        ', lit); P('      ],');
  P('      essay: [');
  (l.essay || []).forEach((e, i, a) => {
    P('        { ' + head(e, ['points']) + ', points: [');
    items(e.points || [], '          ', lit);
    P('        ] }' + (i < a.length - 1 ? ',' : ''));
  });
  P('      ]');
  P('    }' + (li < lessons.length - 1 ? ',' : ''));
});
P('  ],');
P('  tables: [');
tables.forEach((t, i, a) => {
  P('    { ' + head(t, ['rows', 'core', 'pg']) + ', rows: [');
  items(t.rows || [], '      ', lit);
  P('    ], core: ' + lit(t.core) + ', pg: ' + lit(t.pg) + ' }' + (i < a.length - 1 ? ',' : ''));
});
P('  ],');
function node(n, ind, last) {
  if (Array.isArray(n.c) && n.c.length) {
    P(ind + '{ ' + head(n, ['c']) + ', c: [');
    n.c.forEach((x, i) => node(x, ind + '  ', i === n.c.length - 1));
    P(ind + '] }' + (last ? '' : ','));
  } else P(ind + lit(n) + (last ? '' : ','));
}
P('  map: { t: ' + lit(mapT || (title + ': ' + name)) + ', c: [');
mapC.forEach((n, i) => node(n, '    ', i === mapC.length - 1));
P('  ] },');
P('  night: [');
items(night, '    ', lit);
P('  ]');
P('});');
fs.writeFileSync(out, L.join('\n') + '\n');

/* تحقق: الدمج لا يُسقط شيئاً */
const back = load(out);
const cnt = (c) => JSON.stringify([c.lessons.length, c.lessons.map((l) => [l.summary.length, l.cards.length, l.objective.length, l.essay.length]), (c.tables || []).length, c.map ? c.map.c.length : 0, (c.night || []).length]);
const want = JSON.stringify([lessons.length, lessons.map((l) => [l.summary.length, l.cards.length, l.objective.length, l.essay.length]), tables.length, mapC.length, night.length]);
if (cnt(back) !== want) { console.error('ERROR: round-trip mismatch'); process.exit(1); }
console.log('merged ' + parts.length + ' part(s) -> ' + out + ': lessons ' + lessons.map((l) => l.id).join(',') + ' · tables ' + tables.length + ' · map ' + mapC.length + ' · night ' + night.length + (renamed.length ? ' · renumbered ' + renamed.join(' ') : ''));
