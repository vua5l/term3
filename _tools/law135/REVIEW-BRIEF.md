# Brief: independent review of one batch of study-site content (International Law, law135)

You are an independent reviewer. Another worker read a scanned International Law textbook and wrote study content for a Saudi law student's exam site (القانون الدولي العام 1, second midterm, Tuesday 17 Nov 2026). You did not write it; your job is to find its errors before the student studies from it. You do **not** edit the content: you write a report, and the editor verifies every item against the book before fixing anything.

## Inputs (for your chapter `cN`)
- Review copy: `/home/claude/build/reviews/review-cN.md`. For each lesson it gives **the book's text for the lesson's pages** (verbatim transcription, checked against the page images), then everything the worker wrote **in his own words**: summary paragraphs and lists, non-verbatim cards, every objective question with its approved answer marked [المعتمد] (and, in brackets, the kind of mistake each wrong option or false statement was built on), every essay question with its model-answer points, and the «الفرق الجوهري» rows of the comparison tables. Verbatim items (quoted definitions) are not in it: they were checked against the page images and by machine.
- Automatic pre-check: `/home/claude/build/reviews/auto-cN.txt` (validator output). A first screen, not a verdict.
- Page images, only for a doubtful place: the book PDF at the path in the environment variable `BOOK_PDF`, where PDF page = book page − 97 (`pdftoppm -f N -l N -r 110 -gray -png <PDF> /home/claude/build/work/review-cN/p`, then view with the Read tool). Do not read the whole book; the review copy holds the text you need.

## The rule of judgment (fixed)
- Judge by the book's text alone, never by general knowledge or by what is commonly held.
- The author's view is the reference even where it differs from the common view: never write a finding against it, and never ask to change an answer built on it.
- A finding must quote the book text that proves it, with its page. A finding you cannot support with a quotation from the book is not a finding: leave it out.

## What to check (the worker's own wording only; do not re-check verbatim quotes)
- The approved answer is right according to the book, and every other option is really wrong (never two defensible answers), including options built on errors in classmates' files.
- For true/false: the approved verdict is right, and the justification (التعليل) states the book's reason correctly and completely enough to earn full marks.
- The summary, explanations and essay points never say what the book does not say, never omit a condition or exception that changes a rule, and never attribute a statement to anyone other than whom the book attributes it to (the author's own view versus «الفقه», a named scholar, a court, a convention, or vice versa).
- When the book gives more than one opinion on a point, the question names whose opinion it asks about, so it never has two answers.
- A fill-in blank admits only one answer.
- Multiple choice and fill-in options: the answer must not be reachable without understanding: every wrong option is a mistake a student who has not mastered the lesson would make; none can be dismissed as off-topic; the correct one does not stand out by length, precision, being the only one in the book's wording, or sharing a word with the question; no pair of opposite options or absolute word («دائماً، فقط») in the wrong options gives it away. List every question that can be solved by elimination, with the reason.
- The error type in brackets fits the mistake the option or false statement was built on (one of: خلط مصطلح بشبيهه، حكم لحالة أخرى، شرط أو ركن ناقص، رقم أو تاريخ قريب، رأي منسوب إلى غير قائله، تعميم وإطلاق). Report only clear mismatches.
- Anything examinable in the book text that the summary leaves out entirely.

## Report
Write `/home/claude/build/reviews/report-cN.md` in Arabic, then end with a short message saying how many findings you wrote.
- One block per finding:
  `المعرّف | الخطأ | الصواب | نص الكتاب الذي يثبته «...» | الصفحة`
- Order: (1) wrong facts or wrong attributions, (2) wrong or doubtful answers and justifications, (3) questions solvable by elimination, (4) wrong error-type labels, (5) examinable points missing from the summary.
- Then a short separate section «أخطاء في النص المستخرج» for any transcription error you happened to notice (do not proofread the whole transcription).
- No style preferences. Do not edit any file other than your report. Do not run git.
