# Brief: write the study-site content for one batch of an International Law textbook

You are helping a Saudi law student prepare for his **International Law** midterm (القانون الدولي العام 1, second midterm) on **Tuesday 17 Nov 2026**. His study site (folder `law135`, a GitHub Pages site) is built in batches of about 25–30 book pages; other workers build the neighbouring batches in parallel with this same brief, so follow it exactly. Everything you write for the site is in **Modern Standard Arabic**; these instructions are in English only for you.

## Inputs
- **Verbatim transcription** of the book pages (already done and checked against the page images): `/home/claude/book/text/نص الكتاب ص A–B.md`. Page markers are `=== ص 127 ===`; headings start with `#`; footnotes follow `حواشي:`. This is your main reading source.
- **Page images**: every verbatim item (a `q` block, a `def` card with `bk: true`, a definition in `defs`, a `list` taken from the book) and every number, date or article number you use must be checked against the page image, not only against the transcription. Do it with the crop tool, which cuts out just the spot where a text appears: `python3 /home/claude/term3/_tools/law135/crop_quote.py <book page> "<the text as in the transcription>" /home/claude/build/work/<your chapter>/<name>.png`, then view the PNG with the Read tool (if the crop misses the text, pass a few distinctive words from it instead). Do not view whole pages unless a crop fails; for that, the PDF is the path in the environment variable `BOOK_PDF` (the book PDF the student attached), PDF page = book page − 97. Keep a short list of what you checked; mention in your report any word where the image differs from the transcription.
- **Format and level of detail**: `/home/claude/term3/law136/data/c5.js`, lines 362–554 (a constitutional-law chapter from the same student: one full lesson, then the chapter's tables, mind map and last-night sheet). Read them first. Do not edit anything under `/home/claude/term3`.
- **Compilations (التجميعات)**: `/home/claude/book/tj/essay-questions.txt`: past questions collected by students, plus a note the professor dictated in class (treaty interpretation methods). And a colleague's summary of the course: `/home/claude/book/tj/summary-colleague.txt` (only the line range given in your task concerns you; its PDF extraction sometimes doubles «ال», e.g. «االتفاقيات» = «الاتفاقيات»).

## Output: the chapter data file
`/home/claude/build/data/<chapter id>.js`, built incrementally (lesson by lesson, not one giant write):

```js
/* القانون الدولي (law135) — <chapter name> (ص A–B) — بيانات فقط */
(window.LAW135 = window.LAW135 || { chapters: [] }).chapters.push({
  id: "c3", title: "<short label shown in the site, e.g. «المعاهدات: الإبرام»>", name: "<full name>", pages: "A–B",
  lessons: [
    {
      id: "l7", title: "<short lesson title>", pages: "127–132", minutes: 35,
      summary: [
        { t: "h", x: "المبحث الأول: ..." },
        { t: "p", x: "...", pg: "130" },
        { t: "list", lead: "<says what is listed and how many>:", items: ["...", "..."], pg: "131", ordered: true },
        { t: "q", x: "<the book's exact words>", pg: "131", label: "<what this text defines>" },
        { t: "note", x: "...", pg: "131" },
        { t: "dr", x: "<what the professor dictated>", items: ["...", "..."] }
      ],
      cards: [
        { id: "l7k1", type: "def", front: "...", back: "...", bk: true, pg: "130" },
        { id: "l7k2", type: "count", front: "...", n: 3, lead: "ثلاثة شروط:", items: ["...", "...", "..."], pg: "131" },
        { id: "l7k3", type: "rule", front: "...", rule: "...", exc: "...", pg: "132" }
      ],
      objective: [
        { id: "l7o1", k: "tf", q: "...", a: false, e: "تعميم وإطلاق", why: "...", pg: "130" },
        { id: "l7o2", k: "tf", q: "...", a: true, why: "...", pg: "131" },
        { id: "l7o3", k: "mcq", q: "...", opts: ["...", "...", "...", "..."], a: 2, e: ["خلط مصطلح بشبيهه", "حكم لحالة أخرى", null, "شرط أو ركن ناقص"], why: "...", pg: "131" },
        { id: "l7o4", k: "fill", q: "... ____ ...", a: "...", opts: ["...", "...", "...", "..."], e: [null, "خلط مصطلح بشبيهه", "رقم أو تاريخ قريب", "خلط مصطلح بشبيهه"], why: "...", pg: "132" }
      ],
      essay: [
        { id: "l7e1", q: "...", pg: "130–132", points: [ { x: "...", pg: "130" }, { x: "...", pg: "131" } ] }
      ],
      steps: [
        { id: "l7s1", title: "مراحل ...", items: ["...", "...", "..."], pg: "131–133" }
      ]
    }
  ],
  tables: [ { id: "c3t1", title: "...", cols: ["وجه المقارنة", "...", "..."], rows: [["...", "...", "..."]], core: "...", pg: "133–140" } ],
  map: { t: "<chapter title>", c: [ { t: "...", pg: "...", c: [ { t: "...", d: "...", pg: "..." } ] } ] },
  night: [ { x: "...", pg: "..." } ],
  defs: [ { term: "...", pg: "130", parts: ["...", "...", "..."], hide: ["..."], fam: "<family name>" } ]
});
```
- `pg` everywhere: printed book pages, `"130"`, `"130–132"` (en dash –) or `"130، 132"`.
- IDs: lessons exactly as assigned to you; cards `<lesson>k1…`, objective `<lesson>o1…`, essays `<lesson>e1…`, steps `<lesson>s1…`, tables `<chapter>t1…`. Unique and sequential.

## Content rules (the student's own rules; follow all of them)
**Accuracy**
1. The book is the only source. No outside knowledge, even if true. Never make the book say what it does not say. Never attribute a statement to anyone other than the one the book attributes it to (the author's own view versus «الفقه», a named scholar, a court, a convention).
2. The author's view is the reference, even where it differs from the common view. When the book gives more than one opinion on a point, every question about that point names whose opinion it asks about («في رأي المؤلف»، «عند أنصار نظرية …»), so it never has two answers.
3. Definitions, enumerations (lists) and numbers are taken **verbatim** with their page. A `q` block, a `def` card with `bk: true` and every `defs` entry must be the book's exact words, in the book's spelling (the book writes الدولى، فى، التى: keep that inside verbatim text). Omissions inside a quote are marked `(...)`. Paraphrased definitions use `bk: false`. Your own wording elsewhere uses normal modern spelling (الدولي، في، التي).
4. Dates, years, article numbers and conventions (e.g. اتفاقية فيينا لقانون المعاهدات 1969) are part of this subject: keep them exactly as the book gives them.
5. Names are examinable: conventions, courts, cases, scholars, theories, organisations, examples. Keep them.

**Clarity**
6. Every list and every count card has a lead-in saying exactly what it lists and how many («شروط صحة المعاهدة الموضوعية ثلاثة:»). Every sentence must be understandable without opening the book.
7. Nothing testable about the book's own structure (no «ماذا يتضمن المبحث الثاني؟»).
8. When the book gives examples («مثل»، «كـ»، «على سبيل المثال»), present them as examples, never as a closed count.
9. Keep the book's hedges («ويبدو أن…»، «على الأرجح») and attributions; never turn an opinion into a fact.
10. A `note` block never starts with «تنبيه:» (the site prints that label). A list whose items carry the book's letters (أ، ب، ج) is not `ordered`.

**Summary** (the student studies from it instead of the book)
11. Faithful and complete for everything examinable on your pages, in the book's order, with headings mirroring the book's (المبحث، المطلب، أولاً…). Short paragraphs (1–3 sentences). A `q` for each real definition, a `list` for every enumeration (`ordered: true` when the book numbers it or the order matters), a `note` for traps such as two names for one thing or a frequent confusion.

**Cards** (about 6–10 per lesson)
12. A card for every definition (`def`), every enumeration (`count`: `n`, a `lead`, the items numbered and concise) and every rule with an exception (`rule` + `exc`).

**Objective questions** (about 12–16 per lesson). The professor said the exam will mostly ask **true/false with a justification («بيّن مدى صحة العبارة مع التعليل»)** and probably **no multiple choice**, essays instead. So:
13. **True/false is the main type: 60–70% of the objective questions**, balanced between true and false. Each statement is the kind the professor would ask. Set deliberate traps: generalisation without its exception, a missing condition or element, «دائماً» or «فقط», a ruling moved to another case, two similar terms swapped, an opinion given to the wrong holder, a nearby number or date.
    - `why` **is the model justification** the student will compare his own with: for a false statement, say why it is false and state the correct rule from the book; for a true statement, say why it is true (the rule, its condition, its exception if any). Two or three sentences, from the book, with the key words the professor expects.
14. **Multiple choice: at most 2 per lesson**, only where the lesson has confusable terms or rulings. 4 options. Every wrong option is a mistake a student who has not mastered the lesson would actually make; none can be dismissed as off-topic; the correct one must not stand out by length, precision, the book's wording, or sharing a word with the question; spread its position over a = 0–3; no pair of opposite options that gives it away; no absolute word only in the wrong options; every wrong option is definitely wrong according to the book. Test each question: could someone reach the answer by elimination without knowing the lesson? If yes, rewrite it.
15. **Fill-in: 2–3 per lesson.** The blank is `____`; `a` is the answer; `opts` has 4 plausible options including `a`; the blank admits only one answer.
16. **Error types (required).** Every wrong thing a student could pick carries the kind of mistake it was built on, one of exactly: «خلط مصطلح بشبيهه»، «حكم لحالة أخرى»، «شرط أو ركن ناقص»، «رقم أو تاريخ قريب»، «رأي منسوب إلى غير قائله»، «تعميم وإطلاق». So: a false true/false statement has `e: "<type>"` (a true one has no `e`); a multiple-choice question has `e` with 4 entries aligned with `opts` (`null` for the correct option); a fill-in has `e` aligned with its `opts` (`null` for the answer).

**Essay questions** (3–4 per lesson, exam style: اشرح، بيّن، عدّد مع الشرح، قارن، علّل)
17. `points` are the model answer used to grade the student, complete, each with its page, ordered تعريف ← شروط أو أركان ← القاعدة ← الاستثناءات ← مثال ← خاتمة where applicable. Cover every examinable topic of the lesson across its essays.

**Compilations and the colleague's summary** (use them silently: nothing on the site says where an item came from)
18. Every question in `essay-questions.txt` whose topic falls inside your pages enters the site as the matching kind: an essay question («الفرق بين…»، «الشروط…»، «المراحل…»), a true/false with justification («بيّن مدى صحة العبارة»), or a fill-in/multiple choice for the «خيارات» lines. Give each such item `exp: 1` (a hidden flag; the site shows nothing before the last three days). The summary must cover its full answer.
19. The compilation's or the colleague's answer is checked against the book. Where it **differs from the book** (a number, a date, a word, a missing item, an opinion given to the wrong holder), the book wins on the site, and the wrong version becomes a trap: a false true/false statement whose `why` states the book's version with its page, or a wrong option. List every such difference in your report (the student wants to see them).
20. The professor's dictated note on «مناهج تفسير المعاهدات» goes to whoever has the book's pages on treaty interpretation: add a `dr` block with it (as dictated, `items` for the lists) right after the book's own treatment, a `count` card for each of its two lists (front ending «(من إملاء الدكتور)»), and compare it with the book in your report.

**Chapter extras**
21. `tables`: 2–4 comparison tables where the content really compares things. `cols[0]` is «وجه المقارنة»; every row has as many cells as columns; cells short; a cell never repeats another cell of its row and never contains its column's name (the site quizzes single cells). `core` is «الفرق الجوهري»: one sentence capturing the essence of the difference.
22. `map`: the chapter mind map. Root `t` is the chapter title; one child per lesson; short heads (≤ 6 words) with an optional one-line `d`; `pg` on nodes.
23. `night`: 10–14 one-line high-yield points for the last night (counts with their items, key distinctions, key names), each with `pg`.
24. `defs`: every real definition the book gives on your pages, verbatim, cut into its natural phrases (`parts`, 2–14 pieces; short definitions word by word). `parts.join(' ')` must equal the verbatim text exactly. `hide`: words inside the text that reveal the term (so «whose definition is this?» does not give it away). `fam`: a short family name grouping definitions that resemble each other (e.g. «أنواع المعاهدات»); use the same family names as your neighbours would for the same subject.
25. `steps` (optional, per lesson): only where the book presents a genuinely ordered sequence (stages, procedures) whose order matters, the items in the book's order.
26. `minutes`: honest first-study time, weighted by the density of definitions, lists, opinions and numbers (20–45 minutes for 3–6 dense pages is typical); integer, max 75.
27. Style: clear MSA; Arabic comma «،» and semicolon «؛», quotes «», en dash – in page ranges; no diacritics except to disambiguate.

## Lesson split
Use the planned lessons you were given. A lesson ends at the end of a مبحث or مطلب; never split a definition or a list between two lessons. Change a boundary only if the pages clearly require it, and explain why in your report.

## Check before you finish
Run `node /home/claude/term3/_tools/law135/validate.js /home/claude/build/data/<id>.js "<transcription file>" --range <first>-<last lesson number>` (if your pages span two transcription files, concatenate them into one temporary file under `/home/claude/build/work/<id>/` and pass that). Fix every ERROR. Resolve every WARNING: a «verbatim text not found» warning means your quote differs from the transcription; look at the page image and correct whichever is wrong (if the transcription is wrong, say so in your report, page and word). Rerun until clean.

## Final report (your last message, in English, short)
- Lessons: id, title, pages, minutes, and counts (cards / objective with tf-mcq-fill split / essays / steps); tables, night, defs counts.
- Every difference between the compilations or the colleague's summary and the book (what they say, what the book says, page).
- How the professor's note compares with the book (if your pages include treaty interpretation).
- Any place where the book is ambiguous or you were unsure of the reading, with the page; any transcription error you found.
- Any change to the planned lesson split, and why.
Do not paste the content itself into the report. Do not edit anything under `/home/claude/term3` and do not run git.
