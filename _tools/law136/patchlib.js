/* أدوات إصلاح ملف فصل بمواضع محددة، دون إعادة كتابته. */
'use strict';
const fs = require('fs');
const vm = require('vm');
module.exports = function open(file) {
  let s = fs.readFileSync(file, 'utf8');
  const log = [];
  const S = (x) => JSON.stringify(x);
  const A = (a) => '[' + a.map(S).join(', ') + ']';
  function count(sub) { let n = 0, i = 0; while ((i = s.indexOf(sub, i)) > -1) { n++; i += sub.length; } return n; }
  const api = {
    rep(oldS, newS, n = 1) {
      const c = count(oldS);
      if (c !== n) throw new Error('rep: expected ' + n + ' got ' + c + ' for «' + oldS.slice(0, 70) + '»');
      s = s.split(oldS).join(newS); log.push('rep ' + oldS.slice(0, 40));
    },
    delLine(sub) {
      const lines = s.split('\n'); const idx = lines.map((l, i) => (l.includes(sub) ? i : -1)).filter((i) => i > -1);
      if (idx.length !== 1) throw new Error('delLine: ' + idx.length + ' lines for «' + sub.slice(0, 60) + '»');
      lines.splice(idx[0], 1); s = lines.join('\n'); log.push('del ' + sub.slice(0, 40));
    },
    unorder(sub) {
      const lines = s.split('\n'); const i0 = lines.findIndex((l) => l.includes(sub));
      if (i0 < 0) throw new Error('unorder: lead not found «' + sub.slice(0, 50) + '»');
      let i = i0;
      while (i < i0 + 15 && i < lines.length && !/, ordered: true/.test(lines[i])) { if (i > i0 && /\{ t: "/.test(lines[i])) break; i++; }
      if (!/, ordered: true/.test(lines[i] || '')) throw new Error('unorder: no ordered flag for «' + sub.slice(0, 50) + '»');
      lines[i] = lines[i].replace(', ordered: true', ''); s = lines.join('\n'); log.push('unorder ' + sub.slice(0, 40));
    },
    block(sub, newText) {
      /* يستبدل كتلة ملخص كاملة (قد تمتد على أسطر) تبدأ بسطر فيه sub، أو يحذفها إن كان newText فارغاً */
      const lines = s.split('\n'); const idx = lines.map((l, i) => (l.includes(sub) ? i : -1)).filter((i) => i > -1);
      if (idx.length !== 1) throw new Error('block: ' + idx.length + ' lines for «' + sub.slice(0, 60) + '»');
      const i0 = idx[0]; if (!/\{ t: "/.test(lines[i0])) throw new Error('block: not a block start «' + sub.slice(0, 50) + '»');
      let i1 = i0; while (i1 < lines.length && !/\}\s*,?\s*$/.test(lines[i1])) i1++;
      const ind = lines[i0].match(/^\s*/)[0]; const comma = /,\s*$/.test(lines[i1]) ? ',' : '';
      lines.splice(i0, i1 - i0 + 1, ...(newText ? [ind + newText + comma] : []));
      s = lines.join('\n'); log.push('block ' + sub.slice(0, 40));
    },
    stripNotePrefix() {
      const before = s;
      s = s.replace(/(\{ t: "note", x: ")تنبيه\s*:\s*/g, '$1');
      const n = (before.match(/\{ t: "note", x: "تنبيه\s*:/g) || []).length; log.push('stripped تنبيه: x' + n); return n;
    },
    obj(id, fn) {
      const lines = s.split('\n');
      const i = lines.findIndex((l) => l.includes('{ id: "' + id + '",'));
      if (i < 0) throw new Error('obj: no line for ' + id);
      const line = lines[i];
      const ind = line.match(/^\s*/)[0];
      const comma = /\},\s*$/.test(line) ? ',' : '';
      const o = vm.runInNewContext('(' + line.trim().replace(/,\s*$/, '') + ')');
      fn(o);
      let out;
      if (o.k === 'tf') out = '{ id: ' + S(o.id) + ', k: "tf", q: ' + S(o.q) + ', a: ' + (o.a ? 'true' : 'false') + ', why: ' + S(o.why) + ', pg: ' + S(o.pg) + ' }';
      else if (o.k === 'mcq') out = '{ id: ' + S(o.id) + ', k: "mcq", q: ' + S(o.q) + ', opts: ' + A(o.opts) + ', a: ' + o.a + ', why: ' + S(o.why) + ', pg: ' + S(o.pg) + ' }';
      else if (o.k === 'fill') out = '{ id: ' + S(o.id) + ', k: "fill", q: ' + S(o.q) + ', a: ' + S(o.a) + ', opts: ' + A(o.opts) + ', why: ' + S(o.why) + ', pg: ' + S(o.pg) + ' }';
      else if (o.type === 'def') out = '{ id: ' + S(o.id) + ', type: "def", front: ' + S(o.front) + ', back: ' + S(o.back) + ', bk: ' + (o.bk ? 'true' : 'false') + ', pg: ' + S(o.pg) + ' }';
      else if (o.type === 'count') out = '{ id: ' + S(o.id) + ', type: "count", front: ' + S(o.front) + ', n: ' + o.items.length + ', lead: ' + S(o.lead) + ', items: ' + A(o.items) + ', pg: ' + S(o.pg) + ' }';
      else if (o.type === 'rule') out = '{ id: ' + S(o.id) + ', type: "rule", front: ' + S(o.front) + ', rule: ' + S(o.rule) + ', exc: ' + S(o.exc) + ', pg: ' + S(o.pg) + ' }';
      else throw new Error('obj: cannot serialise ' + id + ' (use rep for essays)');
      lines[i] = ind + out + comma; s = lines.join('\n'); log.push('obj ' + id);
    },
    save() { fs.writeFileSync(file, s); return log; },
    text() { return s; }
  };
  return api;
};
