// node items.js <part.js> <id...> : prints the items compactly (summary blocks by lNN.sK)
const vm = require('vm'), fs = require('fs');
const [file, ...ids] = process.argv.slice(2);
const c = { window: {} }; vm.createContext(c); vm.runInContext(fs.readFileSync(file, 'utf8'), c);
const ch = c.window.LAW135.chapters[0];
for (const id of ids) {
  let o = null;
  const m = id.match(/^(l\d+)\.s(\d+)$/);
  if (m) o = ch.lessons.find((l) => l.id === m[1]).summary[+m[2] - 1];
  else if (/t\d+$/.test(id)) o = ch.tables.find((t) => t.id === id);
  else for (const l of ch.lessons) for (const k of ['objective', 'cards', 'essay']) { const f = (l[k] || []).find((x) => x.id === id); if (f) o = f; }
  console.log('== ' + id + ' ' + JSON.stringify(o));
}
