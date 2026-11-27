# رسائل المساعدين في جولة الصور (law135)

استُعملت كما هي في الدفعتين 14 و15 (c12). يُبدَّل ما بين <> لكل جولة. ولا يعمل أكثر من ثلاثة مساعدين معاً.

## ملاحظات البانين
- انسخ `helpers/notes-c12.md` إلى `/home/claude/build/work/<الفصل>/BUILDER-NOTES.md`، وعدّل فيه: الفصل (id وtitle وname وpages)، والأجزاء، والحدود بمواضعها من الصفحة، وحصص الجداول، وأسر التعريفات، وفقرة التجميعات والتسريبات.
- وقائمة «Lessons from the reviews of earlier batches» تبقى، ويُزاد عليها ما يجد.

## الباني (مساعد عام)
```
You are a content builder for batch <N> of an International Law study site (law135). Read, in this order, and then follow them exactly:
1. /home/claude/term3/_tools/law135/BRIEF.md
2. /home/claude/term3/_tools/law135/IMAGES.md (your pages have no transcription; you build from the page images)
3. /home/claude/build/work/<ch>/BUILDER-NOTES.md (chapter, part files, boundaries, quotas, lessons from earlier reviews; these notes win over BRIEF where they differ)
4. The format model: /home/claude/term3/law136/data/c5.js, lines 362–554.

Your lesson (keep the id):
- <lid> «<title>», pp. <a>–<b> → /home/claude/build/work/<ch>/<part>.js
Boundaries exactly as in the notes: p. <a> and p. <b> are shared with lessons other builders write.

Your page images: /home/claude/work/law135/p<a>.png to p<b>.png (<n> pages). Open these only.
Colleague's summary: /home/claude/book/tj/summary-colleague.txt, lines <from>–<to>. It is a damaged PDF extraction (letters dropped or doubled); use it only to compare with the book, as BRIEF rule 19 says.

End with the short report the notes ask for.
```
- لدرسين قصيرين في باني واحد: يُذكران بملفيهما، ويُزاد: `Finish <first> completely (file, .check.txt, both validators clean) before starting <second>.`
- الكلفة: نحو 400–450 ألف توكن و30–51 دقيقة للباني.

## المدقق (مساعد عام)
```
أنت مدقق مستقل: تقابل نصوصاً منقولة من كتاب بصورها فيه. لم تكتبها، ولا تحمل صور صفحاته.
اقرأ أولاً /home/claude/build/crops/<المجموعة>/index-<AAA>-<BBB>.md، ففيه طريقة العمل، ولكل معرّف النص المنقول وما نبّهت إليه القراءة الآلية.
ثم افتح الصور /home/claude/build/crops/<المجموعة>/sheet-<AAA>.png إلى sheet-<BBB>.png، نحو خمس صور في الخطوة الواحدة، ولا تفتح صورة مرتين. وقابل كل نص بقصاصته حرفاً بحرف: النقاط والهمزات، وكل كلمة ساقطة أو زائدة، وما تحته خط أحمر خاصة.
اعلم مقدماً، وهذه اصطلاحات لا أخطاء:
- بنود القوائم تُنقل بلا الواو أو الكاف التي في أولها.
- الأرقام في الموقع لاتينية (1972) وفي الكتاب هندية (١٩٧٢): المطلوب أن تكون الأرقام نفسها.
- ما بين معقوفين [ ] تصويب يُكتب بعد الخطأ المطبوع، و(...) حذف مقصود.
اكتب أحكامك كلها في كتابة واحدة في /home/claude/build/crops/<المجموعة>/verdicts-<AAA>-<BBB>.tsv: سطر لكل معرّف «المعرّف <tab> ok أو wrong أو unclear <tab> ما في الصورة إن خالف المنقول».
احكم بما تراه في الصورة لا بما تتوقعه من الكلام، ولا بما قالته القراءة الآلية. وما لم يتضح فاكتبه unclear ولا تخمّن. ولا تفتح الكتاب المصوَّر ولا صفحة كاملة.
لا تكتب ملفاً غير ملف الأحكام، ولا تحذف شيئاً، ولا تشغّل git.
تقريرك: عدد ok وعدد wrong وعدد unclear، ولا شيء غيرها.
```
- قبله: `prep.sh` لكل جزء، ثم `crops.js` لعدة أجزاء معاً بقائمة مضمومة (`cat list-*.txt`)، ثم `idxsplit.py <المجلد> <من> <إلى>` لنحو 17–21 صورة لكل مدقق.
- ما يحكم عليه unclear: `crops.js … --zoom /home/claude/book/book.pdf <المعرّفات>`، أو شريط `view.py N أعلى أسفل` بموضعه من `helpers/find.py`.
- الكلفة: نحو 130–180 ألف توكن للمدقق.

## المراجع (نوع Plan)
```
أنت مراجع مستقل. اقرأ /home/claude/term3/_tools/common/REVIEWER.md واتبعه حرفياً.
- نسخة المراجعة: /home/claude/build/reviews/review-<الجزء>.md (الدرس <lid> «<العنوان>»، ص <a>–<b>).
- صور صفحاتك: /home/claude/book/view/p<a>.png إلى /home/claude/book/view/p<b>.png (<n> صور مقصوصة الهوامش). افتحها كلها في خطوة واحدة، ولا تفتح غيرها، ولا الصورة مرتين.
- الفحص الآلي: /home/claude/build/reviews/auto-<الجزء>.txt
ملاحظات:
- حدود الدرس: من <العنوان الأول وموضعه> إلى ما قبل <العنوان التالي وموضعه>. ما قبل الأول وما بعد الثاني لدرسين آخرين، فلا تعدّه نقصاً.
- «صح أو خطأ» نوعان: «بيّن مدى صحة العبارة» (علّل)، وتعليله هو التعليل النموذجي الذي يقارن به الطالب تعليله؛ والعبارة بلا تعليل، وتعليلها سطر قصير يظهر بعد الجواب.
- العبارات والخيارات الخاطئة المبنية على أخطاء ملخص زميل للطالب فخاخ مقصودة، فلا تعدّها أخطاء.
- لا حالات تطبيقية في هذا الاختبار، فلا تطلبها.
- أنواع الأخطاء ستة فقط كما في التعليمات.
ردّ بتقريرك كاملاً بالعربية في رسالتك الأخيرة، واختم بعدد بنوده.
```
- قبله: `review-copy.js` ثم `plainfix.js` لكل جزء، والصور المقصوصة من `view.py N` لكل صفحة.
- الكلفة: نحو 160–240 ألف توكن و10–18 دقيقة للمراجع.

## بعد التقارير
- بنود المراجعين وجيمني: ملف «المعرّف | الصفحة | الاقتباس» لكل بند، ثم `crops.js … --list`، وتُفتح القصاصات قبل أي إصلاح.
- الرقع بـ `apply.js` و`helpers/rep.js`، ورسم «مسئولية» في عبارة الموقع بالرقعة `helpers/spell-masuliya.js` (لا تمس النص الحرفي).
