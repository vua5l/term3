#!/usr/bin/env node
/* يكتب ملف فصل لم يُبنَ بعد: دروسه معلّقة بمعرّفاتها المحجوزة (العنوان والصفحات والدقائق وحدها)، من خطة الدروس في _tools/<الرمز>/plan.json.
   فيدخل الفصل ملف الدروس من أول نشر ويحجز الجدول وقته، ثم تُبنى مادته حين تُطلب.
   الاستعمال: node _tools/common/make-skeleton.js <رمز المادة> <معرّف الفصل> "<title>" "<name>" [--only A-B] [--out ملف.js]
     --only A-B  دروس بعينها من الفصل (أرقامها)، لفصل بُني بعضه: يُكتب الباقي جزءاً بـ --out ثم يُدمج مع المبني بـ merge.js.
   لا يكتب فوق ملف فيه درس مبني. */
'use strict';
const fs = require('fs');
const path = require('path');
const lib = require('./lib');
const { loadPlan } = require('./status');
const { mergeChapters } = require('./merge');

const { rest, flags } = lib.args(process.argv.slice(2), { only: 1, out: 1 });
const [code, id, title, name] = rest;
if (!code || !/^c\d+$/.test(id || '') || !title || !name) lib.die('usage: node make-skeleton.js <subject> cN "title" "name" [--only A-B] [--out file.js]');
const S = lib.loadSubject(code);
try {
  const all = loadPlan(S).plan.lessons.filter((l) => l.ch === id);
  if (!all.length) throw new Error('no lesson with ch "' + id + '" in ' + path.join('_tools', S.code, 'plan.json'));
  let pick = all;
  if (flags.only) { const m = /^(\d+)-(\d+)$/.exec(flags.only); if (!m) throw new Error('--only A-B'); pick = all.filter((l) => { const n = +String(l.id).slice(1); return n >= +m[1] && n <= +m[2]; }); if (!pick.length) throw new Error('no lesson of ' + id + ' in ' + flags.only); }
  const pg = (a, b) => (a === b ? String(a) : a + '–' + b);
  const lessons = pick.map((l) => {
    if (!/^l\d+$/.test(l.id || '') || !lib.isStr(l.title) || !Number.isInteger(l.p1) || !Number.isInteger(l.p2) || l.p2 < l.p1) throw new Error('plan lesson ' + l.id + ' needs id, title, p1 and p2');
    if (!Number.isInteger(l.minutes) || l.minutes < 1) throw new Error('plan lesson ' + l.id + ' needs minutes (its study effort) before it can reserve time in the schedule');
    return { id: l.id, title: l.title, pages: pg(l.p1, l.p2), minutes: l.minutes, pending: true };
  });
  const out = flags.out || path.join(S.siteDir, 'data', id + '.js');
  if (fs.existsSync(out)) {
    let built = false;
    try { built = lib.loadChapter(S, out).lessons.some((l) => l.pending !== true); } catch (e) { built = true; }
    if (built) throw new Error(path.relative(S.repo, out) + ' already holds built lessons; write the pending ones with --only A-B --out part.js and merge them in');
  }
  const pages = pg(Math.min(...all.map((l) => l.p1)), Math.max(...all.map((l) => l.p2)));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  console.log(mergeChapters(S, out, { id, title, name, pages }, [{ lessons, tables: [], night: [] }], {}).replace(/^merged 1 part\(s\)/, 'skeleton'));
} catch (e) { lib.die('ERROR: ' + e.message, 1); }
