// Writes pending-only chapter parts from the repo's current chapter file, to be merged around built parts.
// usage: node pending-parts.js <chapter.js> <out dir> <groupName:ids,...> ...   e.g. pA:l54 pB:l57,l58
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const [file, outDir, ...groups] = process.argv.slice(2);
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);
const ch = ctx.window.LAW136.chapters[0];
for (const g of groups) {
  const [name, ids] = g.split(':'); const want = ids.split(',');
  const lessons = ch.lessons.filter((l) => want.includes(l.id));
  if (lessons.length !== want.length || lessons.some((l) => !l.pending)) throw new Error(g + ': not all found or not pending');
  const part = { id: ch.id, title: ch.title, name: ch.name, pages: ch.pages, lessons, tables: [], map: { t: ch.title + ': ' + ch.name, c: [] }, night: [] };
  fs.writeFileSync(path.join(outDir, name + '.js'), '(window.LAW136 = window.LAW136 || { chapters: [] }).chapters.push(' + JSON.stringify(part, null, 1) + ');\n');
  console.log(name, lessons.map((l) => l.id).join(','));
}
