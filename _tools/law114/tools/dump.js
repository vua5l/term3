// يطبع جزءاً (أو أجزاء) بصيغة JSON: node dump.js <جزء.js ...>
global.window = {};
const out = [];
for (const f of process.argv.slice(2)) { window.LAW114 = undefined; require(require('path').resolve(f)); out.push(...window.LAW114.chapters); }
process.stdout.write(JSON.stringify(out));
