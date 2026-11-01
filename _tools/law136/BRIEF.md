# Brief: transcribe one chapter of a scanned law textbook and write its study-site lessons

You are helping a Saudi law student prepare for a constitutional law midterm on **Wednesday 4 Nov 2026**. His study site (folder `law136`, a GitHub Pages site) already covers the first part of the book (pp. 21–123). The professor added pp. 125–289 to the exam, with nothing deleted. You are building **one chapter** of the new part. Two other workers build the neighbouring chapters in parallel with the same brief, so follow it exactly. Everything you write is in **Modern Standard Arabic** (the student reads Arabic; these instructions are in English only for you).

Book: «النظام السياسي والدستوري للمملكة العربية السعودية» — أ.د. أحمد بن عبدالله بن باز.

## Inputs
- Page images: `/home/claude/work/pages/bNNN.png`, named by the **printed book page** (b127.png = book p. 127). `b125.png` is the title page of «الباب الثاني»; p. 126 is not in the scan (blank back of the title page). Read your pages with the Read tool, in order. Check the printed number at the foot of each page; if it differs from the file name, say so in your final report.
- Existing site, for format and style only (do not edit anything under `/home/claude/term3`): `/home/claude/term3/law136/data/c5.js`. Read lines **362–554** before writing (one complete lesson, then the chapter's tables, mind map and last-night sheet). That is the exact format and the level of detail expected.

## Output 1 — verbatim transcription (write it first)
File: `/home/claude/work/source/<chapter id>-text.md`
- First line: `# <chapter title and name> (ص X–Y) — نص مستخرج من صور الصفحات`
- For every page, a marker line `## ص 127`, then the page text **exactly as printed**: same words, spelling, hamzas, numbers, dates, punctuation and paragraphing. Headings on their own line prefixed with `### `. Numbered points as printed. Footnotes at the end of their page, each on its own line starting `[هامش] `.
- Omit only the running header («النظام السياسي والدستوري للمملكة العربية السعودية»), the page number box and the «CamScanner» footer. Diacritics (tashkeel) may be omitted.
- Never correct, modernise or paraphrase the author, even when the wording looks odd. If a word is truly illegible, write `[؟]` and list it in your report.
- **Keep dates here** (this file is a faithful copy; dates are removed only on the site).
- Append to the file every 4–6 pages, so nothing is lost if you are interrupted.

## Output 2 — the chapter data file
File: `/home/claude/work/data/<chapter id>.js` — same format as `c5.js`:

```js
/* القانون الدستوري (law136) — الفصل السادس: <name> (ص125–154) — بيانات فقط */
(window.LAW136 = window.LAW136 || { chapters: [] }).chapters.push({
  id: "c6", title: "الفصل السادس", name: "<chapter name>", pages: "125–154",
  lessons: [
    {
      id: "l23", title: "<short lesson title>", pages: "127–132", minutes: 35,
      summary: [
        { t: "h", x: "المبحث الأول: ..." },
        { t: "p", x: "...", pg: "130" },
        { t: "list", lead: "<says what is listed and how many>:", items: ["...", "..."], pg: "131", ordered: true },
        { t: "q", x: "<the book's exact words>", pg: "131", label: "<what this text defines>" },
        { t: "note", x: "...", pg: "131" }
      ],
      cards: [
        { id: "l23k1", type: "def", front: "...", back: "...", bk: false, pg: "130" },
        { id: "l23k2", type: "count", front: "...", n: 3, lead: "ثلاثة أسباب:", items: ["...", "...", "..."], pg: "131" },
        { id: "l23k3", type: "rule", front: "...", rule: "...", exc: "...", pg: "132" }
      ],
      objective: [
        { id: "l23o1", k: "tf", q: "...", a: false, why: "...", pg: "130" },
        { id: "l23o2", k: "mcq", q: "...", opts: ["...", "...", "...", "..."], a: 2, why: "...", pg: "131" },
        { id: "l23o3", k: "fill", q: "... ____ ...", a: "...", opts: ["...", "...", "...", "..."], why: "...", pg: "132" }
      ],
      essay: [
        { id: "l23e1", q: "...", pg: "130–132", points: [ { x: "...", pg: "130" }, { x: "...", pg: "131" } ] }
      ]
    }
  ],
  tables: [ { id: "c6t1", title: "...", cols: ["وجه المقارنة", "...", "..."], rows: [["...", "...", "..."]], core: "...", pg: "133–154" } ],
  map: { t: "الفصل السادس: ...", c: [ { t: "...", pg: "...", c: [ { t: "...", d: "...", pg: "..." } ] } ] },
  night: [ { x: "...", pg: "..." } ]
});
```
- `pg` everywhere: printed book pages — `"130"`, `"130–132"` (en dash –), or `"130، 132"`.
- IDs: lessons as assigned to you; cards `<lesson>k1…`, objective `<lesson>o1…`, essays `<lesson>e1…`, tables `<chapter>t1…`. Unique, sequential.
- Build the file incrementally (e.g. lesson by lesson), not in one giant write.

## Content rules (the student's own rules — follow all of them)
**Accuracy**
1. The book is the only source. No outside knowledge, even if true. Never make the book say what it does not say, and never attribute a statement to anyone other than the one the book attributes it to.
2. Definitions, enumerations (lists) and numbers are taken **verbatim** with their page. A `q` block, and a `def` card with `bk: true`, must be the book's exact words (omissions marked `(...)`). Paraphrased definitions use `bk: false`.

**Dates are not in the syllabus** (the professor said so)
3. On the site (summary, cards, questions, essays, tables, map, night) remove every historical year or date, Hijri or Gregorian, every century reference, and historical durations (how long a state, a reign, a siege or an event lasted; when a law was issued). Keep the order of events with words such as «ثم، بعد، قبل، الأولى/الثانية/الثالثة». Keep numbers that are not dates: counts (members, articles, conditions), article numbers, ordinals — and every period that is part of a legal rule (a term of office, a condition, a deadline, an age: «مدة المجلس أربع سنوات»، «بعد مضي سنة»), exactly as the book states it. Never replace a number the book gives with a vague phrase («مدة قصيرة»، «مدة محددة»); if a historical duration must go, simply omit it. No question whose answer is a historical date or duration. Inside a verbatim quote, cut the date phrase and mark `(...)`. Add nothing the book does not print (not even a unit), and no notes linking to the first part of the book unless the page itself makes the link.
4. Names are examinable: people (founders, imams, kings), places, battles, agreements and treaties, institutions, causes, results, examples. Keep them.

**Clarity**
5. Every list and every count card has a lead-in saying exactly what it lists and how many («أسباب سقوط الدولة السعودية الأولى ثلاثة:»). Wording must be self-contained: the student must never need to open the book to understand a sentence.
6. Nothing testable about the book's own structure: no card, question, essay or night point such as «ماذا يتضمن الباب الثاني؟» or «كم مبحثاً في الفصل؟». The summary may state the chapter plan briefly for orientation, nothing more.

**Summary** (the main study text — the student studies from it instead of the book)
7. Faithful and complete for everything examinable on the pages, in the book's order, with headings mirroring the book's (المبحث، المطلب، أولاً…). Paragraphs short (1–3 sentences). Use `q` for each real definition in the book, `list` for every enumeration (`ordered: true` when the book numbers it or the order matters), `note` («تنبيه») for traps such as two names for one thing.

**Cards** (about 6–10 per lesson)
8. A card for every definition (`def`), every enumeration (`count`: the number on the front's meaning, `n`, a `lead`, the items numbered and concise) and every rule with an exception (`rule` + `exc`).

**Objective questions** (about 10–14 per lesson: roughly half true/false, ~4 multiple choice, 2–3 fill-in)
9. True/false deliberately set traps, explained in `why`: generalisation without its exception, a missing condition, «دائماً» or «فقط», swapping an event, person or ruling between the first, second and third states, swapping two similar terms. Balance true and false.
10. Multiple choice: 4 options. Every wrong option is a mistake a student who has not mastered the lesson would actually make: another term from the chapter, a correct ruling for a different case, a list missing one item, a nearby number, a person or place from another state. No option can be dismissed as obviously off-topic. The correct option must not stand out by length, precision, being the only one in the book's wording, or sharing a word with the question; spread its position over a = 0,1,2,3 about evenly; no pair of opposite options that gives it away; no absolute word («دائماً، فقط») only in the wrong options. Each wrong option must be definitely wrong according to the book (never two defensible answers). Test every question: could someone reach the answer by elimination without knowing the lesson? If yes, rewrite it.
11. Fill-in: the blank is `____`; `a` is the answer; `opts` has 4 plausible options including `a`; the blank must admit only one answer.
12. `why` explains why the answer is right and, for multiple choice, why the tempting wrong options are wrong, from the book.

**Essay questions** (2–3 per lesson, exam style: اشرح، بيّن، عدّد مع الشرح، قارن)
13. `points` are the model answer used to grade the student, so they must be complete, each with its page, in the order: تعريف ← شروط أو أركان ← القاعدة ← الاستثناءات ← مثال ← خاتمة, where applicable.

**Chapter extras**
14. `tables`: 2–4 comparison tables where the content really compares things. `cols[0]` is «وجه المقارنة»; every row has as many cells as there are columns; cells short (a few words). The site also quizzes single cells («which column does this cell belong to?»), so a cell must not repeat another cell of its row and must not contain its column's name. `core` is «الفرق الجوهري»: one sentence that captures the essence of the difference. No dates.
15. `map`: the chapter mind map. Root `t` is the chapter title; one child per lesson; short headings (رؤوس أقلام, ≤ 6 words) with an optional one-line `d`; `pg` on nodes.
16. `night`: 10–14 one-line high-yield points for the last night before the exam (counts with their items, key distinctions, key names), each with `pg`.
17. `minutes`: honest first-study time (existing lessons: 20–45 minutes for 2–5 pages), weighted by the density of definitions, lists and names; integer, max 75.
18. Style: clear MSA like the existing files; Arabic comma «،» and semicolon «؛», quotes «», en dash – in page ranges; no diacritics except where needed to disambiguate.

## Lesson split
Use the planned lessons you were given. A lesson ends at the end of a مبحث or مطلب; never split a definition or a list between two lessons. You may move a boundary or change the number of lessons only if the pages clearly require it: then number sequentially from your first ID and explain why in your report (IDs are renumbered across chapters before publishing).

## Check before you finish
Run: `node /home/claude/work/tools/validate.js /home/claude/work/data/<id>.js /home/claude/work/source/<id>-text.md`
Fix every ERROR. Resolve every WARNING: a «verbatim text not found» warning means your quote differs from your transcription — look at the page image and correct whichever is wrong; a date warning must be removed unless it is a false positive. Rerun until clean.

## Final report (your last message, in English, short)
- Lessons: id, title, pages, minutes, and counts (cards / objective / essays).
- Any page whose printed number differs from its file name, and any illegible words.
- Any place where the book is ambiguous, or where you were unsure of the reading, with the page.
- Any change to the planned lesson split, and why.
Do not paste the content itself into the report; it is in the files. Do not edit anything under `/home/claude/term3` and do not run git.
