/* القانون الدستوري (law136): حفظ التقدم وتحميله، وهذا الموضع الوحيد الذي يحفظه.
   - يُحفظ في المتصفح أولاً بالمفتاح storageKey من config.js، ثم يُرفع عبر ../sync.js إلى law136/progress.json
     في فرع progress إن كان مفتاح المزامنة مُدخَلاً في هذا الجهاز. وبلا مفتاح يعمل الموقع من المتصفح وحده.
   - التقدم مربوط بالمعرّفات لا بالتواريخ:
       q[معرّف السؤال]    { n الإجابات، c الصحيحة، m في دفتر الأخطاء، s إجاباته الصحيحة في أيام مختلفة وهو في الدفتر، d يوم آخرها، t }
       k[معرّف البطاقة]   { v: 1 «أعرفها» أو 0، t }
       learn[معرّف الدرس] { v: 1 تعلّمته أو 0، t }
       exit[معرّف الدرس]  { pass اجتاز تسميع الخروج، pct نسبة آخر محاولة، day يوم آخر محاولة، via، t }
       bank[معرّف الفصل]  { r الجولة، cur ما حُلّ فيها {معرّف السؤال: 1 صواب أو 0 خطأ}، prev نتائج الجولة السابقة، last نتيجة آخر جولة، t }
       cell[معرّف الخانة] { n الإجابات، c الصحيحة، w أخطأ في آخرها 1 أو 0، t } لسؤال الخانة، ولا يدخل المستوى ولا دفتر الأخطاء
   - بين الجهاز والمستودع يُجمع التقدم مدخلاً مدخلاً بالأحدث، فلا يضيع ما أُنجز في أحدهما.
   - التفضيلات (النهار والليل وما يشبهه) لهذا الجهاز وحده، ولا تُرفع. */
(function () {
  'use strict';
  var C = window.LAW136_CONFIG || {};
  var KEY = C.storageKey || 'law136-v1';
  var PREFS = KEY + '-prefs';
  var FIELDS = ['q', 'k', 'learn', 'exit', 'bank', 'cell'];

  function fresh() { return { v: 1, base: 0, updatedAt: 0, q: {}, k: {}, learn: {}, exit: {}, bank: {}, cell: {} }; }
  function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function norm(s) {
    var o = fresh(); if (!isObj(s)) return o;
    o.base = +s.base || 0; o.updatedAt = +s.updatedAt || 0;
    FIELDS.forEach(function (f) { if (isObj(s[f])) o[f] = s[f]; });
    return o;
  }
  function clone(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }
  function canon(x) {
    if (Array.isArray(x)) return '[' + x.map(canon).join(',') + ']';
    if (isObj(x)) return '{' + Object.keys(x).sort().map(function (k) { return JSON.stringify(k) + ':' + canon(x[k]); }).join(',') + '}';
    return JSON.stringify(x === undefined ? null : x);
  }
  function sig(s) { var c = clone(norm(s)); delete c.updatedAt; return canon(c); }
  function lsGet(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  /* الدمج: كل مدخل بالأحدث، وعدد الإجابات لا ينقص، والاجتياز لا يُمحى، والجولة الأحدث تغلب */
  function newer(a, b) { if (a == null) return b; if (b == null) return a; return (+(b && b.t) || 0) >= (+(a && a.t) || 0) ? b : a; }
  function mergeQ(a, b) {
    if (!a) return b; if (!b) return a;
    var na = +a.n || 0, nb = +b.n || 0;
    return na !== nb ? (nb > na ? b : a) : newer(a, b);
  }
  function mergeExit(a, b) { if (!a) return b; if (!b) return a; var m = clone(newer(a, b)); m.pass = !!(a.pass || b.pass); return m; }
  function mergeBank(a, b) {
    if (!a) return b; if (!b) return a;
    var ra = +a.r || 1, rb = +b.r || 1;
    if (ra !== rb) return rb > ra ? b : a;
    var w = newer(a, b), o = w === a ? b : a, m = clone(w);
    m.cur = Object.assign({}, o.cur || {}, m.cur || {});
    m.prev = Object.assign({}, o.prev || {}, m.prev || {});
    if (!m.last && o.last) m.last = clone(o.last);
    return m;
  }
  var MERGE = { q: mergeQ, k: newer, learn: newer, exit: mergeExit, bank: mergeBank, cell: mergeQ };
  function merge(a, b) {
    a = norm(a); b = norm(b);
    if (a.base !== b.base) return clone(b.base > a.base ? b : a); // «البدء من جديد» في جهاز يغلب ما قبله
    var out = fresh(); out.base = a.base; out.updatedAt = Math.max(a.updatedAt, b.updatedAt);
    FIELDS.forEach(function (f) {
      var ks = {};
      Object.keys(a[f]).forEach(function (k) { ks[k] = 1; });
      Object.keys(b[f]).forEach(function (k) { ks[k] = 1; });
      Object.keys(ks).forEach(function (k) { var v = MERGE[f](a[f][k], b[f][k]); if (v != null) out[f][k] = clone(v); });
    });
    return out;
  }

  /* الحالة: كائن واحد لا تتغير هويته، فما يُدمج من المستودع يُكتب فيه نفسه */
  var S = norm(lsGet(KEY));
  function replace(next) {
    var n = norm(next);
    Object.keys(S).forEach(function (k) { delete S[k]; });
    Object.keys(n).forEach(function (k) { S[k] = n[k]; });
  }
  function persist() { lsSet(KEY, S); }

  var listeners = [], ref = null, remote = false, writing = false, again = false, timer = null;
  function emit() { listeners.forEach(function (f) { try { f(); } catch (e) {} }); }
  function later(ms) { clearTimeout(timer); timer = setTimeout(function () { timer = null; flush(); }, ms); }
  function flush(retried) {
    if (!ref) return;
    if (writing) { again = true; return; }
    writing = true;
    var p;
    try { p = ref.set({ s: JSON.stringify(S), updatedAt: S.updatedAt }); } catch (e) { p = Promise.reject(e); }
    Promise.resolve(p).then(function () {
      writing = false; if (again) { again = false; flush(); }
    }, function (e) {
      writing = false;
      var code = e && e.code;
      if (code === 'unavailable' && !retried) { setTimeout(function () { flush(true); }, 1500 + Math.random() * 2000); return; }
      if (code !== 'unavailable' && code !== 'resource_exhausted') { ref = null; remote = false; emit(); }
    });
  }
  function adopt(d) {
    var r = null;
    try { r = d && d.s ? JSON.parse(d.s) : null; } catch (e) { r = null; }
    if (!r || r.v !== 1) { if (S.updatedAt) later(600); return; }
    var m = merge(S, r), changed = sig(m) !== sig(S), behind = sig(m) !== sig(r);
    if (changed) { replace(m); persist(); emit(); }
    if (behind) later(600);
  }
  (function connect() {
    if (!window.claude || typeof window.claude.use !== 'function') return;
    Promise.all([window.claude.use('db'), window.claude.use('user')]).then(function (r) {
      var db = r[0], user = r[1];
      if (!db || !user || typeof db.doc !== 'function') return null;
      return user.id().then(function (uid) {
        if (!uid) return null;
        var d = db.doc('data/users/' + uid + '/progress');
        return d.get().then(function (snap) {
          ref = d; remote = true;
          if (snap && snap.exists) adopt(snap.data() || {}); else if (S.updatedAt) flush();
          if (typeof d.onSnapshot === 'function') {
            d.onSnapshot(function (s) { if (s && s.exists && !(s.metadata && s.metadata.hasPendingWrites)) adopt(s.data() || {}); }, function () {});
          }
          emit();
        });
      });
    }).catch(function () {});
  })();
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden' && ref && timer) { clearTimeout(timer); timer = null; flush(); }
  });

  var prefs = lsGet(PREFS); if (!isObj(prefs)) prefs = {};

  window.Law136Store = {
    state: function () { return S; },
    save: function () { S.updatedAt = Date.now(); persist(); if (ref) later(1500); },
    reset: function () { var now = Date.now(); replace({ v: 1, base: now, updatedAt: now }); persist(); if (ref) flush(); emit(); },
    onRemote: function (f) { if (typeof f === 'function') listeners.push(f); },
    pref: function (k) { return prefs[k]; },
    setPref: function (k, v) { prefs[k] = v; lsSet(PREFS, prefs); },
    synced: function () { return remote; },
    note: function () {
      return remote ? 'يُحفظ تقدمك في هذا الجهاز ثم في المستودع، فيظهر على كل جهاز فيه مفتاح المزامنة.'
                    : 'يُحفظ تقدمك في هذا المتصفح وحده. وللمزامنة بين الأجهزة أدخل مفتاحها مرة في كل جهاز.';
    }
  };
})();
