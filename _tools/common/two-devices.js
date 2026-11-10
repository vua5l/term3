/* محاكاة جهازين للمزامنة: نسختان من store.js بتخزين محلي مستقل، ومستند مشترك يقوم مقام المستودع.
   تصلح لموقع نُسخ منطق حفظه من law135 (كائن الحفظ window.<Law140>Store، وحقول learn وq وk وes وtq).
   الاستعمال: node _tools/common/two-devices.js <رمز المادة> */
'use strict';
const fs = require('fs'), vm = require('vm');
const lib = require('./lib');
if (!process.argv[2]) lib.die('usage: node two-devices.js <subject>');
const S = lib.loadSubject(process.argv[2]);
const dir = S.siteDir;
const STORE = S.code.charAt(0).toUpperCase() + S.code.slice(1) + 'Store';
const shared = { data: null, subs: [] };
function makeDevice(name) {
  const ls = {};
  const ctx = {
    console, setTimeout, clearTimeout, Promise, JSON, Date, Math, Object, Array,
    localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); } },
    document: { addEventListener() {}, visibilityState: 'visible' },
  };
  ctx.window = ctx;
  ctx.window.claude = {
    use: (kind) => Promise.resolve(kind === 'user' ? { id: () => Promise.resolve('u1') } : {
      doc: () => ({
        get: () => Promise.resolve({ exists: !!shared.data, data: () => shared.data }),
        set: (v) => { shared.data = JSON.parse(JSON.stringify(v)); setTimeout(() => shared.subs.forEach((f) => f({ exists: true, data: () => shared.data, metadata: {} })), 5); return Promise.resolve(); },
        onSnapshot: (f) => { shared.subs.push(f); },
      }),
    }),
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(dir + '/config.js', 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(dir + '/store.js', 'utf8'), ctx);
  if (!ctx.window[STORE]) throw new Error('window.' + STORE + ' not found in ' + S.site + '/store.js');
  return { name, store: ctx.window[STORE] };
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const A = makeDevice('A'); await wait(50);
  const B = makeDevice('B'); await wait(50);
  const now = Date.now();
  const has = (x, k) => !!x[k] && typeof x[k] === 'object';
  // جهاز أ: تعلّم الدرس الأول، وأجاب سؤالاً، وعلّم مقالي الدرس الأول، واختبر جدولاً (ما وُجد من هذين الحقلين في حال الموقع)
  let s = A.store.state();
  const ES = has(s, 'es'), TQ = has(s, 'tq');
  s.learn.l1 = { v: 1, t: now }; s.q['l1o1'] = { t: now, d: '2026-11-09', f: 1, n: 1 }; if (ES) s.es.l1 = { v: 1, t: now }; if (TQ) s.tq.c1t1 = { v: 1, t: now };
  A.store.save(); await wait(1700);
  // جهاز ب: تعلّم الدرس الثاني، وعلّم بطاقة، وعلّم مقالي الدرس الثاني
  s = B.store.state();
  s.learn.l2 = { v: 1, t: now + 1 }; s.k['l2k1'] = { v: 1, t: now + 1 }; if (ES) s.es.l2 = { v: 1, t: now + 1 };
  B.store.save(); await wait(1700);
  // جهاز أ يلغي علامة مقالي الدرس الأول بعد ذلك
  if (ES) { s = A.store.state(); s.es.l1 = { v: 0, t: now + 5 }; A.store.save(); await wait(1700); }
  await wait(800);
  const a = A.store.state(), b = B.store.state();
  const pick = (x) => ({ learn: Object.keys(x.learn).sort(), k: Object.keys(x.k), es: x.es, tq: Object.keys(x.tq || {}), q: Object.keys(x.q) });
  const pa = JSON.stringify(pick(a)), pb = JSON.stringify(pick(b));
  console.log('A', pa); console.log('B', pb);
  const ok = pa === pb && a.learn.l1 && a.learn.l2 && a.k.l2k1 && a.q.l1o1 &&
    (!ES || (a.es.l2 && a.es.l2.v === 1 && a.es.l1 && a.es.l1.v === 0)) && (!TQ || a.tq.c1t1);
  console.log(ok ? 'TWO-DEVICE OK' : 'TWO-DEVICE FAILED'); process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('ERROR', e); process.exit(1); });
