# Final-exam part (pp. 289–387): builder overrides to BRIEF.md

Read `BRIEF.md` for the data format and every content rule, then this file. This file replaces the parts of BRIEF that no longer apply, because the student's study-site skill changed after BRIEF was written. Where they differ, this file wins. `{W}` is the work folder named in your message (outside the repository); the repository root is the folder you run commands from.

## What changed
1. **Context.** The exam is now the final (Wednesday 23 Dec 2026). It covers the whole book except what the two midterms excluded. The new part (pp. 289–387: chapters 11–13 and the conclusion) is planned as pending lessons, and each batch fills some of them.
2. **No transcription.** Do not write BRIEF's "Output 1", and never write the book's text out continuously (whole pages) in any file or message. Read the page images and write in your own words. Only these are copied verbatim, exactly as printed, each with its page: definitions (`q` blocks, `def` cards with `bk: true`), the items of enumerations (`list` blocks), numbers, article numbers and foreign words. Omissions inside a verbatim text are marked `(...)`.
3. **Footnotes** are read with the main text and built from like it.
4. **The professor's guidance.** Dates are not examined (BRIEF rule 3 stands). Historical matters (stories, how things came about, the Ottoman state) are not required: give them at most one orienting sentence in the summary, and no card, question, essay point or night point. He does not care much about the author's own opinions: keep them attributed where the book states them, but do not build questions on them. Questions are at bachelor's level.
5. **Not on this site:** error types, a simplified intro (`intro`), comprehension or reasoning questions, colleagues' files, compilations, importance ranks.
6. **Format sample:** `law136/data/c10.js` lines 719–952 (lesson l53, then the chapter's tables, map and night), instead of c5.js.
7. **Keep each lesson's id, title, pages and minutes as given:** the exam schedule depends on them. If a boundary must move, say so in your report instead of moving it.

## Lessons from the batch 1 reviews (apply them)
- **History:** the professor's guidance means one orienting sentence for a lesson's whole historical passage, not one per paragraph. Keep what is examinable (criteria, rules, lists, legal terms).
- **Never drop a qualifier** when you turn the book's words into a question, an option or a table cell («في نطاق وزارته»، «التي تدخل ضمن أعمال وزارته»، «في المرحلة الأولى…»): without it a true statement becomes false or general.
- **No applied cases** («اقترح وزيرٌ…، فهو يمارس…»): ask directly.
- **Options of one kind and level:** if the question is about the King's powers as president of the council, every option is a presidential power, the wrong ones distorted in one detail. No option eliminable at sight; no pair of opposite options of which one is the answer; no word in the stem sharing a root with the answer; no fill-in whose surrounding words give the answer away. When options combine two elements, balance them: each element in exactly two options (2×2).
- **A term the book uses in two senses** (search the published chapters): restrict the question («في نظام المجلس الحالي»).
- **A table cell** must not restate its column's name, even in other words.
- **Output C** lists real definitions only (the book defines a term: «يقصد به»، «هو»، «يُعرَّف بأنه»), not other verbatim statements.

## Inputs and outputs
- Page images: `{W}/pages/pNNN.png` (NNN = printed book page). Open all your pages first, and no others. Check the printed number at the foot of each page.
- **A)** `{W}/parts/<part>.js`: a chapter file with the chapter's header fields, containing only your lessons, plus the chapter extras for your lessons only: `tables` (0–2, only where the content truly compares; ids `<chapter>t1…`, renumbered when parts are joined), `map` (root `t` = "<chapter title>: <chapter name>", one child per lesson), `night` (3–5 points per lesson).
- **B)** `{W}/parts/<part>-list.txt`: what the image checker must compare that is not a `q` block or a `bk: true` card. One line per item, `ID | page | exact text as printed`: every `list` item (ID `l55.s7.i2` = summary block 7 counted from 1, item 2), and every number, article number and foreign word used anywhere (ID of the item where it appears, such as `l55o4`, with a short exact phrase from the page around it). A text that runs onto the next page gets one line per page.
- **C)** `{W}/parts/<part>-defs.txt`: one line per definition (each `def` card and each defining `q` block): source id (`l55k2` or `l55.s5`) | term | page | the verbatim text split into 2–14 phrase chunks separated by ` / ` (the chunks joined with single spaces must equal the text exactly) | family: an existing one from `fams` at the end of `law136/data/defs.js`, or `new: <name> with <sibling id>`, or `none`.
- Save as you go, lesson by lesson.

## Check (from the repository root; rerun until clean)
1. `node _tools/law136/validate.js {W}/parts/<part>.js`: fix every ERROR and resolve every WARNING.
2. `node _tools/common/crops.js {W}/law136.json {W}/pages {W}/scratch-<part> --chapter {W}/parts/<part>.js --list {W}/parts/<part>-list.txt`, then read `{W}/scratch-<part>/index.md` only (do not open the sheets). Every item the machine readings flagged, or did not find, gets a second look at your page image: correct your text where it differs from the print. The image decides, never the machine reading.

## Final report (your last message, in English, short)
Per lesson: id, title, pages, minutes; counts (summary blocks / cards / objective / essays); tables and night counts; verbatim counts (q, bk cards, list items, numbers). Then: pages whose printed number differs from the file name; illegible words; ambiguous spots with their page; boundary remarks. Do not paste content. Do not edit the repository and do not run git.
