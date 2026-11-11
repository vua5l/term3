/* مكتبة تدقيق النسخ: تقطّع النص المنسوخ والقراءة الآلية كلماتٍ، وتقابل بينهما كلمةً كلمة، وتحكم على كل موضع.
   القاعدة من مهارة البناء: ما أكدته إحدى القراءات يُقبل · الكلمة الملتصقة تُفكّ وتُقابل أجزاؤها بالمنسوخ ·
   وإن قرأت قراءةٌ الموضعَ كلمةً صحيحة تخالف المنسوخ في النقاط أو الهمزات رُجع إلى الصورة ولو أكدته الأخرى ·
   وما كان حروفاً بلا معنى فمن أغلاط القراءة الآلية · وكل موضع بعد ذلك يُرجع فيه إلى الصورة.
   «الكلمة الصحيحة» هنا: كلمة وردت في النص المنسوخ نفسه (أو في قائمة تُعطى بـ --lexicon)، أو اتفقت عليها القراءتان. */
'use strict';
const fs = require('fs');
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
/* القراءة الآلية تقرأ الفاصلة بعد الكلمة همزةً ملتصقة بها («عليها،» ← «عليهاء»): إن كان في المنسوخ فاصلة وليس في القراءة فاصلة فاللفظان واحد */
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

/* --- النص المنسوخ --- */
/* كلمات صفحة من النص المنسوخ: sec المتن body أو الحواشي fn، وline رقم سطرها في الصفحة */
function pageWords(S, text) {
  const toks = [], lines = [];
  let sec = 'body';
  String(text).split('\n').forEach((ln) => {
    let s = ln, here = sec;
    if (S.text.pageMark === 'eq') {
      if (/^حواشي:\s*$/.test(s.trim())) { sec = 'fn'; return; }
    } else {
      const m = s.match(/^\s*\[هامش[^\]]*\]\s*(.*)$/);
      if (m) { s = m[1]; here = 'fn'; }
    }
    s = s.replace(/^#+\s*/, '').replace(/\*\*/g, ' ');
    if (/^\[\s*صفحة[^\]]*\]$/.test(s.trim())) return;          /* ملاحظة الناسخ «[صفحة بيضاء]» ليست من نص الكتاب */
    const ws = words(s);
    if (!ws.length) return;
    const li = lines.length;
    lines.push({ sec: here, text: s.trim(), from: toks.length, to: toks.length + ws.length });
    ws.forEach((w) => { w.sec = here; w.line = li; toks.push(w); });
  });
  return { toks, lines };
}
/* معجم الكلمات الصحيحة: كل لفظ عربي ورد في النص المنسوخ، وما في ملف --lexicon إن أُعطي */
function lexicon(S, pages, extraFile) {
  const lex = new Set();
  Object.keys(pages).forEach((p) => pageWords(S, pages[p]).toks.forEach((t) => { if (t.k === 'ar') lex.add(t.w); }));
  if (extraFile) words(fs.readFileSync(extraFile, 'utf8')).forEach((t) => { if (t.k === 'ar') lex.add(t.w); });
  return lex;
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
    ws.forEach((w) => { w.box = box; w.line = li; w.word = wi; w.raw = text; toks.push(w); ln.to = toks.length; });
  });
  return { toks, lines, page };
}

/* --- المقابلة كلمةً كلمة --- */
const GT = 1, GO = 1;        /* كلفة كلمة في المنسوخ بلا مقابل، وكلمة في القراءة بلا مقابل */
function pairScore(t, o) {
  if (t.k !== o.k) return -1.5;
  if (same(t, o)) return t.w.length === 1 ? 2 : 4;
  if (t.k !== 'ar') return near(t.w, o.w) ? 1.5 : -1.5;
  if (t.sk === o.sk && t.sk.length > 1) return 3;
  return near(t.w, o.w) ? 1.5 : -1.5;
}
/* يقابل كلمات المنسوخ T بكلمات القراءة O، ويسمح بكلمة ملتصقة (كلمة في القراءة = كلمتان إلى أربع في المنسوخ) وبكلمة مقطوعة (العكس).
   يردّ لكل كلمة في المنسوخ ما قابلها: t نوع المقابلة (eq مطابق · var يخالف في النقاط أو الهمزات · near متقارب · sub مختلف · none لا شيء)،
   وo مواضع ما قابلها في القراءة، وf اللفظ الذي قرأته القراءة في موضعها، وglue إن كانت جزءاً من كلمة ملتصقة.
   وextra: ما في القراءة بلا مقابل، مفهرساً بعدد كلمات المنسوخ التي قبله. */
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

/* هل اللفظ f كلمات من المعجم ملتصقة فيها كلمة المنسوخ w وزيادة عليها؟ يردّ الزيادة (كسقوط «لا» عند الناسخ) أو null */
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

/* حكم قراءة واحدة على كلمة عربية في المنسوخ:
   C أكدتها · V خالفتها في النقاط أو الهمزات (ok: اللفظ المقروء كلمة صحيحة) · X كلمة ملتصقة فيها زيادة على المنسوخ ·
   D قرأت كلمة صحيحة أخرى · G حروف بلا معنى · N لم تقرأ في الموضع شيئاً */
function verdict(t, r, lex) {
  if (r.t === 'eq') return { c: 'C' };
  if (r.t === 'none') return { c: 'N' };
  if (r.t === 'var') return { c: 'V', f: r.f, ok: lex.has(r.f) };
  if (lex.has(r.f)) return { c: 'D', f: r.f };
  const ex = !r.split && t.w.length > 1 ? glueExtra(r.f, t.w, lex) : null;
  if (ex) return { c: 'X', f: r.f, extra: ex };
  return { c: 'G', f: r.f };
}

/* يحكم على صفحة: المنسوخ T، والقراءات R (كل واحدة { toks, lines, page }، اثنتان في الأصل)، ومعجم الكتاب lex، والمعجم الواسع wide إن وُجد.
   يردّ لكل كلمة حالها: ok مؤكدة · img يُرجع فيها إلى الصورة (وسببه why) · open غير مؤكدة وقُبلت بلا صورة.
   أسباب الرجوع إلى الصورة:
     dots   قراءةٌ قرأت كلمة صحيحة تخالف المنسوخ في النقاط أو الهمزات، ولو أكدته الأخرى
     glue   كلمة ملتصقة فُكّت فخالفت أجزاؤها المنسوخ (زيادة عليه، كسقوط «لا»)
     agree  لم تؤكده قراءة، واتفقت قراءتان على لفظ واحد غيره هو كلمة صحيحة في المعجم الواسع
     word   لم تؤكده قراءة، وقرأت إحداهما كلمة صحيحة أخرى
     absent لم تؤكده قراءة، ولم تقرأ أي قراءة في موضعه شيئاً (زيادة عند الناسخ، أو سطر فات القراءتين)
   وما اتفقت فيه قراءتان على لفظ ليس كلمة (خطأ قراءة يتكرر في الإعدادين) يبقى open وعليه tag: 'agree'.
   ويردّ missed: ما قرأته قراءتان معاً ولم يكتبه الناسخ. */
function judgePage(T, R, lex, wide) {
  const al = R.map((r) => align(T, r.toks));
  const st = T.map((t, i) => {
    if (t.k !== 'ar') {
      const v = al.map((a) => (a.res[i].t === 'eq' ? 'C' : a.res[i].t === 'none' ? 'N' : 'G'));
      return { s: v.includes('C') ? 'ok' : 'open', conf: v.includes('C'), why: '', v, f: al.map((a) => a.res[i].f) };
    }
    const vs = al.map((a) => verdict(t, a.res[i], lex));
    const conf = vs.some((x) => x.c === 'C');
    const alt = vs.filter((x) => x.f);
    const both = conf ? null : alt.find((x, n) => alt.findIndex((y) => y.f === x.f) !== n);       /* لفظ اتفقت عليه قراءتان */
    let why = '', tag = '';
    if (vs.some((x) => x.c === 'V' && x.ok)) why = 'dots';
    else if (vs.some((x) => x.c === 'X')) why = 'glue';
    else if (both && (lex.has(both.f) || (wide && wide.has(both.f)))) why = 'agree';
    else if (!conf && vs.some((x) => x.c === 'D')) why = 'word';
    else if (!conf && vs.every((x) => x.c === 'N')) why = 'absent';
    else if (both) tag = 'agree';
    const ex = vs.find((x) => x.extra);
    return { s: why ? 'img' : conf ? 'ok' : 'open', conf, why, tag, v: vs.map((x) => x.c), f: vs.map((x) => (x.c === 'C' ? t.w : x.f || '')), extra: ex ? ex.extra : null };
  });
  /* ما قرأته قراءتان معاً ولم يكتبه الناسخ: كلمة عربية بلا مقابل في المنسوخ، قرأتها قراءتان بلفظ واحد في الفجوة نفسها أو المجاورة.
     ولا تُعدّ إلا في سطر مقروء قراءةً سليمة: سطر أجنبي قُرئ حروفاً عربية بلا معنى ليس سقطاً عند الناسخ. */
  const sound = R.map((r, x) => {
    const hit = new Set();
    al[x].res.forEach((a) => { if (a.t === 'eq' || a.t === 'var') a.o.forEach((j) => hit.add(j)); });
    return r.lines.map((ln) => {
      let n = 0, good = 0;
      for (let j = ln.from; j < ln.to; j++) { const o = r.toks[j]; if (o.k !== 'ar') continue; n++; if (hit.has(j) || (o.w.length > 1 && lex.has(o.w))) good++; }
      return n > 0 && good / n >= 0.6;
    });
  });
  const missed = [];
  for (let x = 0; x < R.length; x++) {
    for (let y = x + 1; y < R.length; y++) {
      const used = new Set();
      Object.keys(al[x].extra).forEach((g) => {
        al[x].extra[g].forEach((jx) => {
          const o = R[x].toks[jx];
          if (o.k !== 'ar' || o.w.length < 2 || !(lex.has(o.w) || o.w.length >= 3) || !sound[x][o.line]) return;
          if (missed.some((m) => m.gap === +g && m.w === o.w && m.r !== x)) return;
          for (const gg of [+g, +g - 1, +g + 1]) {
            const hit = (al[y].extra[gg] || []).find((jy) => !used.has(jy) && R[y].toks[jy].w === o.w);
            if (hit !== undefined) { used.add(hit); missed.push({ gap: +g, w: o.w, r: x, j: jx, inLex: lex.has(o.w) }); break; }
          }
        });
      });
    }
  }
  return { st, al, missed };
}

/* المعجم الواسع: قائمة كلمات القراءة الآلية نفسها، تُستخرج من ملف لغتها مرة وتُحفظ في مجلد العمل. يردّ null إن تعذّر استخراجها. */
function wideLexicon(S, workDir, file) {
  const { spawnSync } = require('child_process');
  const path = require('path');
  const out = file || path.join(workDir, 'wide-lexicon.txt');
  if (!file && !fs.existsSync(out)) {
    const m = S.copy.readings[0].args.match(/(?:^|\s)-l\s+([A-Za-z_]+)/);
    const ls = spawnSync('tesseract', ['--list-langs'], { encoding: 'utf8' });
    const dir = !ls.error && ((ls.stdout || '') + (ls.stderr || '')).match(/"([^"]+)"/);
    const data = m && dir ? path.join(dir[1], m[1] + '.traineddata') : '';
    if (!data || !fs.existsSync(data)) return null;
    const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'wide-'));
    const a = spawnSync('combine_tessdata', ['-u', data, path.join(tmp, 'x.')], { encoding: 'utf8' });
    const b = a.error ? a : spawnSync('dawg2wordlist', [path.join(tmp, 'x.lstm-unicharset'), path.join(tmp, 'x.lstm-word-dawg'), path.join(tmp, 'words.txt')], { encoding: 'utf8' });
    const ok = !b.error && fs.existsSync(path.join(tmp, 'words.txt'));
    let kept = false;
    if (ok && fs.existsSync(workDir)) { fs.copyFileSync(path.join(tmp, 'words.txt'), out); kept = true; }
    fs.rmSync(tmp, { recursive: true, force: true });
    if (!kept) return null;
  }
  if (!fs.existsSync(out)) return null;
  const set = new Set();
  words(fs.readFileSync(out, 'utf8')).forEach((t) => { if (t.k === 'ar' && t.w.length > 1) set.add(t.w); });
  return set.size ? set : null;
}

module.exports = { clean, words, same, skel, wideLexicon, kindOf, lev, near, pageWords, lexicon, readTsv, align, glueExtra, verdict, judgePage, L };
