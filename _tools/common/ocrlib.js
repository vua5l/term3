/* مكتبة القراءات الآلية: تقطّع النص والقراءة الآلية كلماتٍ، وتقابل نصاً منقولاً من الكتاب بقراءات صفحته كلمةً كلمة.
   القراءة الآلية مساعد في التدقيق لا مصدر: تدلّ على موضع المنقول في صورة صفحته، وتنبّه المدقق إلى ما خالفته فيه.
   والحكم لصورة الصفحة وحدها، عند المدقق المستقل. ولا يُبنى من القراءات محتوى، ولا يُجمع منها نص للكتاب. */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./lib');

/* --- الحروف --- */
const STRIP = /[ً-ٰٟـۖ-ۭ​-‏‪-‮⁦-⁩﻿]/g;
/* توحيد خفيف لا يمسّ النقاط ولا الهمزات: يحذف التشكيل والتطويل وعلامات الاتجاه، ويوحّد صور الأرقام وأشكال العرض */
function clean(s) {
  return String(s).normalize('NFKC').replace(STRIP, '')
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/ک/g, 'ك').replace(/ی/g, 'ى');
}
const RE_TOK = /[ء-يٱ-ۓ]+|[A-Za-zÀ-ɏ]+|[0-9]+/g;
const kindOf = (w) => (/[0-9]/.test(w[0]) ? 'num' : /[A-Za-zÀ-ɏ]/.test(w[0]) ? 'lat' : 'ar');
/* رسم الكلمة بلا نقاط ولا همزات: كلمتان تساوى رسمهما واختلف لفظهما تختلفان في النقاط أو الهمزات وحدها */
const SK = {};
[['بتثنيىئپٮ', 'ب'], ['جحخچ', 'ح'], ['دذ', 'د'], ['رزژ', 'ر'], ['سش', 'س'], ['صض', 'ص'], ['طظ', 'ط'], ['عغ', 'ع'], ['فقڤ', 'ف'], ['كگ', 'ك'], ['هة', 'ه'], ['وؤ', 'و'], ['اأإآٱ', 'ا']]
  .forEach(([g, r]) => { for (const c of g) SK[c] = r; });
function skel(w) { let o = ''; for (const c of w) { if (c !== 'ء') o += SK[c] || c; } return o; }
/* كلمات من نص خام: w اللفظ بعد التوحيد الخفيف، وsk رسمه، وk نوعه (ar عربي · lat أجنبي · num رقم)، وp إن تلتها فاصلة */
function words(raw) {
  const out = [], s = clean(raw);
  RE_TOK.lastIndex = 0;
  let m;
  while ((m = RE_TOK.exec(s))) {
    const x = m[0], k = kindOf(x), w = k === 'lat' ? x.toLowerCase() : x, nx = s[m.index + x.length];
    out.push({ k, w, sk: k === 'ar' ? skel(w) : w, p: nx === '،' || nx === ',' });
  }
  return out;
}
/* القراءة الآلية تقرأ الفاصلة بعد الكلمة همزةً ملتصقة بها («عليها،» ← «عليهاء»): إن كان في المنقول فاصلة وليس في القراءة فاصلة فاللفظان واحد */
const same = (t, o) => t.w === o.w || (t.p && !o.p && o.w.length === t.w.length + 1 && o.w.endsWith('ء') && o.w.startsWith(t.w));

/* المسافة بين لفظين، وتقف عند max */
function lev(a, b, max) {
  const n = a.length, m = b.length;
  if (Math.abs(n - m) > max) return max + 1;
  let prev = new Array(m + 1), cur = new Array(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j;
  for (let i = 1; i <= n; i++) {
    cur[0] = i; let lo = cur[0];
    for (let j = 1; j <= m; j++) {
      const c = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur[j] = c; if (c < lo) lo = c;
    }
    if (lo > max) return max + 1;
    const t = prev; prev = cur; cur = t;
  }
  return prev[m];
}
/* لفظان متقاربان: القراءة الآلية أخطأت في حرف أو حرفين من كلمة طويلة */
function near(a, b) {
  const len = Math.max(a.length, b.length);
  if (len < 4) return false;
  const max = len >= 9 ? 3 : len >= 6 ? 2 : 1;
  return lev(a, b, max) <= max;
}

/* --- القراءة الآلية --- */
/* ملف tsv من tesseract: كلمات بمواضعها في صورة الصفحة. scale يردّ المواضع إلى مقياس الصورة الأساس إن قُرئت بدقة أخرى */
function readTsv(file, scale) {
  const k = scale || 1, toks = [], lines = [];
  let page = null, lineKey = '', li = -1, wi = 0;
  fs.readFileSync(file, 'utf8').split('\n').forEach((row, r) => {
    if (!r || !row) return;
    const c = row.split('\t');
    if (c[0] === '1') page = { w: Math.round(+c[8] * k), h: Math.round(+c[9] * k) };
    if (c[0] !== '5') return;
    const text = c.slice(11).join('\t');
    const ws = words(text);
    if (!ws.length) return;
    const key = c[2] + '.' + c[3] + '.' + c[4];
    if (key !== lineKey) { lineKey = key; li = lines.length; lines.push({ from: toks.length, to: toks.length, x0: 1e9, y0: 1e9, x1: 0, y1: 0 }); }
    const box = { x: Math.round(+c[6] * k), y: Math.round(+c[7] * k), w: Math.round(+c[8] * k), h: Math.round(+c[9] * k) };
    const ln = lines[li];
    ln.x0 = Math.min(ln.x0, box.x); ln.y0 = Math.min(ln.y0, box.y); ln.x1 = Math.max(ln.x1, box.x + box.w); ln.y1 = Math.max(ln.y1, box.y + box.h);
    wi++;
    ws.forEach((w) => { w.box = box; w.line = li; w.word = wi; w.raw = text; w.conf = +c[10]; toks.push(w); ln.to = toks.length; });
  });
  return { toks, lines, page };
}

/* --- المقابلة كلمةً كلمة --- */
const GT = 1, GO = 1;        /* كلفة كلمة في المنقول بلا مقابل، وكلمة في القراءة بلا مقابل */
function pairScore(t, o) {
  if (t.k !== o.k) return -1.5;
  if (same(t, o)) return t.w.length === 1 ? 2 : 4;
  if (t.k !== 'ar') return near(t.w, o.w) ? 1.5 : -1.5;
  if (t.sk === o.sk && t.sk.length > 1) return 3;
  return near(t.w, o.w) ? 1.5 : -1.5;
}
/* يقابل كلمات المنقول T بكلمات القراءة O، ويسمح بكلمة ملتصقة (كلمة في القراءة = كلمتان إلى أربع في المنقول) وبكلمة مقطوعة (العكس).
   يردّ لكل كلمة في المنقول ما قابلها: t نوع المقابلة (eq مطابق · var يخالف في النقاط أو الهمزات · near متقارب · sub مختلف · none لا شيء)،
   وo مواضع ما قابلها في القراءة، وf اللفظ الذي قرأته القراءة في موضعها، وglue إن كانت جزءاً من كلمة ملتصقة.
   وextra: ما في القراءة بلا مقابل، مفهرساً بعدد كلمات المنقول التي قبله. */
function align(T, O) {
  const n = T.length, m = O.length, W = m + 1;
  const dp = new Float32Array((n + 1) * W), bp = new Uint8Array((n + 1) * W);
  const tw = new Int32Array(n + 1), ts = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) { tw[i + 1] = tw[i] + T[i].w.length; ts[i + 1] = ts[i] + T[i].sk.length; }
  const cat = (A, a, b, key) => { let s = ''; for (let i = a; i < b; i++) s += A[i][key]; return s; };
  for (let i = 1; i <= n; i++) { dp[i * W] = -i * GT; bp[i * W] = 1; }
  for (let j = 1; j <= m; j++) { dp[j] = -j * GO; bp[j] = 2; }
  for (let i = 1; i <= n; i++) {
    const t = T[i - 1];
    for (let j = 1; j <= m; j++) {
      const o = O[j - 1];
      let best = dp[(i - 1) * W + j - 1] + pairScore(t, o), mv = 0, s;
      s = dp[(i - 1) * W + j] - GT; if (s > best) { best = s; mv = 1; }
      s = dp[i * W + j - 1] - GO; if (s > best) { best = s; mv = 2; }
      if (o.k === 'ar') {
        for (let k = 2; k <= 4 && k <= i; k++) {                      /* كلمة ملتصقة */
          let g = -1;
          if (tw[i] - tw[i - k] === o.w.length && cat(T, i - k, i, 'w') === o.w) g = 4 * k - 1;
          else if (ts[i] - ts[i - k] === o.sk.length && cat(T, i - k, i, 'sk') === o.sk) g = 3 * k - 1;
          if (g > 0) { s = dp[(i - k) * W + j - 1] + g; if (s > best) { best = s; mv = 1 + k; } }
        }
      }
      if (t.k === 'ar' && t.w.length > 2) {
        for (let k = 2; k <= 3 && k <= j; k++) {                      /* كلمة مقطوعة */
          let g = -1, lw = 0, ls = 0, ok = true;
          for (let q = j - k; q < j; q++) { if (O[q].k !== 'ar') ok = false; lw += O[q].w.length; ls += O[q].sk.length; }
          if (!ok) continue;
          if (lw === t.w.length && cat(O, j - k, j, 'w') === t.w) g = 3.5;
          else if (ls === t.sk.length && cat(O, j - k, j, 'sk') === t.sk) g = 2.5;
          if (g > 0) { s = dp[(i - 1) * W + j - k] + g; if (s > best) { best = s; mv = 4 + k; } }
        }
      }
      dp[i * W + j] = best; bp[i * W + j] = mv;
    }
  }
  const res = new Array(n), extra = {};
  let i = n, j = m;
  while (i > 0 || j > 0) {
    const mv = bp[i * W + j];
    if (mv === 0) {
      const t = T[i - 1], o = O[j - 1];
      const ty = t.k !== o.k ? 'sub' : same(t, o) ? 'eq' : (t.k === 'ar' && t.sk === o.sk && t.sk.length > 1) ? 'var' : near(t.w, o.w) ? 'near' : 'sub';
      res[i - 1] = { t: ty, o: [j - 1], f: o.w }; i--; j--;
    } else if (mv === 1) { res[i - 1] = { t: 'none', o: [], f: '' }; i--; }
    else if (mv === 2) { (extra[i] = extra[i] || []).unshift(j - 1); j--; }
    else if (mv <= 5) {
      const k = mv - 1, o = O[j - 1];
      const exact = tw[i] - tw[i - k] === o.w.length && cat(T, i - k, i, 'w') === o.w;
      let at = 0;
      for (let q = i - k; q < i; q++) {
        const len = T[q].w.length, part = tw[i] - tw[i - k] === o.w.length ? o.w.slice(at, at + len) : '';
        at += len;
        res[q] = { t: exact || part === T[q].w ? 'eq' : 'var', o: [j - 1], f: part || o.w, glue: true };
      }
      i -= k; j--;
    } else {
      const k = mv - 4, f = cat(O, j - k, j, 'w'), o = [];
      for (let q = j - k; q < j; q++) o.push(q);
      res[i - 1] = { t: f === T[i - 1].w ? 'eq' : 'var', o, f, split: true }; i--; j -= k;
    }
  }
  return { res, extra };
}

/* هل اللفظ f كلمات من المعجم ملتصقة فيها كلمة المنقول w وزيادة عليها؟ يردّ الزيادة (كسقوط «لا» عند الباني) أو null */
function glueExtra(f, w, lex) {
  const at = f.indexOf(w);
  if (at < 0 || f.length - w.length < 2) return null;
  const seg = (s) => {                       /* يقطّع s كلماتٍ من المعجم، كل واحدة حرفان فأكثر */
    if (!s) return [];
    for (let k = Math.min(s.length, 12); k >= 2; k--) {
      if (lex.has(s.slice(0, k))) { const rest = seg(s.slice(k)); if (rest) return [s.slice(0, k)].concat(rest); }
    }
    return null;
  };
  const a = seg(f.slice(0, at)), b = seg(f.slice(at + w.length));
  return a && b && a.length + b.length ? a.concat(b) : null;
}

/* --- قراءات صفحة من مجلد العمل (ما كتبته pages.js) --- */
const cache = {};
/* يردّ { img, R } أو null إن لم تُجهَّز الصفحة. R: قراءاتها بمقياس الصورة الأساس، لكل واحدة name وtoks وlines وpage. وimg مسار صورتها أو null */
function pageReadings(S, work, p) {
  const key = work + '|' + p;
  if (key in cache) return cache[key];
  const img = path.join(work, 'p' + p + '.png'), R = [];
  S.scan.readings.forEach((r) => {
    const f = path.join(work, 'p' + p + '.' + r.name + '.tsv');
    if (!fs.existsSync(f)) return;
    const rd = readTsv(f, S.scan.dpi / r.dpi);
    rd.name = r.name; R.push(rd);
  });
  return (cache[key] = R.length ? { img: fs.existsSync(img) ? img : null, R } : null);
}

/* --- مقابلة المنقول بقراءات صفحته: كشف أولي لا حكم --- */
/* أدوات قصيرة تلصقها القراءة الآلية بما بعدها: إن وُجدت ملتصقةً بكلمة من المنقول وليست فيه نُبّه إليها (كسقوط «لا» عند الباني) */
const PARTICLES = new Set('لا لم لن ما أو أم في من عن إن أن قد بل ثم كل غير إلا هو هي كان ليس على إلى بين دون بعد قبل عند حتى إذا لو هل بلا فلا ولا ولم ولن وما وقد فقد وإن وأن ولو'.split(' '));
const HIT = { eq: 1, var: 1, near: 1 };
/* أقرب نافذة لكلمات T في قراءة O، ثم مقابلتها بها كلمةً كلمة */
function fit(T, O) {
  if (!T.length || !O.length) return null;
  const need = {}; T.forEach((t) => { need[t.sk] = (need[t.sk] || 0) + 1; });
  const span = Math.min(O.length, T.length + Math.max(4, Math.ceil(T.length * 0.3)));
  let best = -1, at = 0;
  for (let j = 0; j + span <= O.length; j++) {
    const got = {}; let n = 0;
    for (let q = j; q < j + span; q++) { const k = O[q].sk; if (need[k] && (got[k] = (got[k] || 0) + 1) <= need[k]) n++; }
    if (n > best) { best = n; at = j; }
  }
  const win = O.slice(at, at + span), al = align(T, win);
  let hits = 0; al.res.forEach((r) => { if (HIT[r.t]) hits++; });
  return { win, al, hits };
}
/* كلمات T في صفحة p: تُقابل بكل قراءة لها. يردّ موضعها في الصورة box، وratio حصة ما وُجد منها، وhit لكل كلمة، وflags ما يُنبَّه إليه:
     dots   قراءةٌ قرأتها بنقاط أو همزات أخرى، ولو أكدتها غيرها
     glue   قراءةٌ قرأتها ملتصقة بأداة ليست في المنقول
     extra  كلمة بين كلماته في قراءتين وليست فيه (أو أداة في قراءة واحدة): لعلها سقطت عند النقل
     other  لم تؤكدها قراءة، وقُرئ في موضعها غيرها · unread لم تُقرأ في موضعها أصلاً
   وstrong ما يُنبَّه إليه الباني: غلط القراءة الآلية حروف بلا معنى في الغالب، فلا يُعدّ قوياً من dots وother إلا ما قُرئ كلمةً صحيحة أخرى
   (من معجم lex، وهو كلمات الدفعة نفسها) أو اتفقت عليه قراءتان. والمدقق يرى الكل. */
function judge(S, work, T, p, lex) {
  const pg = pageReadings(S, work, p);
  if (!pg) return null;
  const fits = pg.R.map((rd) => fit(T, rd.toks)), live = [];
  let top = -1;
  fits.forEach((f, x) => { if (!f) return; live.push(x); if (top < 0 || f.hits > fits[top].hits) top = x; });
  if (top < 0) return null;
  const n = T.length, hit = T.map((t, i) => live.some((x) => HIT[fits[x].al.res[i].t]));
  const tokOf = (i) => { for (const x of [top].concat(live)) { const r = fits[x].al.res[i]; if (r.o.length) return fits[x].win[r.o[0]]; } return null; };
  const boxes = [];
  fits[top].al.res.forEach((r) => { if (HIT[r.t]) r.o.forEach((j) => boxes.push(fits[top].win[j].box)); });
  if (!boxes.length) return null;
  const x0 = Math.min(...boxes.map((b) => b.x)), y0 = Math.min(...boxes.map((b) => b.y));
  const box = { x: x0, y: y0, w: Math.max(...boxes.map((b) => b.x + b.w)) - x0, h: Math.max(...boxes.map((b) => b.y + b.h)) - y0 };
  const read = (i) => live.map((x) => { const r = fits[x].al.res[i]; return pg.R[x].name + ' «' + (r.t === 'eq' ? T[i].w : r.f || '∅') + '»'; }).join(' · ');
  const flags = [];
  T.forEach((t, i) => {
    const rs = live.map((x) => fits[x].al.res[i]);
    let kind = '', extra = null;
    if (t.k === 'ar' && rs.some((r) => r.t === 'var')) kind = 'dots';
    if (!kind && t.k === 'ar' && t.w.length > 1) {
      for (const r of rs) { if (r.t !== 'eq' && r.t !== 'none' && r.f && !r.split) { extra = glueExtra(r.f, t.w, PARTICLES); if (extra) { kind = 'glue'; break; } } }
    }
    if (!kind && !rs.some((r) => r.t === 'eq')) kind = rs.every((r) => r.t === 'none') ? 'unread' : 'other';
    if (!kind) return;
    const o = tokOf(i), alt = rs.filter((r) => r.t !== 'eq' && r.f).map((r) => r.f);
    const strong = kind === 'dots' ? (lex ? rs.some((r) => r.t === 'var' && lex.has(r.f)) : true)
      : kind === 'other' ? alt.some((f, x) => alt.indexOf(f) !== x) || (!!lex && alt.some((f) => lex.has(f))) : true;
    flags.push({ i, w: t.w, k: t.k, kind, strong, read: read(i), extra, box: o ? o.box : null });
  });
  const seen = new Set();
  live.forEach((x) => {
    const ex = fits[x].al.extra;
    Object.keys(ex).forEach((g) => {
      if (+g <= 0 || +g >= n) return;                        /* ما قبل النص وما بعده من النافذة ليس منه */
      ex[g].forEach((j) => {
        const o = fits[x].win[j];
        if (o.k !== 'ar' || o.w.length < 2 || seen.has(g + '|' + o.sk)) return;
        const also = live.some((y) => y !== x && [+g, +g - 1, +g + 1].some((gg) => (fits[y].al.extra[gg] || []).some((jy) => fits[y].win[jy].sk === o.sk)));
        if (!also && !PARTICLES.has(o.w)) return;
        seen.add(g + '|' + o.sk);
        flags.push({ i: +g, w: o.w, k: 'ar', kind: 'extra', strong: true, after: T[+g - 1].w, read: '', extra: null, box: o.box });
      });
    });
  });
  flags.sort((a, b) => a.i - b.i);
  return { page: p, ratio: hit.filter(Boolean).length / n, hit, box, flags };
}
/* يضع كلمات T في أوفى صفحة من ready، وما لم يُقرأ من أوله أو آخره يُبحث عنه في الصفحة المجاورة (نص يعبر من صفحة إلى التي بعدها) */
function place(S, work, T, ready, off, lex) {
  let best = null;
  ready.forEach((p) => { const j = judge(S, work, T, p, lex); if (j && (!best || j.ratio > best.ratio)) best = j; });
  if (!best || best.ratio < 0.5) return null;
  const n = T.length, pieces = [], flags = [];
  let lead = 0, trail = 0;
  while (lead < n && !best.hit[lead]) lead++;
  while (trail < n - lead && !best.hit[n - 1 - trail]) trail++;
  const take = (j, base) => { pieces.push({ page: j.page, box: j.box, marks: j.flags.filter((f) => f.box).map((f) => f.box) }); j.flags.forEach((f) => { f.i += base; flags.push(f); }); };
  let a = 0, b = n, head = null, tail = null;
  if (lead >= 3 && ready.includes(best.page - 1)) { head = judge(S, work, T.slice(0, lead), best.page - 1, lex); if (head && head.ratio >= 0.5) a = lead; else head = null; }
  if (trail >= 3 && ready.includes(best.page + 1)) { tail = judge(S, work, T.slice(n - trail), best.page + 1, lex); if (tail && tail.ratio >= 0.5) b = n - trail; else tail = null; }
  const mid = a === 0 && b === n ? best : judge(S, work, T.slice(a, b), best.page, lex);
  if (head) take(head, off);
  if (mid) take(mid, off + a);
  if (tail) take(tail, off + b);
  return { pieces, flags };
}
/* نص منقول بصفحته (رقم، أو مدى «130–131»). ما بين معقوفين تصحيح من الموقع لا من الكتاب، وعلامة الحذف (...) تقسمه مقاطع تُقابل واحداً واحداً.
   lex (اختياري): معجم الكلمات الصحيحة، وهو كلمات الدفعة نفسها.
   يردّ { found: false, why } (وunready صفحاته إن لم تُجهَّز)، أو { found: true, pieces: [{ page, box, marks }], flags, sure } وsure إن لم يُنبَّه إلى شيء. */
function checkQuote(S, work, pages, text, lex) {
  const sp = L.span(pages);
  if (!sp) return { found: false, why: 'no page' };
  const segs = String(text || '').replace(/\s*\[[^\]]+\]/g, ' ').split(/\(\s*\.\.\.\s*\)|\(\s*…\s*\)|…|\.\.\./).map(words).filter((T) => T.length);
  if (!segs.length) return { found: false, why: 'no words' };
  const all = []; for (let p = sp[0]; p <= Math.min(sp[1], sp[0] + 3); p++) all.push(p);
  const ready = all.filter((p) => pageReadings(S, work, p));
  if (!ready.length) return { found: false, unready: all, why: 'page ' + all.join(', ') + ' is not prepared in the work dir' };
  const pieces = [], flags = [];
  let off = 0;
  segs.forEach((T) => {
    const got = place(S, work, T, ready, off, lex);
    if (got) { got.pieces.forEach((x) => pieces.push(x)); got.flags.forEach((f) => flags.push(f)); }
    else flags.push({ i: off, w: T.slice(0, 4).map((t) => t.w).join(' '), k: 'ar', kind: 'lost', strong: true, read: '', extra: null, box: null });
    off += T.length;
  });
  if (!pieces.length) return { found: false, why: 'not found on page ' + ready.join(', ') };
  return { found: true, pieces, flags, sure: flags.length === 0, n: off };
}
/* ما يُنبَّه إليه بكلمات يقرؤها المدقق والباني */
function say(f) {
  if (f.kind === 'dots') return '«' + f.w + '» بنقاط أو همزات أخرى في قراءة (' + f.read + ')';
  if (f.kind === 'glue') return '«' + f.w + '»: قُرئت ملتصقة بـ«' + f.extra.join(' ') + '» وليست في المنقول (' + f.read + ')';
  if (f.kind === 'extra') return 'بعد «' + f.after + '»: في القراءة الآلية «' + f.w + '» وليست في المنقول';
  if (f.kind === 'unread') return '«' + f.w + '» لم تُقرأ في موضعها';
  if (f.kind === 'lost') return 'لم يُعثر في الصفحة على «' + f.w + '…»';
  return '«' + f.w + '» لم تؤكدها قراءة (' + f.read + ')';
}

module.exports = { clean, words, same, skel, kindOf, lev, near, readTsv, align, glueExtra, pageReadings, checkQuote, say, PARTICLES, L };
