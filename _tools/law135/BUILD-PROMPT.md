# قوالب رسائل المساعدين لدفعات law135

الدفعة الواحدة: بانٍ (general-purpose) ← `validate.js` ← `review-copy.js` ← مراجع مستقل (Plan، لا يكتب ملفات فيرد بتقريره نصًا) ← تحقق Claude من كل ملاحظة بنص الكتاب وتصحيحها بـ `apply.js` ← `make-gemini.js` صفحةً منشورة ← ردود جيمني ← دمج في الموقع ونشر.
لا يزيد عدد المساعدين العاملين معًا على ثلاثة.

## رسالة الباني (بالإنجليزية، تُملأ الأقواس)

```
You are the content builder for batch {B} of an International Law study site. Read the brief at /home/claude/term3/_tools/law135/BRIEF.md and follow it exactly.

Your chapter: id "{CH}", title "{TITLE}", name "{NAME}", pages "{PAGES}". Output file: /home/claude/build/data/{FILE}.js.

Planned lessons (keep these ids):
- {lesson id} «{title}», pages {A–B}: from the heading «…» (p. A) up to «…» (p. B).
…

Transcription: … concatenated for you in /home/claude/build/work/{FILE}/src.md (read your pages from it and pass it to the validator). The page images are pre-rendered for the crop tool (BOOK_PDF is set); save your crops under /home/claude/build/work/{FILE}/.
Colleague's summary lines that concern your pages: /home/claude/book/tj/summary-colleague.txt, lines {…}.
Compilations: /home/claude/book/tj/essay-questions.txt (take only what falls inside your pages).

Boundaries and neighbours: {shared first/last pages; earlier chapters read-only under /home/claude/term3/law135/data/; tables {CH}t1…; map root; night count; existing defs family names}

Lessons from the independent reviews of earlier batches (avoid all of these):
1. Multiple choice or fill-in solvable by elimination was the most common finding. For each one, check that no option can be dismissed without knowing the lesson: by length, precision, being the only one in the book's wording, sharing a word or root with the question, not fitting the grammar of the stem, being impossible given the stem, being far from the other numbers, being the only one with a different form (e.g. the only dual), or being off-topic. If you cannot make all options equally plausible, turn the item into a true/false with justification instead.
2. Keep the exact scope of every rule (states and organisations versus states only; 1969 versus 1986 Vienna convention; a rule versus its exception). Don't narrow or widen it.
3. Copy exact formulas with their qualifiers: conditions, periods, ordinals, years, article numbers, case names and dates with the court that decided them (the Permanent Court of International Justice is not the ICJ). Wrong options must be close but definitely wrong.
4. When the book counts or enumerates, the count on the site equals the book's count and gets a count card; examples stay examples («على سبيل المثال لا الحصر», never «لا حصر لها»).
5. Rule cards: the site prints «القاعدة» and «الاستثناء» itself, so `rule` and `exc` never start with those words; use a rule card only for a real rule with a real exception.
6. Attribution: the author's own view («ونرى»، «ونعتقد»), «جانب من الفقه», a named school or scholar, a commission's comment, a court's holding: name the holder everywhere; never present a commission's comment as an article's text, or the author's past view as his current one.
7. A true statement's justification states the rule and every exception or special regime the book attaches to it.
8. Summary completeness: every examinable paragraph goes in.
9. Article numbers with a paragraph are written as in the transcription (paragraph/article, e.g. «المادة 1/38»).
10. Never test the same fact twice in one lesson.

Write /home/claude/build/data/{FILE}.js incrementally, validate it with
node /home/claude/term3/_tools/law135/validate.js /home/claude/build/data/{FILE}.js /home/claude/build/work/{FILE}/src.md --range {first}-{last}
until it is clean, and finish with the short report the brief asks for. Do not edit anything under /home/claude/term3 and do not run git.
```

## رسالة المراجع المستقل (subagent_type: Plan)

```
You are an independent reviewer. Read the brief at /home/claude/term3/_tools/law135/REVIEW-BRIEF.md and follow it exactly, with cN = {FILE}:
- Review copy: /home/claude/build/reviews/review-{FILE}.md ({chapter}, book pages {A–B}, lessons {…}).
- Automatic pre-check: /home/claude/build/reviews/auto-{FILE}.txt.
- Page images only for a doubtful place; existing crops are in /home/claude/build/work/{FILE}/.
Notes: {shared pages}; verbatim quotations are replaced by a placeholder line on purpose; false statements built on classmates' errors are intended traps.
You cannot write files in this role: return the complete report as your final message, in Arabic, in the brief's block format and order, and end with the count of findings. Do not edit any file and do not run git.
```

## أوامر الدفعة

```
node _tools/law135/validate.js <data.js> <src.md> --range A-B > reviews/auto-X.txt
node _tools/law135/review-copy.js <data.js> <src.md> > reviews/review-X.md
node _tools/law135/apply.js <data.js> <patch.js>          # patch: module.exports = (ch, H) => {...}; H.lesson/find/set/del
node _tools/law135/make-gemini.js reviews/review-X.md <batch> "<lessons label>" > gemini/bN/index.html
node _tools/law135/merge.js law135/data/cN.js cN "<title>" "<name>" "<pages>" part1.js [part2.js]
node _tools/law135/make-defs.js law135 && node _tools/law135/make-lessons.js law135 && node _tools/law135/defs-check.js law135
node _tools/law135/smoke.js . FIRST LAST
python3 -m http.server 8141 & python3 _tools/law135/tests/runcheck.py 8141 <lesson>
BOOK_PDF=<book.pdf> _tools/law135/prep_page.sh <page>   # يرسم الصفحة ويقرؤها آليًا قبل عمل البانين معًا
```
