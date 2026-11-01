# Brief: independent review of one chapter of study-site content

You are an independent reviewer. Another worker read a scanned law textbook and wrote study content for a Saudi law student's exam site (constitutional law, exam on Wednesday 4 Nov 2026). You did not write it; your job is to find its errors before the student studies from it. You do **not** edit the content: you write a report, and the editor verifies every item against the book before fixing.

Book: «النظام السياسي والدستوري للمملكة العربية السعودية» — أ.د. أحمد بن عبدالله بن باز.

## Inputs (for your chapter `cN`)
- Review copy: `/home/claude/work/reviews/review-cN.md` — every summary paragraph, card, question (with its approved answer marked [المعتمد]), essay point, table, map node and last-night point, each with its id and page.
- Page images — **the reference**: `/home/claude/work/pages/bNNN.png`, named by printed book page.
- Transcription of the same pages: `/home/claude/work/source/cN-text.md` — machine-made by the author; use it to locate text quickly, never as proof.
- Automatic pre-check: `/home/claude/work/reviews/auto-cN.txt` — validator warnings (a verbatim quote not found in the transcription, a possible date). A first screen, not a verdict.

## Method
1. Read the automatic pre-check, then go through the review copy lesson by lesson with the page images of that lesson open (Read the images of the lesson's pages).
2. Every item marked «نص حرفي» (verbatim definitions and quotes) must match the page image word for word (diacritics aside; omissions marked «(...)» are allowed). Check every number, list and enumeration against the image too.
3. For everything else, compare its meaning with the book; go back to the image whenever in doubt.

## What to check
- Verbatim text matches the book, and every page number is right.
- The approved answer is right according to the book, and the other options are really wrong (never two defensible answers).
- The summary, explanations and essay points never say what the book does not say, and never attribute a statement to anyone other than whom the book attributes it to. Nothing examinable on the pages is missing from the summary.
- A fill-in blank admits only one answer.
- Multiple choice (and fill-in options): the answer must not be reachable without understanding: every wrong option is a mistake a student who has not mastered the lesson would make, none can be dismissed as obviously off-topic, and the correct one does not stand out by length, precision, being the only one in the book's wording, or sharing a word with the question; no pair of opposite options or absolute word («دائماً، فقط») in the wrong options gives it away. List every question that can be solved by elimination, with the reason.
- The student's rules: no dates at all on the site (years, centuries, durations in years; the professor said dates are not examined); nothing testable about the book's own structure («ماذا يتضمن الفصل؟»); every list and count card has a lead-in saying what it lists and how many; wording self-contained (no need to open the book); table cells short, not repeated within their row, not containing their column's name.

## Report
Write `/home/claude/work/reviews/report-cN.md` in Arabic, then end with a short message saying how many items you found.
- One line per finding: `المعرّف | الخطأ | الصواب | الصفحة`. Quote the book's exact words when the finding is about wording.
- Order: (1) factual or verbatim errors, (2) wrong or doubtful answers, (3) questions solvable by elimination, (4) rule violations (dates, structure questions, missing lead-ins), (5) anything examinable missing from the summary.
- Then a short separate section «أخطاء في النص المستخرج» listing any transcription errors you happened to notice (do not proofread the whole transcription).
- Do not report style preferences, and do not edit any file other than your report.
