#!/usr/bin/env node
/* يدمج ملفات أجزاء الفصل (c9a.js وc9b.js...) في ملف فصل واحد بصيغة ملفات الموقع، وهو الكاتب الوحيد لملفات الفصول.
   الاستعمال: node _tools/common/merge.js <رمز المادة> <الناتج.js> <id> <title> <name> <pages> <جزء1.js> [جزء2.js ...] [--start N]
   - الدروس والجداول والعقد والليلة تُضم بالترتيب.
   - الجداول يُعاد ترقيمها بالتسلسل (<id>t1، t2...)، فتبقى أرقام الجزء الأول كما هي إن كانت متسلسلة.
   - --start N: يُعاد ترقيم الدروس متسلسلة من lN مع معرّفات بنودها.
   - حين يُكتب التعريف مرة في الملخص (checks.defs = summary): تُشتق هنا بطاقة كل تعريف ونصه x، ويُكتب معرّف بطاقته في def.card فلا يتغير بعدها. */
'use strict';
const fs = require('fs');
const lib = require('./lib');

/* بطاقة التعريف المشتقة: وجهها المصطلح وظهرها نص الكتاب. معرّفها يُحجز مرة ولا يُعاد استعماله ولو حُذف التعريف. */
function deriveDefs(lessons) {
  const log = [];
  lessons.forEach((l) => {
    if (l.pending === true) return;
    const blocks = (l.summary || []).filter((b) => lib.isDefBlock(b) && lib.isObj(b.def) && Array.isArray(b.parts));
    const cards = l.cards || (l.cards = []);
    if (!blocks.length && !cards.some((k) => k.auto === true)) return;
    const num = (id) => { const m = /k(\d+)$/.exec(String(id)); return m ? +m[1] : 0; };
    let maxK = cards.concat((l.retired || []).map((id) => ({ id }))).reduce((m, k) => Math.max(m, num(k.id)), 0);
    const linked = new Set();
    blocks.forEach((b) => {
      const text = lib.defText(b);
      b.x = lib.defFull(b);
      let card = b.def.card ? cards.find((k) => k.id === b.def.card) : null;
      if (!card) {
        card = { id: b.def.card || (l.id + 'k' + (++maxK)), type: 'def' };
        cards.push(card); b.def.card = card.id; log.push('+' + card.id);
      }
      card.type = 'def'; card.front = b.def.front || b.def.term; card.back = text; card.bk = true; card.pg = b.pg; card.auto = true;
      linked.add(card.id);
    });
    for (let i = cards.length - 1; i >= 0; i--) {
      if (cards[i].auto === true && !linked.has(cards[i].id)) {   /* زال تعريفها من الملخص */
        (l.retired = l.retired || []).push(cards[i].id); log.push('-' + cards[i].id); cards.splice(i, 1);
      }
    }
  });
  return log;
}

/* نص ملف الفصل بصيغة ملفات الموقع */
function render(S, meta, d) {
  const lit = (v) => {
    if (Array.isArray(v)) return '[' + v.map(lit).join(', ') + ']';
    if (v && typeof v === 'object') return '{ ' + Object.keys(v).map((k) => k + ': ' + lit(v[k])).join(', ') + ' }';
    return JSON.stringify(v);
  };
  const head = (o, skip) => Object.keys(o).filter((k) => !skip.includes(k)).map((k) => k + ': ' + lit(o[k])).join(', ');
  const L = [];
  const P = (s) => L.push(s);
  const items = (arr, ind, fn) => arr.forEach((x, i) => P(ind + fn(x) + (i < arr.length - 1 ? ',' : '')));

  P('/* ' + S.name + ' (' + S.code + ') — ' + meta.title + ': ' + meta.name + ' (ص' + meta.pages + ') — بيانات فقط */');
  P('(window.' + S.global + ' = window.' + S.global + ' || { chapters: [] }).chapters.push({');
  P('  id: ' + lit(meta.id) + ', title: ' + lit(meta.title) + ', name: ' + lit(meta.name) + ', pages: ' + lit(meta.pages) + ',');
  P('  lessons: [');
  d.lessons.forEach((l, li) => {
    P('    {');
    P('      ' + head(l, ['summary', 'cards', 'objective', 'essay', 'intro']) + ',');
    if (l.intro !== undefined) P('      intro: ' + lit(l.intro) + ',');
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
    P('    }' + (li < d.lessons.length - 1 ? ',' : ''));
  });
  P('  ],');
  P('  tables: [');
  d.tables.forEach((t, i, a) => {
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
  P('  map: { t: ' + lit(d.mapT || (meta.title + ': ' + meta.name)) + ', c: [');
  d.mapC.forEach((n, i) => node(n, '    ', i === d.mapC.length - 1));
  P('  ] },');
  P('  night: [');
  items(d.night, '    ', lit);
  if (S.checks.defs === 'chapter') {
    P('  ],');
    P('  defs: [');
    items(d.defs, '    ', lit);
  }
  P('  ]');
  P('});');
  return L.join('\n') + '\n';
}

/* chs: كائنات فصول (أجزاء). يكتب out ويعيد سطر النتيجة. */
function mergeChapters(S, out, meta, chs, opt) {
  const start = opt && opt.start ? opt.start : null;
  const lessons = [], tables = [], mapC = [], night = [], defs = [];
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
    for (const d of c.defs || []) defs.push(d);
  }
  tables.forEach((t, i) => { t.id = meta.id + 't' + (i + 1); });
  const kids = (l) => (l.cards || []).concat(l.objective || [], l.essay || [], Array.isArray(l.steps) ? l.steps : []);
  const renamed = [];
  if (start) {
    lessons.forEach((l, i) => {
      const o = l.id, n = 'l' + (start + i);
      if (o === n) return;
      const re = new RegExp('^' + o + '([koes]\\d+)$');
      kids(l).forEach((x) => { if (!re.test(x.id)) throw new Error('unexpected id ' + x.id + ' in ' + o); x.id = x.id.replace(re, n + '$1'); });
      (l.summary || []).forEach((b) => { if (lib.isDefBlock(b) && lib.isObj(b.def) && typeof b.def.card === 'string') b.def.card = b.def.card.replace(re, n + '$1'); });
      if (Array.isArray(l.retired)) l.retired = l.retired.map((x) => String(x).replace(re, n + '$1'));
      l.id = n; renamed.push(o + '→' + n);
    });
    const all = lessons.flatMap((l) => [l.id].concat(kids(l).map((x) => x.id)));
    if (new Set(all).size !== all.length) throw new Error('duplicate ids after renumbering');
  }
  const derived = S.checks.defs === 'summary' ? deriveDefs(lessons) : [];

  fs.writeFileSync(out, render(S, meta, { lessons, tables, mapT, mapC, night, defs }));

  /* تحقق: الدمج لا يُسقط شيئاً */
  const back = lib.loadChapter(S, out);
  const withDefs = S.checks.defs === 'chapter';
  const shape = (ls, t, m, n, df) => JSON.stringify([ls.length, ls.map((l) => [(l.summary || []).length, (l.cards || []).length, (l.objective || []).length, (l.essay || []).length]), t, m, n].concat(withDefs ? [df] : []));
  const got = shape(back.lessons, (back.tables || []).length, back.map ? back.map.c.length : 0, (back.night || []).length, (back.defs || []).length);
  const want = shape(lessons, tables.length, mapC.length, night.length, defs.length);
  if (got !== want) throw new Error('round-trip mismatch');
  return 'merged ' + chs.length + ' part(s) -> ' + out + ': lessons ' + lessons.map((l) => l.id).join(',') + ' · tables ' + tables.length + ' · map ' + mapC.length + ' · night ' + night.length +
    (withDefs ? ' · defs ' + defs.length : '') + (S.checks.defs === 'summary' ? ' · derived cards ' + (derived.length ? derived.join(' ') : 'unchanged') : '') + (renamed.length ? ' · renumbered ' + renamed.join(' ') : '');
}

if (require.main === module) {
  const { rest, flags } = lib.args(process.argv.slice(2), { start: 1 });
  const [code, out, id, title, name, pages, ...parts] = rest;
  if (!parts.length) lib.die('usage: node merge.js <subject> out.js id title name pages part1.js [part2.js ...] [--start N]');
  const S = lib.loadSubject(code);
  try {
    const chs = parts.map((f) => { try { return lib.copy(lib.loadChapter(S, f)); } catch (e) { throw new Error(f + ': ' + e.message); } });
    console.log(mergeChapters(S, out, { id, title, name, pages }, chs, { start: flags.start ? +flags.start : null }));
  } catch (e) { lib.die('ERROR: ' + e.message, 1); }
}

module.exports = { mergeChapters, deriveDefs, render };
