# Notes for the c12 builders (batches 14 and 15)

Read after BRIEF.md and IMAGES.md. Where these notes differ from BRIEF.md, these notes win.

Chapter: id "c12", title «المسئولية الدولية: تعريفها وشروطها», name «المسئولية القانونية الدولية كمظهر للعلاقات الدولية التنازعية: التعريف بها وشروطها», chapter pages 405–441.

## Part files (instead of BRIEF's output path)
- One file per lesson: `/home/claude/build/work/c12/<part>.js`. The parts are merged later in order, so never put two lessons in one file.
- Each file pushes exactly one chapter object: id "c12", the title and name above, `pages` = that lesson's pages, `lessons` = that one lesson, plus that lesson's share of the extras below.
- The six parts: c12-a l63 (405–409), c12-b l64 (409–416), c12-c l65 (416–424), c12-d l66 (424–428), c12-e l67 (428–436), c12-f l68 (436–441). Other builders write the other parts in parallel; never open or touch their files.

## Boundaries (already checked on the images; do not move them)
- l63: from the top of p. 405 (heading «المبحث الثانى», the start of the chapter) to just before the heading «ثانيا: خصائص المسئولية القانونية الدولية», about 43% down p. 409.
- l64: from that heading (p. 409, ~43%) to just before the heading «المطلب الثانى», about 48% down p. 416.
- l65: from «المطلب الثانى» (p. 416, ~48%; it opens the conditions of responsibility and announces the three conditions) through the internationally wrongful conduct and the conduct reflecting fault, to just before the numbered heading on lawful conduct of exceptional danger («… السلوك المشروع دوليا المتسم بخطورة استثنائية»), about 43% down p. 424.
- l66: from that heading (p. 424, ~43%) to just before the heading «ثانيا: نسبة السلوك إلى الشخص الدولى المدعى عليه», about 37% down p. 428.
- l67: from that heading (p. 428, ~37%) to just before the heading «ثالثا: حدوث ضرر للمدعى», about 58% down p. 436.
- l68: from that heading (p. 436, ~58%) to the end of the main text on p. 441. Diplomatic protection (p. 442 on) is another chapter.
- On a shared page cover only your side of the boundary. Footnotes go with the text their marks are in.

## Chapter extras: quotas (the merge concatenates the parts)
- `map`: root `t` exactly «المسئولية الدولية: تعريفها وشروطها». In each file one child only: the lesson's node (head ≤ 6 words, `pg`, children as needed).
- `night`: exactly 2 points per lesson.
- `tables`: at most one table, and only in c12-b (l64), c12-e (l67) and c12-f (l68), and only where the book's content on your own pages really compares two or more things. c12-a, c12-c and c12-d have `tables: []`.
- `defs`: every real definition on your pages, `fam` from this list: «مفهوم المسئولية الدولية»، «خصائص المسئولية الدولية»، «أساس المسئولية الدولية» (wrongful conduct, fault, lawful conduct of exceptional danger)، «نسبة السلوك»، «الضرر». Only if none fits, make a short new family name and report it.

## Compilations and leaks
None of the questions in essay-questions.txt or leaks.txt falls on pp. 405–441 (checked); skip those files.

## Question mix (BRIEF 13–17, as the student set it)
- Choices about 70% of the objective questions: `mcq` about half of all of them, `fill` about a fifth. Every date, year, number or article number gets a choice question with nearby values.
- The rest true/false: mostly plain (`plain: 1`), and «علّل» only for 1–3 important statements per lesson.
- Essays only as the lesson's important topics need (usually 1–3). No applied cases (حالات تطبيقية).
- If you cannot make the options of a question equally plausible, make it a plain true/false.

## Lessons from the reviews of earlier batches (avoid all of these)
1. Multiple choice or fill-in solvable by elimination was the most common finding. No option may be dismissed without knowing the lesson: by length, precision, being the only one in the book's wording, sharing a word or root with the question, not fitting the grammar of the stem, being impossible given the stem, being far from the other numbers, being the only one with a different form, being off-topic, or being self-contradictory.
2. Patterns Gemini caught: the correct option is the one the others converge on (it shares a part with each of them); the correct option is the only one lacking an element repeated in all the wrong ones; a wrong option contradicted by the wording of the question; a question answerable by common sense; an option naming another element or condition that is dismissed at once.
3. Keep the exact scope of every rule (states and organisations versus states only; a rule versus its exception; the ILC's 2001 articles on states versus its 2011 articles on organisations). Don't narrow or widen it.
4. Copy exact formulas with their qualifiers: conditions, periods, ordinals, years, article numbers, case names and dates with the court that decided them (the Permanent Court of International Justice is not the ICJ). Keep hedges and limits exactly: «عادةً»، «كقاعدة عامة»، «غالبًا»، «فى الأصل».
5. When the book counts or enumerates, the count on the site equals the book's count and gets a count card; examples stay examples («على سبيل المثال»), and an example is never presented as the criterion or vice versa.
6. Rule cards: the site prints «القاعدة» and «الاستثناء» itself, so `rule` and `exc` never start with those words; a rule card only for a real rule with a real exception.
7. Attribution: the author's view («ونرى»، «ونحن لا نساير»), «جانب من الفقه», a named scholar or school, the ILC's articles versus its commentary, a court's holding: name the holder everywhere; never present a commentary as an article's text, nor a rejected opinion as the author's.
8. A true statement's justification states the rule and every exception or special regime the book attaches to it.
9. Summary completeness: every examinable paragraph goes in.
10. Article numbers with a paragraph are written as displayed (e.g. «المادة 1/38»): the number printed next to the word «المادة» is the article number. Read small digits in a band (`view.py N TOP BOTTOM`) next to a number you know on the same page, such as the footnote mark; a small band once misread «٢٩» as «٣٩».
11. A misprint stays as printed, with the correction after it in square brackets only when the book itself shows the right form («بفرض [بغرض]»); a grammatical slip inside verbatim text is corrected in brackets («مرغوبا [مرغوب]»). If the correction needs knowledge from outside the book, leave it as printed with no brackets.
12. Error types: only the six of BRIEF rule 16; pick the closest one.
13. Never test the same fact twice in one lesson.

## The «To check on the images» lines go in a file
For each part write `/home/claude/build/work/c12/<part>.check.txt` with the «To check on the images» lines of IMAGES.md (one per number, date, article number, foreign word, or name with a year that you used anywhere outside `q`, `def`, `defs` and `list`), each in the form `page | the item with 3–5 words around it, as printed`. Nothing else in that file. Your report then gives only their count.

## Checks (per part, with that lesson's number)
```
node /home/claude/term3/_tools/law135/validate.js /home/claude/build/work/c12/<part>.js --range N-N
node /home/claude/term3/_tools/common/validate.js /home/claude/term3/_tools/law135/images.json /home/claude/build/work/c12/<part>.js --pages /home/claude/work/law135 --range N-N
```
Fix every ERROR and look at every WARNING as IMAGES.md says. Rerun until clean.

## Files
Write only your part files, their `.check.txt` and, if you need them, temporary files under `/home/claude/build/work/c12/<part>-tmp/`. Do not edit anything under /home/claude/term3, do not run git, do not delete anything.

## Final report (English, short)
Per lesson: id, title, pages, minutes, counts (cards / objective: plain tf, «علّل» tf, mcq, fill / essays / steps), tables, night, defs (with their families), and the number of lines in its .check.txt. Then: every difference between the colleague's summary and the book (what it says, what the book says, page); every word you could not read with certainty (page and 3–5 words around it); anything ambiguous in the book. Do not paste the content itself.
