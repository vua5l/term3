#!/usr/bin/env node
/* صفحة «نسخة جيمني» لدفعة: تعليمات المراجعة بالعربية ثم نسخة المراجعة، وزر ينسخ الكل ليُلصق في جيمني.
   الاستعمال: node make-gemini.js <review-cN.md> <رقم الدفعة> <الدروس كما تُعرض> > gemini-bN.html */
'use strict';
const fs = require('fs');
const [file, batch, lessons] = process.argv.slice(2);
if (!file) { console.error('usage: node make-gemini.js review.md batchNo "lessons"'); process.exit(2); }
const review = fs.readFileSync(file, 'utf8');
const brief = [
  'أنت مراجع مستقل. طالب قانون سعودي يذاكر لاختبار «القانون الدولي العام 1» (الاختبار الفصلي الثاني)، وكُتب له محتوى مذاكرة من كتابه المقرر. ما تحت هذه التعليمات «نسخة مراجعة»: لكل درس نص الكتاب لصفحاته منقولاً حرفياً، ثم ما كُتب بعبارة الكاتب: فقرات الملخص، والبطاقات، والأسئلة الموضوعية بجوابها المعتمد (معلَّم [المعتمد]) ونوع الخطأ الذي بُني عليه كل خيار خاطئ بين قوسين، والأسئلة المقالية بنقاط أجوبتها النموذجية، وصف «الفرق الجوهري» في جداول المقارنة.',
  '',
  'المطلوب: ابحث عن أخطاء هذا المحتوى، ولا تعدّله بنفسك، بل اكتب تقريراً.',
  '',
  'قواعد الحكم (ثابتة):',
  '1. احكم بنص الكتاب المرفق وحده، لا بمعرفتك العامة ولا بما اشتهر.',
  '2. رأي المؤلف هو المرجع وإن خالف المشهور، فلا تكتب ملاحظة عليه، ولا تطلب تغيير جواب بُني عليه.',
  '3. كل ملاحظة لا بد أن يكون معها نص من الكتاب المرفق يثبتها برقم صفحته، وما لا تجد له نصاً فلا تكتبه.',
  '',
  'ما تفحصه (ما كُتب بعبارة الكاتب وحده):',
  '- صحة الجواب المعتمد بحسب الكتاب، وأن الخيارات الأخرى خاطئة فعلاً، فلا يكون للسؤال جوابان.',
  '- في «بيّن مدى صحة العبارة»: صحة الحكم، وأن التعليل يذكر سبب الكتاب صحيحاً كاملاً بما يكفي للدرجة الكاملة.',
  '- ألا يقول الملخص أو الشرح أو نقاط المقالي ما لا يقوله الكتاب، ولا يُسقط شرطاً أو استثناءً يغيّر الحكم، ولا ينسب قولاً إلى غير قائله (كأن يُنسب رأي المؤلف إلى الفقه أو العكس).',
  '- إذا ذكر الكتاب في المسألة أكثر من رأي، فالسؤال يسمّي صاحب الرأي الذي يسأل عنه.',
  '- فراغ «ضع الكلمة الصحيحة» لا يحتمل إلا جواباً واحداً.',
  '- الاختيار من متعدد: لا يُعرف صحيحه إلا بالفهم؛ فلا يتميز بطوله أو دقته أو انفراده بلفظ الكتاب أو بكلمة من السؤال، ولا يُستبعد خيار خاطئ بالبداهة. اذكر كل سؤال يُحل بالاستبعاد دون فهم، وسبب ذلك.',
  '- نوع الخطأ بين القوسين يناسب الخطأ الذي بُني عليه الخيار (أذكر المخالفة الواضحة وحدها).',
  '- ما يُسأل عنه في نص الكتاب ولا يذكره الملخص أصلاً.',
  '',
  'التقرير: بالعربية، وكل ملاحظة في سطر بهذا الشكل:',
  'المعرّف | الخطأ | الصواب | نص الكتاب الذي يثبته «...» | الصفحة',
  'ورتّبها: الأخطاء في المعلومة أو النسبة، ثم الأجوبة والتعليلات الخاطئة أو المشكوك فيها، ثم ما يُحل بالاستبعاد، ثم أنواع الأخطاء غير المناسبة، ثم ما نقص من الملخص. ولا تكتب ملاحظات أسلوبية.',
  '',
  '— نسخة المراجعة —',
  ''
].join('\n');
const all = brief + review;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
process.stdout.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>نسخة جيمني: الدفعة ${esc(batch || '')}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap">
<style>
:root{--bg:#EBE9E2;--card:#F7F6F1;--line:#D8D5CC;--ink:#1A1B19;--sec:#63615A;--hero:#1F4A47;--hero-ink:#EEF4F1;--ok:#2E7A57}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#111615;--card:#1A201F;--line:#2B3331;--ink:#ECF1EF;--sec:#9AA7A4;--hero:#173A38;--hero-ink:#EAF3F0;--ok:#7FCBA3;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#111615;--card:#1A201F;--line:#2B3331;--ink:#ECF1EF;--sec:#9AA7A4;--hero:#173A38;--hero-ink:#EAF3F0;--ok:#7FCBA3;color-scheme:dark}
*{box-sizing:border-box;margin:0}
body{background:var(--bg);color:var(--ink);font-family:"Vazirmatn",system-ui,sans-serif;line-height:1.7}
.wrap{max-width:460px;margin:0 auto;padding:18px 18px 40px;display:grid;gap:14px}
h1{font-size:24px;font-weight:700}
p{color:var(--sec);font-size:15px}
.btn{width:100%;padding:15px;border-radius:99px;border:0;background:var(--hero);color:var(--hero-ink);font:inherit;font-weight:700;font-size:16px;cursor:pointer}
.btn:focus-visible{outline:2px solid var(--ink);outline-offset:3px}
.ok{color:var(--ok);font-weight:600;min-height:1.7em}
textarea{width:100%;height:50vh;border:1px solid var(--line);border-radius:16px;background:var(--card);color:var(--ink);padding:12px;font:inherit;font-size:13px;line-height:1.7}
</style></head><body><div class="wrap">
<h1>نسخة جيمني: الدفعة ${esc(batch || '')}</h1>
<p>${esc(lessons || '')}</p>
<p>اضغط الزر، والصق النص كله في محادثة جديدة مع جيمني، ثم انسخ تقريره وأرسله لي.</p>
<button type="button" class="btn" id="copy">انسخ التعليمات والنسخة كلها</button>
<p class="ok" id="msg" role="status"></p>
<textarea id="txt" readonly aria-label="نص المراجعة">${esc(all)}</textarea>
</div>
<script>
document.getElementById('copy').addEventListener('click', function () {
  var t = document.getElementById('txt'), m = document.getElementById('msg');
  function fallback() { t.focus(); t.select(); try { document.execCommand('copy'); m.textContent = 'نُسخ النص. الصقه في جيمني.'; } catch (e) { m.textContent = 'حدّد النص في المربع وانسخه بيدك.'; } }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).then(function () { m.textContent = 'نُسخ النص. الصقه في جيمني.'; }, fallback); else fallback();
});
</script></body></html>
`);
