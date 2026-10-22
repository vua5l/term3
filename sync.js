/*
  مزامنة التقدم عبر GitHub لمواقع الترم.
  يحل هذا الملف محل حفظ حساب Claude: كل موقع يكتب تقدمه في جهازه أولاً،
  ثم يرفعه هذا الملف إلى فرع "progress" في المستودع نفسه.
  المفتاح يُدخل من نافذة مستترة تُفتح بإضافة ?sync إلى آخر رابط المادة،
  ويبقى في متصفح الجهاز وحده، ولا يُكتب في أي ملف.
*/
(function () {
  if (window.claude && typeof window.claude.use === 'function') return; // داخل Claude: يبقى الحفظ كما هو

  var TOKEN_KEY = 'term3_gh_token';      // مستقل عن موقع الإنجليزي
  var BRANCH = 'progress';
  var API = 'https://api.github.com';

  var host = location.hostname, parts = location.pathname.split('/').filter(Boolean);
  var OWNER = host.slice(-10) === '.github.io' ? host.slice(0, -10) : 'vua5l';
  var REPO = host.slice(-10) === '.github.io' && parts[0] ? parts[0] : 'term3';
  var SITE = (function () {
    var p = parts.slice(); if (p.length && /\.html?$/i.test(p[p.length - 1])) p.pop();
    return p.length ? p[p.length - 1] : 'site';
  })();

  function token() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }
  function lsGet(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

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

  function err(code, msg) { var e = new Error(msg || code); e.code = code; return e; }
  function gh(method, path, body, keepalive) {
    var opt = {
      method: method, cache: 'no-store',
      headers: { 'Authorization': 'Bearer ' + token(), 'Accept': 'application/vnd.github+json' }
    };
    if (body) { opt.body = JSON.stringify(body); opt.headers['Content-Type'] = 'application/json'; }
    if (keepalive && opt.body && opt.body.length < 60000) opt.keepalive = true;
    return fetch(API + path, opt).then(function (r) {
      if (r.status === 401) throw err('revoked', 'المفتاح غير صالح');
      if (r.status === 403 && r.headers.get('x-ratelimit-remaining') !== '0') throw err('not_granted', 'المفتاح لا يملك صلاحية الكتابة');
      return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, body: j }; });
    }, function () { throw err('unavailable', 'لا اتصال'); });
  }

  var branchReady = null;
  function ensureBranch() {
    if (branchReady) return branchReady;
    branchReady = gh('GET', '/repos/' + OWNER + '/' + REPO + '/git/ref/heads/' + BRANCH).then(function (r) {
      if (r.status === 200) return true;
      return gh('GET', '/repos/' + OWNER + '/' + REPO).then(function (rr) {
        var main = (rr.body && rr.body.default_branch) || 'main';
        return gh('GET', '/repos/' + OWNER + '/' + REPO + '/git/ref/heads/' + main);
      }).then(function (m) {
        return gh('POST', '/repos/' + OWNER + '/' + REPO + '/git/refs', { ref: 'refs/heads/' + BRANCH, sha: m.body.object.sha });
      }).then(function () { return true; });
    });
    branchReady.catch(function () { branchReady = null; });
    return branchReady;
  }

  function Doc(docPath) {
    var name = String(docPath).split('/').filter(Boolean).pop() || 'data';
    var file = SITE + '/' + name + '.json';
    var url = '/repos/' + OWNER + '/' + REPO + '/contents/' + file;
    var pendKey = 'term3_pending_' + SITE + '_' + name;
    var sha = null, lastSeen = 0, chain = Promise.resolve(), listeners = [], lastPoll = 0;

    function read() {
      return gh('GET', url + '?ref=' + BRANCH).then(function (r) {
        if (r.status === 404) { sha = null; return null; }
        if (r.status !== 200) throw err('unavailable');
        sha = r.body.sha;
        try { return JSON.parse(b64decode(r.body.content)); } catch (e) { return null; }
      });
    }
    function snap(rec) {
      return {
        exists: !!rec, metadata: { hasPendingWrites: false },
        data: function () { return rec ? JSON.parse(JSON.stringify(rec.data)) : undefined; }
      };
    }
    function upload(rec, keepalive, retried) {
      return ensureBranch().then(function () {
        var body = { message: 'حفظ التقدم: ' + SITE, content: b64encode(JSON.stringify(rec)), branch: BRANCH };
        if (sha) body.sha = sha;
        return gh('PUT', url, body, keepalive);
      }).then(function (r) {
        if (r.status === 200 || r.status === 201) { sha = r.body.content && r.body.content.sha; lastSeen = rec.savedAt; return; }
        if ((r.status === 409 || r.status === 422) && !retried) return read().then(function () { return upload(rec, keepalive, true); });
        throw err('unavailable');
      });
    }
    function flushPending(keepalive) {
      var p = chain.then(function () {
        var rec = lsGet(pendKey); if (!rec || !token()) return;
        return upload(rec, keepalive).then(function () {
          var now = lsGet(pendKey); if (now && now.savedAt === rec.savedAt) lsSet(pendKey, null);
        });
      }).catch(function (e) { if (e && e.code !== 'unavailable') throw e; });
      chain = p.catch(function () {});
      return p;
    }

    var api = {
      get: function () {
        return chain.then(read).then(function (rec) {
          if (rec) lastSeen = rec.savedAt || 0;
          return snap(rec);
        });
      },
      set: function (value) {
        var rec = { savedAt: Date.now(), data: JSON.parse(JSON.stringify(value)) };
        lsSet(pendKey, rec);                 // يبقى في الجهاز حتى يُرفع فعلاً
        return flushPending();               // إن انقطع الاتصال رُفع لاحقاً تلقائياً
      },
      onSnapshot: function (cb) { listeners.push(cb); return function () { listeners = listeners.filter(function (f) { return f !== cb; }); }; }
    };

    function poll() {
      if (!listeners.length || lsGet(pendKey) || Date.now() - lastPoll < 10000) return;
      lastPoll = Date.now();
      chain.then(read).then(function (rec) {
        if (rec && (rec.savedAt || 0) !== lastSeen) {
          lastSeen = rec.savedAt || 0;
          listeners.forEach(function (f) { try { f(snap(rec)); } catch (e) {} });
        }
      }).catch(function () {});
    }
    window.addEventListener('online', function () { flushPending(); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flushPending(true); else { flushPending(); poll(); }
    });
    window.addEventListener('focus', poll);
    setTimeout(function () { flushPending(); }, 500);
    return api;
  }

  var docs = {};
  var db = { doc: function (p) { return docs[p] || (docs[p] = Doc(p)); } };
  var user = { id: function () { return Promise.resolve(OWNER); } };

  window.claude = {
    use: function (name) {
      if (!token()) return Promise.resolve(null);
      if (name === 'db') return Promise.resolve(db);
      if (name === 'user') return Promise.resolve(user);
      return Promise.resolve(null);
    }
  };

  /* ---------- النافذة المستترة: ?sync ---------- */
  function openPanel() {
    var wrap = document.createElement('div');
    wrap.setAttribute('dir', 'rtl');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,-apple-system,sans-serif';
    var has = !!token();
    wrap.innerHTML =
      '<div style="background:#fff;color:#1d1d1f;max-width:420px;width:100%;border-radius:16px;padding:20px;line-height:1.7;box-shadow:0 10px 40px rgba(0,0,0,.3)">' +
      '<div style="font-weight:700;font-size:17px;margin-bottom:6px">مزامنة التقدم</div>' +
      '<div style="font-size:13px;color:#555;margin-bottom:12px">يحفظ تقدمك في المستودع ' + OWNER + '/' + REPO + '. المفتاح يبقى في هذا المتصفح وحده.</div>' +
      '<div id="t3s-state" style="font-size:13px;margin-bottom:10px;color:' + (has ? '#1a7f37' : '#9a6700') + '">' + (has ? 'المزامنة مفعّلة في هذا الجهاز.' : 'المزامنة غير مفعّلة في هذا الجهاز.') + '</div>' +
      '<input id="t3s-in" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="ألصق المفتاح هنا" style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #ccc;border-radius:10px;font-size:16px;direction:ltr;text-align:left">' +
      '<div id="t3s-msg" style="font-size:13px;min-height:20px;margin:8px 0"></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button id="t3s-save" style="flex:1;padding:12px;border:0;border-radius:10px;background:#1d1d1f;color:#fff;font-size:15px">حفظ وتجربة</button>' +
      (has ? '<button id="t3s-del" style="padding:12px;border:1px solid #d1242f;border-radius:10px;background:#fff;color:#d1242f;font-size:15px">إزالة المفتاح</button>' : '') +
      '<button id="t3s-close" style="padding:12px;border:1px solid #ccc;border-radius:10px;background:#fff;color:#1d1d1f;font-size:15px">إغلاق</button>' +
      '</div></div>';
    document.body.appendChild(wrap);
    var msg = wrap.querySelector('#t3s-msg');
    function close(reload) {
      wrap.remove();
      try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
      if (reload) location.reload();
    }
    wrap.querySelector('#t3s-close').onclick = function () { close(false); };
    var del = wrap.querySelector('#t3s-del');
    if (del) del.onclick = function () { try { localStorage.removeItem(TOKEN_KEY); } catch (e) {} close(true); };
    wrap.querySelector('#t3s-save').onclick = function () {
      var t = wrap.querySelector('#t3s-in').value.trim();
      if (!t) { msg.style.color = '#d1242f'; msg.textContent = 'ألصق المفتاح أولاً.'; return; }
      msg.style.color = '#555'; msg.textContent = 'جارٍ التجربة...';
      fetch(API + '/repos/' + OWNER + '/' + REPO, { cache: 'no-store', headers: { 'Authorization': 'Bearer ' + t, 'Accept': 'application/vnd.github+json' } })
        .then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); })
        .then(function (r) {
          if (r.s === 401) throw new Error('المفتاح غير صحيح أو منتهي الصلاحية.');
          if (r.s !== 200) throw new Error('تعذّر الوصول إلى المستودع.');
          if (!r.j.permissions || !r.j.permissions.push) throw new Error('المفتاح لا يملك صلاحية الكتابة في المستودع.');
          try { localStorage.setItem(TOKEN_KEY, t); } catch (e) {}
          msg.style.color = '#1a7f37'; msg.textContent = 'تم الربط. ستُحدَّث الصفحة الآن.';
          setTimeout(function () { close(true); }, 1000);
        })
        .catch(function (e) { msg.style.color = '#d1242f'; msg.textContent = e.message === 'Failed to fetch' ? 'لا اتصال بالإنترنت.' : e.message; });
    };
  }
  if (/[?&]sync\b/.test(location.search)) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', openPanel); else openPanel();
  }
})();
