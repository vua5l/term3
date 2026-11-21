'use strict';
// load/save a single-chapter part file (window.LAW136.chapters.push({...}))
const fs = require('fs'), vm = require('vm');
exports.load = (f) => { const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(f, 'utf8'), ctx); return JSON.parse(JSON.stringify(ctx.window.LAW136.chapters[0])); };
exports.save = (f, ch) => fs.writeFileSync(f, '(window.LAW136 = window.LAW136 || { chapters: [] }).chapters.push(' + JSON.stringify(ch, null, 1) + ');\n');
exports.les = (ch, id) => { const l = ch.lessons.find((x) => x.id === id); if (!l) throw new Error('no lesson ' + id); return l; };
exports.obj = (l, id) => { const o = l.objective.find((x) => x.id === id); if (!o) throw new Error('no question ' + id); return o; };
exports.sub = (s, a, b, where) => { if (s.split(a).length !== 2) throw new Error('not exactly once in ' + where + ': ' + a); return s.replace(a, b); };
