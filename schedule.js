/*
  ربط الجدول بمواقع المواد (الترم الثالث).
  اقرأ SCHEDULE.md في جذر المستودع قبل أي تعديل هنا.

  - الجدول وحده يملك مواعيد الاختبارات والتوزيع على الأيام.
  - كل موقع مادة يملك تقسيم مادته إلى دروس في <المجلد>/lessons.json.
  - الإنجاز يُسجَّل من داخل موقع المادة، فيقرؤه الجدول.
  - الحفظ في فرع progress بالمفتاح نفسه الذي يستعمله sync.js، ويقع في الجهاز أولاً.
*/
(function () {
  'use strict';
  if (window.term3Schedule) return;

  var TOKEN_KEY = 'term3_gh_token';
  var BRANCH = 'progress';
  var API = 'https://api.github.com';
  var EXAMS_PATH = '_schedule/exams.json';
  var REQ = 3;          // مرات مرور الدرس: تعلّم ثم تسميعان في أيام مختلفة
  var RECALL = 0.5;     // جلسة التسميع نصف جلسة
  var MAX_SUBJECTS = 3; // لا تزيد المواد في اليوم على ثلاث
  var SPECIAL = { _review: 'مراجعة شاملة بالتسميع', _eve: 'ليلة الاختبار: تسميع البطاقات وورقة الليلة الأخيرة' };
  var KIND_UNITS = { learn: null, recall: 0.5, review: 1, eve: 1 };

  /* ---------- المكان ---------- */
  var host = location.hostname, parts = location.pathname.split('/').filter(Boolean);
  var OWNER = host.slice(-10) === '.github.io' ? host.slice(0, -10) : 'vua5l';
  var REPO = host.slice(-10) === '.github.io' && parts[0] ? parts[0] : 'term3';
  var BASE = (function () {
    var s = document.currentScript && document.currentScript.src;
    try { return s ? new URL('.', s).href : new URL('../', location.href).href; } catch (e) { return '../'; }
  })();

  /* ---------- أدوات ---------- */
  function token() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }
  function lsGet(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function b64encode(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function b64decode(b64) {
    var bin = atob(String(b64).replace(/\s/g, '')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  /* التواريخ بصيغة YYYY-MM-DD على توقيت الجهاز */
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function parseISO(s) { var p = String(s).slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(s, n) { var d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); }
  function diffDays(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 86400000); } // b - a
  function todayISO() { return iso(new Date()); }

  /* ---------- GitHub ---------- */
  function gh(method, path, body, keepalive) {
    var opt = { method: method, cache: 'no-store', headers: { 'Authorization': 'Bearer ' + token(), 'Accept': 'application/vnd.github+json' } };
    if (body) { opt.body = JSON.stringify(body); opt.headers['Content-Type'] = 'application/json'; }
    if (keepalive && opt.body && opt.body.length < 60000) opt.keepalive = true;
    return fetch(API + path, opt).then(function (r) {
      return r.text().then(function (t) { var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {} return { status: r.status, body: j }; });
    });
  }
  var branchReady = null;
  function ensureBranch() {
    if (branchReady) return branchReady;
    branchReady = gh('GET', '/repos/' + OWNER + '/' + REPO + '/git/ref/heads/' + BRANCH).then(function (r) {
      if (r.status === 200) return true;
      return gh('GET', '/repos/' + OWNER + '/' + REPO).then(function (rr) {
        return gh('GET', '/repos/' + OWNER + '/' + REPO + '/git/ref/heads/' + ((rr.body && rr.body.default_branch) || 'main'));
      }).then(function (m) {
        return gh('POST', '/repos/' + OWNER + '/' + REPO + '/git/refs', { ref: 'refs/heads/' + BRANCH, sha: m.body.object.sha });
      }).then(function () { return true; });
    });
    branchReady.catch(function () { branchReady = null; });
    return branchReady;
  }

  /* ملف في فرع progress: قراءة وكتابة، والجهاز أولاً */
  var shas = {}, chains = {};
  function remoteRead(path) {
    if (token()) {
      return gh('GET', '/repos/' + OWNER + '/' + REPO + '/contents/' + path + '?ref=' + BRANCH).then(function (r) {
        if (r.status === 404) { shas[path] = null; return null; }
        if (r.status !== 200) throw new Error('unavailable');
        shas[path] = r.body.sha;
        try { return JSON.parse(b64decode(r.body.content)); } catch (e) { return null; }
      });
    }
    // بلا مفتاح: النسخة العامة (قد تتأخر دقائق)
    return fetch('https://raw.githubusercontent.com/' + OWNER + '/' + REPO + '/' + BRANCH + '/' + path + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (r.status === 404) return null; if (!r.ok) throw new Error('unavailable'); return r.json(); });
  }
  function remoteWrite(path, rec, merge, keepalive, retried) {
    return ensureBranch().then(function () {
      var body = { message: 'الجدول: ' + path, content: b64encode(JSON.stringify(rec)), branch: BRANCH };
      if (shas[path]) body.sha = shas[path];
      return gh('PUT', '/repos/' + OWNER + '/' + REPO + '/contents/' + path, body, keepalive);
    }).then(function (r) {
      if (r.status === 200 || r.status === 201) { shas[path] = r.body.content && r.body.content.sha; return rec; }
      if ((r.status === 409 || r.status === 422 || r.status === 404) && !retried) {
        return remoteRead(path).then(function (cur) { var m = merge(cur, rec); return remoteWrite(path, m, merge, keepalive, true); });
      }
      throw new Error('unavailable');
    });
  }
  function pendKey(path) { return 'term3_sched_pend_' + path; }
  function cacheKey(path) { return 'term3_sched_cache_' + path; }

  function store(path, merge) {
    function local() { return merge(lsGet(cacheKey(path)), lsGet(pendKey(path))); }
    function flush(keepalive) {
      var run = (chains[path] || Promise.resolve()).then(function () {
        var rec = lsGet(pendKey(path)); if (!rec || !token()) return;
        return remoteRead(path).then(function (cur) {
          var m = merge(cur, rec);
          return remoteWrite(path, m, merge, keepalive);
        }).then(function (saved) {
          lsSet(cacheKey(path), saved);
          var now = lsGet(pendKey(path)); if (now && now.savedAt === rec.savedAt) lsSet(pendKey(path), null);
        });
      }).catch(function () {});
      chains[path] = run;
      return run;
    }
    return {
      local: local,
      pull: function () {
        return remoteRead(path).then(function (cur) {
          var m = merge(lsGet(cacheKey(path)), cur);
          lsSet(cacheKey(path), cur ? m : lsGet(cacheKey(path)));
          return local();
        }).catch(function () { return local(); });
      },
      put: function (rec) {
        rec.savedAt = Date.now();
        lsSet(pendKey(path), merge(lsGet(pendKey(path)), rec));
        return flush();
      },
      flush: flush
    };
  }

  /* الدمج: المواعيد بالأحدث، والإنجاز علامةً علامة بالأحدث */
  function mergeLatest(a, b) { if (!a) return b || null; if (!b) return a; return (b.savedAt || 0) >= (a.savedAt || 0) ? b : a; }
  function mergeMarks(a, b) {
    if (!a) return b ? clone(b) : null; if (!b) return clone(a);
    var out = { v: 1, savedAt: Math.max(a.savedAt || 0, b.savedAt || 0), marks: {}, level: null };
    [a.marks || {}, b.marks || {}].forEach(function (m) {
      Object.keys(m).forEach(function (k) { if (!out.marks[k] || (m[k].t || 0) >= (out.marks[k].t || 0)) out.marks[k] = m[k]; });
    });
    var la = a.level, lb = b.level; out.level = !la ? lb || null : !lb ? la : ((lb.t || 0) >= (la.t || 0) ? lb : la);
    return out;
  }

  var examsStore = store(EXAMS_PATH, mergeLatest);
  var markStores = {};
  function marksStore(code) { return markStores[code] || (markStores[code] = store(code + '/_passes.json', mergeMarks)); }

  /* ---------- دروس كل مادة (ملف ثابت في مجلدها) ---------- */
  function loadLessons(code) {
    var k = 'term3_sched_lessons_' + code;
    return fetch(BASE + code + '/lessons.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (r.status === 404) return null; if (!r.ok) throw new Error('x'); return r.json(); })
      .then(function (j) { lsSet(k, j || { none: true }); return j; })
      .catch(function () { var c = lsGet(k); return c && !c.none ? c : null; });
  }

  /* من العلامات إلى تواريخ المرور لكل درس */
  function passesOf(rec) {
    var out = {};
    if (!rec || !rec.marks) return out;
    Object.keys(rec.marks).forEach(function (k) {
      var m = rec.marks[k]; if (!m || !m.on) return;
      var i = k.lastIndexOf('|'), id = k.slice(0, i), d = k.slice(i + 1);
      (out[id] = out[id] || []).push(d);
    });
    Object.keys(out).forEach(function (id) { out[id].sort(); });
    return out;
  }

  /* ---------- التوزيع التلقائي على قواعد البحث ---------- */
  /*
    exams:   [{code, name, date}]
    lessons: {code: [{id, title, sessions}]}
    passes:  {code: {id: [YYYY-MM-DD]}}
    يُبنى من بداية اليوم: ما أُنجز اليوم لا يغيّر خطة اليوم، بل يُعلَّم منجزاً فيها.
  */
  function buildPlan(exams, lessons, passes, today, cap) {
    cap = cap || 8;
    var subj = [], warnings = [];
    exams.forEach(function (e) {
      if (!e.code || !e.date || !lessons[e.code] || !lessons[e.code].length) return;
      if (diffDays(today, e.date) <= 0) return;
      var st = lessons[e.code].map(function (l) {
        var ds = ((passes[e.code] || {})[l.id] || []).filter(function (d) { return d < today; });
        ds = ds.filter(function (d, i) { return ds.indexOf(d) === i; });
        return { l: l, n: Math.min(ds.length, REQ), last: ds.length ? ds[ds.length - 1] : null };
      });
      subj.push({ e: e, st: st });
    });
    var days = [], end = today;
    subj.forEach(function (s) { var last = addDays(s.e.date, -1); if (last > end) end = last; });
    if (!subj.length) return { days: [], warnings: [] };

    function sessionsOf(l) { var n = +l.sessions; return n > 0 ? n : 1; }
    function remaining(s) {
      var L = 0, R = 0;
      s.st.forEach(function (x) { if (x.n === 0) { L += sessionsOf(x.l); R += RECALL * (REQ - 1); } else R += RECALL * (REQ - x.n); });
      return { L: L, R: R, total: L + R };
    }

    for (var d = today; d <= end; d = addDays(d, 1)) {
      var active = subj.filter(function (s) {
        var A = diffDays(d, s.e.date);
        return A > 0 && (remaining(s).total > 0 || A <= 2); // اليومان الأخيران للمراجعة الشاملة دائماً
      });
      var day = { date: d, tasks: [], load: 0 };
      if (active.length) {
        // معدّل الحاجة لكل مادة: التعلّم ينتهي قبل الاختبار بيومين ليبقى للتسميع مكان،
        // والتسميع يتوزع على كل الأيام الباقية
        active.forEach(function (s) {
          var A = diffDays(d, s.e.date); s._A = A; s._eve = A === 1; s._final = A <= 2;
          var r = remaining(s);
          s._need = r.L / Math.max(1, A - 2) + r.R / A;
          if (s._eve) { var rec = 0; s.st.forEach(function (x) { if (x.n >= 1 && x.n < REQ) rec += RECALL; if (x.n === 0) rec += sessionsOf(x.l); }); s._need = rec; }
          if (s._final) s._need += 1; // جلسة المراجعة الشاملة
          s._alloc = Math.min(cap, Math.ceil(s._need * 2) / 2);
        });
        // الأقرب اختباراً أولاً، وليلة الاختبار مقدّمة
        active.sort(function (a, b) { return (b._eve - a._eve) || (a.e.date < b.e.date ? -1 : a.e.date > b.e.date ? 1 : 0); });
        if (active.length > MAX_SUBJECTS) active = active.slice(0, MAX_SUBJECTS);
        var sum = active.reduce(function (t, s) { return t + s._alloc; }, 0);
        if (sum > cap) {
          // ضاق اليوم: تُقسم الجلسات على قدر حاجة كل مادة، فلا تُهمل مادة يومها
          // (البحث: المادتان المتقاربتان تظهران كل يوم، ولا يوم كامل لمادة واحدة)
          var scale = cap / sum, used = 0;
          active.forEach(function (s) { s._alloc = Math.max(1, Math.floor(s._alloc * scale * 2) / 2); used += s._alloc; });
          for (var k = 0; used < cap && k < 20; k++) {
            active.forEach(function (s) { if (used < cap && s._alloc < s._need) { s._alloc += 0.5; used += 0.5; } });
          }
          warnings.push({ date: d, type: 'tight' });
        } else if (sum < cap) {
          // فائض اليوم يُقدَّم به العمل، والأقرب اختباراً أحق به
          var spare = cap - sum, wsum = 0;
          active.forEach(function (s) { s._w = 1 / s._A; wsum += s._w; });
          active.forEach(function (s) {
            var r = remaining(s).total + (s._final ? 1 : 0), extra = Math.floor(spare * s._w / wsum * 2) / 2;
            s._alloc = Math.max(s._alloc, Math.min(r, s._alloc + extra));
          });
        }
        var groups = [];
        active.forEach(function (s) {
          var budget = s._alloc, tasks = [];
          if (budget <= 0) return;
          if (s._final) budget -= 1;
          // 1) يُحجز للتعلّم نصيبه أولاً حتى لا يتأخر درس جديد عن موعد تسميعيه
          var fresh = s.st.filter(function (x) { return x.n === 0; });
          var learnTarget = s._eve ? 0 : remaining(s).L / Math.max(1, s._A - 2), learned = 0, fi = 0;
          function learnUpTo(limit) {
            while (fi < fresh.length) {
              var u = sessionsOf(fresh[fi].l);
              if (budget <= 0 || budget < u - 0.5 || learned >= limit) break;
              tasks.push({ code: s.e.code, lesson: fresh[fi].l.id, kind: 'learn', units: u });
              budget -= u; learned += u; fresh[fi].n = 1; fresh[fi].last = d; fi++;
            }
          }
          learnUpTo(learnTarget);
          // 2) ثم التسميع: ما حان موعده، وكله في ليلة الاختبار
          var due = s.st.filter(function (x) {
            if (x.n < 1 || x.n >= REQ || !x.last || x.last >= d) return false;
            if (s._eve) return true;
            var gap = Math.max(1, Math.round(0.3 * diffDays(x.last, s.e.date)));
            return diffDays(x.last, d) >= gap;
          }).sort(function (a, b) {
            // الأضيق فرصة أولاً (ما بقي له من مرور أكثر مما بقي من أيام)، ثم الأقدم
            var sa = s._A - (REQ - a.n), sb = s._A - (REQ - b.n);
            return (sa - sb) || (a.last < b.last ? -1 : a.last > b.last ? 1 : 0);
          });
          due.forEach(function (x) {
            if (budget < RECALL) return;
            tasks.push({ code: s.e.code, lesson: x.l.id, kind: 'recall', units: RECALL });
            budget -= RECALL; x.n++; x.last = d;
          });
          // 3) ما فضل من نصيب المادة لدرس جديد آخر، ولا يُقطع درس، ولا يُتجاوز النصيب إلا بنصف جلسة
          learnUpTo(Infinity);
          if (s._eve && fresh.some(function (x) { return x.n === 0; })) warnings.push({ date: d, type: 'unfinished', code: s.e.code });
          // 3) المراجعة الشاملة في اليومين الأخيرين: قبل الأخير مراجعة عامة، وليلة الاختبار تسميع البطاقات وورقة الليلة الأخيرة
          if (s._final) tasks.push({ code: s.e.code, lesson: s._eve ? '_eve' : '_review', kind: s._eve ? 'eve' : 'review', units: 1 });
          // الترتيب داخل المادة: التسميع أول الجلسة، ثم الدرس الجديد، ثم المراجعة الشاملة
          var ORDER = { recall: 0, learn: 1, review: 2, eve: 2 };
          tasks.sort(function (a, b) { return ORDER[a.kind] - ORDER[b.kind]; });
          if (tasks.length) groups.push({ s: s, tasks: tasks });
        });
        // ما فضل من السقف (لأن الدرس لا يُقطع) يُعطى لدروس جديدة، والأقرب اختباراً أولاً.
        // (البحث: تغطية أساسيات المنهج كله أهم من إتقان نصفه.) ولا تعلّم جديد ليلة الاختبار.
        var left = cap - groups.reduce(function (t, g) { return t + g.tasks.reduce(function (a, x) { return a + x.units; }, 0); }, 0);
        active.slice().sort(function (a, b) { return a.e.date < b.e.date ? -1 : 1; }).forEach(function (s) {
          if (left < 0.5 || s._eve) return;
          var g = null; groups.forEach(function (x) { if (x.s === s) g = x; });
          var fresh = s.st.filter(function (x) { return x.n === 0; });
          for (var i = 0; i < fresh.length; i++) {
            var u = sessionsOf(fresh[i].l);
            if (left < u - 0.5) break;
            if (!g) { g = { s: s, tasks: [] }; groups.push(g); }
            g.tasks.push({ code: s.e.code, lesson: fresh[i].l.id, kind: 'learn', units: u });
            left -= u; fresh[i].n = 1; fresh[i].last = d;
          }
          if (g) { var O = { recall: 0, learn: 1, review: 2, eve: 2 }; g.tasks.sort(function (a, b) { return O[a.kind] - O[b.kind]; }); }
        });
        // مادة ليلة الاختبار آخر اليوم، لتكون آخر ما يُراجع قبل النوم
        groups.sort(function (a, b) { return (a.s._eve - b.s._eve) || (a.s.e.date < b.s.e.date ? -1 : 1); });
        groups.forEach(function (g) { g.tasks.forEach(function (t) { day.tasks.push(t); day.load += t.units; }); });
      }
      days.push(day);
    }
    // تنبيه صادق: دروس لن تمرّ ثلاث مرات قبل اختبارها بهذا السقف
    subj.forEach(function (s) {
      var short = s.st.filter(function (x) { return x.n < REQ; }).length;
      var never = s.st.filter(function (x) { return x.n === 0; }).length;
      if (short) warnings.push({ type: 'short', code: s.e.code, count: short, unlearned: never });
    });
    warnings = warnings.filter(function (w) { return w.type !== 'unfinished'; });
    return { days: days, warnings: warnings };
  }

  /* ---------- الحالة المجمّعة ---------- */
  var state = null, listeners = [];
  function emit() { listeners.forEach(function (f) { try { f(state); } catch (e) {} }); }

  function examsBasis(exams) { return (exams || []).map(function (e) { return (e.code || e.key) + '@' + e.date; }).join(','); }

  function compose(examsRec, lessonsBy, marksBy) {
    var today = todayISO();
    var exams = (examsRec && examsRec.exams) || [];
    var cap = (examsRec && examsRec.cap) || 8;
    var passes = {}, levels = {};
    Object.keys(marksBy).forEach(function (c) { passes[c] = passesOf(marksBy[c]); levels[c] = marksBy[c] && marksBy[c].level || null; });
    var lessonList = {}, lessonIndex = {};
    Object.keys(lessonsBy).forEach(function (c) {
      var j = lessonsBy[c]; if (!j || !j.lessons) return;
      lessonList[c] = j.lessons;
      lessonIndex[c] = {}; j.lessons.forEach(function (l) { lessonIndex[c][l.id] = l; });
    });

    var ov = examsRec && examsRec.override;
    var source = 'auto', plan;
    if (ov && ov.basis === examsBasis(exams) && ov.days) {
      source = 'smart';
      plan = { days: ov.days.filter(function (x) { return x.date >= today; }).map(function (x) {
        return { date: x.date, tasks: x.tasks.map(function (t) {
          var l = (lessonIndex[t.code] || {})[t.lesson];
          return { code: t.code, lesson: t.lesson, kind: t.kind, units: KIND_UNITS[t.kind] || (l ? (+l.sessions || 1) : 1) };
        }) };
      }), warnings: [] };
    } else {
      plan = buildPlan(exams, lessonList, passes, today, cap);
    }

    // تفاصيل كل مهمة: عنوانها ورابطها وهل أُنجزت في يومها
    plan.days.forEach(function (day) {
      day.load = 0;
      day.tasks.forEach(function (t) {
        var l = (lessonIndex[t.code] || {})[t.lesson] || {};
        t.title = SPECIAL[t.lesson] || l.title || t.lesson; t.pages = l.pages || '';
        t.link = BASE + t.code + '/' + (l.link || '');
        t.done = ((passes[t.code] || {})[t.lesson] || []).indexOf(day.date) >= 0;
        day.load += t.units;
      });
    });

    // التقدم: مرات المرور المنجزة من المطلوب
    var progress = {};
    Object.keys(lessonList).forEach(function (c) {
      var need = lessonList[c].length * REQ, got = 0, learned = 0;
      lessonList[c].forEach(function (l) { var n = ((passes[c] || {})[l.id] || []).length; got += Math.min(n, REQ); if (n) learned++; });
      progress[c] = { pct: need ? Math.round(got / need * 100) : 0, learned: learned, total: lessonList[c].length, level: levels[c] };
    });

    return {
      today: today, cap: cap, exams: exams, source: source,
      overrideExpired: !!(ov && ov.basis !== examsBasis(exams)),
      lessons: lessonList, passes: passes, progress: progress,
      days: plan.days, warnings: plan.warnings || [],
      updated: examsRec && examsRec.savedAt || 0
    };
  }

  function refreshFromLocal() {
    if (!state || !state._raw) return;
    var raw = state._raw, marksBy = {};
    Object.keys(raw.lessonsBy).forEach(function (c) { marksBy[c] = marksStore(c).local(); });
    var s = compose(examsStore.local() || raw.examsRec, raw.lessonsBy, marksBy);
    s._raw = { examsRec: examsStore.local() || raw.examsRec, lessonsBy: raw.lessonsBy };
    state = s; emit();
  }

  var loading = null;
  function load() {
    if (loading) return loading;
    loading = examsStore.pull().then(function (examsRec) {
      var exams = (examsRec && examsRec.exams) || [];
      var codes = exams.map(function (e) { return e.code; }).filter(Boolean);
      return Promise.all(codes.map(function (c) {
        return Promise.all([loadLessons(c), marksStore(c).pull()]);
      })).then(function (rs) {
        var lessonsBy = {}, marksBy = {};
        codes.forEach(function (c, i) { lessonsBy[c] = rs[i][0]; marksBy[c] = rs[i][1]; });
        var s = compose(examsRec, lessonsBy, marksBy);
        s._raw = { examsRec: examsRec, lessonsBy: lessonsBy };
        state = s; loading = null; emit();
        return state;
      });
    });
    loading.catch(function () { loading = null; });
    return loading;
  }

  /* ---------- واجهة المواقع ---------- */
  function forSite(s, code) {
    var exam = null; s.exams.forEach(function (e) { if (e.code === code) exam = e; });
    var mine = s.days.map(function (d) {
      return { date: d.date, tasks: d.tasks.filter(function (t) { return t.code === code; }) };
    }).filter(function (d) { return d.tasks.length; });
    var today = (mine[0] && mine[0].date === s.today) ? mine[0].tasks : [];
    return {
      exam: exam, today: today, days: mine, progress: s.progress[code] || null,
      passes: s.passes[code] || {}, scheduleUrl: BASE, all: s
    };
  }

  function mark(code, lessonId, on, kind, date) {
    var k = lessonId + '|' + (date || todayISO());
    var rec = { v: 1, marks: {} };
    rec.marks[k] = { on: on ? 1 : 0, t: Date.now(), k: kind || '' };
    var p = marksStore(code).put(rec);
    refreshFromLocal();
    return p;
  }

  window.term3Schedule = {
    version: 1,
    base: BASE,
    todayISO: todayISO,
    /* load(code): للموقع: موعده ومهامه. load(): للجدول: كل شيء */
    load: function (code) { return load().then(function (s) { return code ? forSite(s, code) : s; }); },
    /* تحميل سريع من الجهاز بلا انتظار الشبكة (قد يكون فارغاً أول مرة) */
    cached: function (code) {
      var examsRec = examsStore.local(); if (!examsRec) return null;
      var lessonsBy = {}, marksBy = {};
      (examsRec.exams || []).forEach(function (e) {
        if (!e.code) return;
        var c = lsGet('term3_sched_lessons_' + e.code); lessonsBy[e.code] = c && !c.none ? c : null;
        marksBy[e.code] = marksStore(e.code).local();
      });
      var s = compose(examsRec, lessonsBy, marksBy);
      return code ? forSite(s, code) : s;
    },
    onChange: function (cb) {
      listeners.push(cb);
      return function () { listeners = listeners.filter(function (f) { return f !== cb; }); };
    },
    /* يُستدعى من موقع المادة حين ينجز درساً تعلّماً أو تسميعاً */
    done: function (code, lessonId, kind) { return mark(code, lessonId, true, kind); },
    undo: function (code, lessonId, date) { return mark(code, lessonId, false, '', date); },
    /* مستوى المادة من بنك الأسئلة: النسبة وعدد الإجابات */
    level: function (code, pct, answered) {
      var p = marksStore(code).put({ v: 1, marks: {}, level: { pct: Math.round(pct), n: answered | 0, t: Date.now() } });
      refreshFromLocal(); return p;
    },

    /* ---------- للجدول وحده ---------- */
    saveExams: function (exams, opts) {
      opts = opts || {};
      var cur = examsStore.local() || { v: 1, exams: [], cap: 8, override: null };
      var rec = { v: 1, exams: clone(exams || cur.exams), cap: opts.cap || cur.cap || 8,
        override: opts.override !== undefined ? opts.override : cur.override };
      var p = examsStore.put(rec);
      refreshFromLocal(); return p;
    },
    clearOverride: function () { return this.saveExams(null, { override: null }); },
    buildPlan: buildPlan,
    basis: examsBasis,

    /* الترتيب الذكي: طلب جاهز يُلصق في محادثة جديدة */
    smartPrompt: function (s) {
      s = s || state; if (!s) return '';
      var lines = [];
      lines.push('رتّب لي خطة مذاكرة يومية حتى اختباراتي، واكتب الجواب بالصيغة المطلوبة في آخره.');
      lines.push('اليوم: ' + s.today + '. السقف اليومي: ' + s.cap + ' جلسات (الجلسة 25-30 دقيقة، والتسميع نصف جلسة).');
      lines.push('');
      lines.push('القواعد:');
      lines.push('1. لا تُخلط مادتان في جلسة واحدة، ولا تزيد المواد في اليوم على ثلاث.');
      lines.push('2. كل درس يمرّ ثلاث مرات في أيام مختلفة: تعلّم (learn) ثم تسميعان (recall) متباعدان.');
      lines.push('3. الأقرب اختباراً يأخذ الحصة الأكبر، والمادة البعيدة تأخذ جرعات صغيرة.');
      lines.push('4. في اليومين الأخيرين قبل كل اختبار تظهر المادة كل يوم، وليلة الاختبار تسميع فقط.');
      lines.push('5. ما فاتني يتوزع على الأيام القادمة دون تكديس.');
      lines.push('6. لا مهام لمادة في يوم اختبارها ولا بعده.');
      lines.push('');
      lines.push('الاختبارات:');
      s.exams.forEach(function (e) { if (e.code && s.lessons[e.code]) lines.push('- ' + e.code + ' (' + e.name + '): ' + e.date + (e.tentative ? ' (مبدئي)' : '')); });
      lines.push('');
      lines.push('الدروس (المعرّف | العنوان | الجلسات | مرات المرور المنجزة):');
      Object.keys(s.lessons).forEach(function (c) {
        lines.push(c + ':');
        s.lessons[c].forEach(function (l) {
          lines.push('  ' + l.id + ' | ' + l.title + ' | ' + (+l.sessions || 1) + ' | ' + Math.min(((s.passes[c] || {})[l.id] || []).length, REQ));
        });
      });
      lines.push('');
      lines.push('صيغة الجواب: كتلة JSON واحدة فقط، تبدأ من اليوم، ولكل درس لم يُتعلّم بعد مهمة learn واحدة.');
      lines.push('وفي اليوم الذي قبل الاختبار بيومين مهمة {"kind":"review"} للمادة، وفي ليلة الاختبار مهمة {"kind":"eve"}، وكلتاهما جلسة واحدة بلا درس:');
      lines.push('{"days":[{"date":"YYYY-MM-DD","tasks":[{"code":"law114","lesson":"المعرّف","kind":"learn"},{"code":"law114","lesson":"المعرّف","kind":"recall"},{"code":"law114","kind":"review"}]}]}');
      return lines.join('\n');
    },
    /* يستخرج الخطة من جواب ملصوق ويتحقق منها */
    parseSmart: function (text, s) {
      s = s || state;
      var errors = [], plan = null;
      var t = String(text || ''), i = t.indexOf('{'), found = null;
      while (i >= 0 && !found) {
        var depth = 0, inStr = false, esc = false;
        for (var j = i; j < t.length; j++) {
          var ch = t[j];
          if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
          if (ch === '"') inStr = true; else if (ch === '{') depth++; else if (ch === '}') { depth--; if (depth === 0) {
            try { var o = JSON.parse(t.slice(i, j + 1)); if (o && o.days) found = o; } catch (e) {}
            break;
          } }
        }
        i = t.indexOf('{', i + 1);
      }
      if (!found) return { ok: false, errors: ['لم أجد في الجواب خطة بالصيغة المطلوبة.'] };
      var examOf = {}; s.exams.forEach(function (e) { if (e.code) examOf[e.code] = e.date; });
      var learnCount = {};
      found.days.forEach(function (d) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date || '')) { errors.push('تاريخ غير صحيح: ' + d.date); return; }
        (d.tasks || []).forEach(function (tk) {
          if (!s.lessons[tk.code]) { errors.push('مادة غير معروفة: ' + tk.code); return; }
          if (!(tk.kind in KIND_UNITS)) { errors.push('نوع مهمة غير معروف: ' + tk.kind); return; }
          if (tk.kind === 'review' || tk.kind === 'eve') tk.lesson = tk.kind === 'eve' ? '_eve' : '_review';
          else if (!s.lessons[tk.code].some(function (l) { return l.id === tk.lesson; })) { errors.push('درس غير معروف: ' + tk.code + ' ' + tk.lesson); return; }
          if (d.date < s.today || d.date >= examOf[tk.code]) errors.push(tk.code + ' ' + tk.lesson + ': خارج الأيام المتاحة (' + d.date + ')');
          if (tk.kind === 'learn') { var k = tk.code + '|' + tk.lesson; learnCount[k] = (learnCount[k] || 0) + 1; }
        });
      });
      Object.keys(s.lessons).forEach(function (c) {
        if (!examOf[c] || examOf[c] <= s.today) return;
        s.lessons[c].forEach(function (l) {
          var done = ((s.passes[c] || {})[l.id] || []).filter(function (d) { return d < s.today; }).length > 0;
          var k = c + '|' + l.id, n = learnCount[k] || 0;
          if (!done && n !== 1) errors.push(c + ' ' + l.id + ': ورد للتعلّم ' + n + ' مرة، والمطلوب مرة واحدة.');
        });
      });
      if (errors.length) return { ok: false, errors: errors };
      plan = { basis: examsBasis(s.exams), created: Date.now(), days: found.days.map(function (d) {
        return { date: d.date, tasks: (d.tasks || []).map(function (tk) { return { code: tk.code, lesson: tk.lesson, kind: tk.kind }; }) };
      }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }) };
      return { ok: true, plan: plan, errors: [] };
    },
    applySmart: function (plan) { return this.saveExams(null, { override: plan }); },
    hasToken: function () { return !!token(); }
  };

  /* رفع ما بقي في الجهاز عند العودة أو الإغلاق */
  function flushAll(keepalive) {
    examsStore.flush(keepalive);
    Object.keys(markStores).forEach(function (c) { markStores[c].flush(keepalive); });
  }
  window.addEventListener('online', function () { flushAll(); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flushAll(true);
    else load().catch(function () {});
  });
  setTimeout(function () { flushAll(); }, 800);
})();
