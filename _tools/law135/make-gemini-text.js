#!/usr/bin/env node
/* صفحة «تدقيق نص الكتاب مع جيمني»: لكل مقطع من ملفات «نص الكتاب ص A–B» رابط ملف صفحاته (PDF)،
   وزرّان ينسخان رسالتين لجيمني: الأولى بالتعليمات ونص النصف الأول، والثانية بنص النصف الثاني.
   الاستعمال: node make-gemini-text.js <مجلد ملفات النص> <مجلد الإخراج>
   يكتب <مجلد الإخراج>/index.html. ملفات الصفحات (PDF) تُرسل في المحادثة باسم «صفحات الكتاب A–B.pdf». */
'use strict';
const fs = require('fs');
const path = require('path');
const [dir, outDir] = process.argv.slice(2);
if (!dir || !outDir) { console.error('usage: node make-gemini-text.js textDir outDir'); process.exit(2); }

const MARK = /^=== ص (\d+) ===\s*$/m;
const files = fs.readdirSync(dir).filter((f) => /^نص الكتاب ص \d+–\d+\.md$/.test(f))
  .map((f) => { const m = f.match(/(\d+)–(\d+)/); return { f, a: +m[1], b: +m[2] }; })
  .sort((x, y) => x.a - y.a);

function pagesOf(text) {
  const out = [];
  const re = /^=== ص (\d+) ===\s*$/gm;
  let m; const marks = [];
  while ((m = re.exec(text))) marks.push({ n: +m[1], i: m.index });
  marks.forEach((k, j) => out.push({ n: k.n, t: text.slice(k.i, j + 1 < marks.length ? marks[j + 1].i : text.length).trimEnd() }));
  return out;
}

const BOOK = '«القانون الدولي العام – الجزء الأول» (أ.د. محمد صافي يوسف)';
function brief(a, b, x, y) {
  return [
    `أنت مدقق نصوص دقيق. أرفقتُ لك ملف PDF فيه صفحات مصوّرة من كتاب ${BOOK}، من ص ${a} إلى ص ${b}، وأول صفحة في الملف هي ص ${a}، ورقم كل صفحة مطبوع عليها.`,
    `وتحت هذه التعليمات نصُّ الصفحات من ص ${x} إلى ص ${y} منسوخاً من الكتاب، وكل صفحة فيه تبدأ بسطر «=== ص رقمها ===». وسأرسل لك بقية الصفحات في رسالة بعدها.`,
    '',
    'المطلوب: قابل النص المنسوخ بصور الصفحات كلمةً كلمة، صفحةً صفحة، واذكر كل فرق بين ما طُبع في الكتاب وما في النص. لا تعدّل النص ولا تعِد كتابته، بل اكتب تقريراً بالفروق وحدها.',
    '',
    'يُعدّ فرقاً فاذكره:',
    '1. كلمة أو جملة أو سطر في الكتاب سقط من النص.',
    '2. كلمة أو جملة في النص ليست في الكتاب، أو مكررة.',
    '3. كلمة كُتبت في النص بغير ما طُبع في الكتاب، ولو في حرف أو همزة.',
    '4. رقم أو تاريخ أو رقم مادة أو رقم صفحة مختلف.',
    '5. اسم علم أو كلمة أجنبية كُتبت بغير ما في الكتاب.',
    '6. حاشية ناقصة أو زائدة أو في غير صفحتها، أو رقم حاشية مختلف.',
    '7. عنوان ناقص أو زائد أو في غير موضعه.',
    '',
    'لا يُعدّ فرقاً فلا تذكره:',
    '- الأرقام في النص بالأرقام الغربية (1، 2، 3) وفي الكتاب بالأرقام المشرقية (١، ٢، ٣).',
    '- العناوين في النص مسبوقة بعلامات # أو بين ** **.',
    '- الحواشي في النص مجموعة تحت كلمة «حواشي:» في آخر كل صفحة.',
    '- أرقام المواد المطبوعة على شكل كسر، مثل «المادة 1/14»: مكتوبة رقم الفقرة ثم رقم المادة.',
    '- خطأ مطبعي في الكتاب نُقل كما طُبع وبعده الصواب بين معقوفين، مثل «بفرض [بغرض]».',
    '- «[صفحة بيضاء]» لصفحة خالية.',
    '- اختلاف علامات الترقيم وحدها، أو المسافات.',
    '',
    'قواعد:',
    '- المرجع ما طُبع في الكتاب ولو خالف قواعد الإملاء: إن طُبع «فى» و«الدولى» بالألف المقصورة فهذا هو الصواب، فلا تقترح تصحيح لغة الكتاب.',
    '- لا تخمّن: إن لم تتبيّن موضعاً في الصورة فقل إنه غير واضح، ولا تعدّه فرقاً.',
    '- مرّ على كل صفحة ولا تتخطّ صفحة، بمتنها وحواشيها.',
    '',
    'صيغة الرد، بالعربية، لكل صفحة سطر على الأقل:',
    'ص رقمها: لا فروق',
    'أو سطر لكل فرق بهذا الشكل:',
    'ص رقمها | في الكتاب: «...» | في النص: «...» | نوع الفرق',
    'وفي آخر الرد: عدد الفروق كلها.',
    '',
    `— نص الصفحات ص ${x}–${y} —`,
    ''
  ].join('\n');
}
function brief2(x, y) {
  return [
    `وهذا بقية النص من ص ${x} إلى ص ${y}. قابله بصور الصفحات نفسها في الملف المرفق، بالقواعد نفسها وبصيغة الرد نفسها، ومرّ على كل صفحة.`,
    '',
    `— نص الصفحات ص ${x}–${y} —`,
    ''
  ].join('\n');
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sections = files.map(({ f, a, b }) => {
  const pages = pagesOf(fs.readFileSync(path.join(dir, f), 'utf8'));
  const nums = pages.map((p) => p.n);
  for (let n = a; n <= b; n++) if (!nums.includes(n)) { console.error(`${f}: page ${n} missing`); process.exit(1); }
  const mid = Math.ceil(pages.length / 2);
  const h1 = pages.slice(0, mid), h2 = pages.slice(mid);
  const p1 = brief(a, b, h1[0].n, h1[h1.length - 1].n) + h1.map((p) => p.t).join('\n\n') + '\n';
  const p2 = brief2(h2[0].n, h2[h2.length - 1].n) + h2.map((p) => p.t).join('\n\n') + '\n';
  return { a, b, r1: `${h1[0].n}–${h1[h1.length - 1].n}`, r2: `${h2[0].n}–${h2[h2.length - 1].n}`, p1, p2 };
});

const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>تدقيق نص الكتاب مع جيمني</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap">
<style>
:root{--bg:#EBE9E2;--card:#F7F6F1;--line:#D8D5CC;--ink:#1A1B19;--sec:#63615A;--hero:#1F4A47;--hero-ink:#EEF4F1;--acc:#BFDCD6;--on-acc:#123532;--ok:#2E7A57}
@media (prefers-color-scheme: dark){:root{--bg:#111615;--card:#1A201F;--line:#2B3331;--ink:#ECF1EF;--sec:#9AA7A4;--hero:#173A38;--hero-ink:#EAF3F0;--acc:#A9D3CB;--on-acc:#10302D;--ok:#7FCBA3;color-scheme:dark}}
*{box-sizing:border-box;margin:0}
body{background:var(--bg);color:var(--ink);font-family:"Vazirmatn",system-ui,sans-serif;line-height:1.7}
.wrap{max-width:480px;margin:0 auto;padding:18px 16px 48px;display:grid;gap:14px}
h1{font-size:23px;font-weight:700}
.lead{color:var(--sec);font-size:15px}
ol.how{padding-inline-start:20px;color:var(--sec);font-size:14.5px;display:grid;gap:4px}
.card{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:16px;display:grid;gap:10px}
.card h2{font-size:19px;font-weight:700;display:flex;justify-content:space-between;align-items:center;gap:8px}
.done{font-size:13px;font-weight:600;color:var(--sec);display:flex;align-items:center;gap:6px;cursor:pointer}
.done input{width:20px;height:20px;accent-color:var(--hero)}
.card.is-done{opacity:.62}
.btn{display:block;width:100%;padding:13px 14px;border-radius:99px;border:0;background:var(--hero);color:var(--hero-ink);font:inherit;font-weight:700;font-size:15.5px;text-align:center;text-decoration:none;cursor:pointer}
.btn:focus-visible{outline:2px solid var(--ink);outline-offset:3px}
.file{font-size:14.5px;color:var(--sec);background:var(--bg);border-radius:12px;padding:8px 12px}
.msg{color:var(--ok);font-weight:600;font-size:14px;min-height:1.6em}
details{font-size:13.5px;color:var(--sec)}
details summary{cursor:pointer}
textarea{width:100%;height:30vh;margin-top:8px;border:1px solid var(--line);border-radius:14px;background:var(--bg);color:var(--ink);padding:10px;font:inherit;font-size:12.5px;line-height:1.7}
</style></head><body><div class="wrap">
<h1>تدقيق نص الكتاب مع جيمني</h1>
<p class="lead">ثمانية مقاطع، كل مقطع 32 صفحة. لكل مقطع محادثة جديدة مع جيمني:</p>
<ol class="how">
<li>ارفع ملف صفحات المقطع لجيمني في محادثة جديدة. الملفات الثمانية أرسلتها لك في المحادثة.</li>
<li>اضغط «انسخ الرسالة الأولى» والصقها مع الملف، وأرسل.</li>
<li>بعد ما يرد، اضغط «انسخ الرسالة الثانية» وأرسلها في نفس المحادثة.</li>
<li>انسخ ردّيه وأرسلهما لي، وعلّم المقطع «أرسلته».</li>
</ol>
${sections.map((s, i) => `<section class="card" id="s${s.a}">
<h2>ص ${s.a}–${s.b}<label class="done"><input type="checkbox" data-k="${s.a}">أرسلته</label></h2>
<p class="file">ملف الصفحات: «صفحات الكتاب ${s.a}–${s.b}.pdf» في المحادثة</p>
<button type="button" class="btn" data-copy="t${i}a">انسخ الرسالة الأولى (ص ${s.r1})</button>
<button type="button" class="btn" data-copy="t${i}b">انسخ الرسالة الثانية (ص ${s.r2})</button>
<p class="msg" role="status" id="m${i}"></p>
<details><summary>إن لم يعمل النسخ: النص هنا لتحدّده بيدك</summary>
<textarea id="t${i}a" readonly aria-label="الرسالة الأولى">${esc(s.p1)}</textarea>
<textarea id="t${i}b" readonly aria-label="الرسالة الثانية">${esc(s.p2)}</textarea>
</details>
</section>`).join('\n')}
</div>
<script>
(function () {
  var KEY = 'law135-gemini-text';
  var st = {};
  try { st = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { st = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  document.querySelectorAll('.done input').forEach(function (cb) {
    var k = cb.getAttribute('data-k'), card = cb.closest('.card');
    cb.checked = !!st[k]; card.classList.toggle('is-done', cb.checked);
    cb.addEventListener('change', function () { st[k] = cb.checked; save(); card.classList.toggle('is-done', cb.checked); });
  });
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var t = document.getElementById(btn.getAttribute('data-copy'));
      var m = btn.closest('.card').querySelector('.msg');
      var label = btn.textContent.indexOf('الأولى') > -1 ? 'الأولى' : 'الثانية';
      function ok() { m.textContent = 'نُسخت الرسالة ' + label + '. الصقها في جيمني.'; }
      function fallback() { t.closest('details').open = true; t.focus(); t.select(); try { document.execCommand('copy') ? ok() : (m.textContent = 'حدّد النص في المربع وانسخه بيدك.'); } catch (e) { m.textContent = 'حدّد النص في المربع وانسخه بيدك.'; } }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).then(ok, fallback); else fallback();
    });
  });
})();
</script></body></html>
`;
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log('wrote', path.join(outDir, 'index.html'), sections.map((s) => `${s.a}-${s.b}: ${s.p1.length + s.p2.length} chars`).join(', '));
