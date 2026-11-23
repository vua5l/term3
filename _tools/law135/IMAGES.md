# Addendum to BRIEF.md: lessons built from the page images (no transcription)

The pages of your lesson have **no transcription**, and none is to be made (the student's rule: the book's text is not copied). You build from the page images. BRIEF.md applies with the changes below; where they differ, this addendum wins.

## Your source (replaces BRIEF's «Verbatim transcription» and «Page images» items)
- **Page images** of your pages only: `/home/claude/work/law135/p<N>.png` (300 dpi, named by the printed page number). View a page with
  `BOOK_TSV=/home/claude/work/law135 python3 -I /home/claude/term3/_tools/law135/view.py N` (the whole page, margins trimmed; Read the printed path), and a band of it at higher resolution with
  `BOOK_TSV=/home/claude/work/law135 python3 -I /home/claude/term3/_tools/law135/view.py N TOP BOTTOM` (fractions of the page height, e.g. `0.75 1` for the footnotes).
- Open all your pages first and read text and footnotes. Do not reopen a page you have already viewed (it stays in your context); use a band only for small print or a doubtful word. Do not open pages outside your range.
- Check the printed page number on each image against its file name; if they differ, stop and say so in your report.
- Do not read the OCR files in that folder (`*.tsv`, `*.txt`): they are for the checking tools and contain errors.
- Do not use `crop_quote.py` or `zoom_word.py`: the final comparison of everything you quote is done after you, by an independent checker with enlarged crops of the pages.

## Do not copy the book's text
- Never write out a page or a continuous paragraph of the book, in a file or in a message, not even with slight changes. Summary paragraphs (`p`, `note`), card backs other than `bk: true` definitions, `why`, essay `points`, tables, `night`: in your own words (normal modern spelling).
- Verbatim only: definitions (`q` blocks, `def` cards with `bk: true`, `defs` entries), the items of an enumeration (`list` blocks, as the book words them), numbers, dates, article numbers and names. Copy them from the image word by word, in the book's spelling (الدولى، فى، التى as printed), omissions marked `(...)`: do not drop a letter or a particle such as «لا», do not swap a word for a synonym, do not complete what you cannot read.
- An article number with a paragraph is written as displayed in the book (e.g. «المادة 1/38»).

## Check before you finish (replaces BRIEF's check)
Run both on your file, fix every ERROR and look at every WARNING; rerun until clean:
1. `node /home/claude/term3/_tools/law135/validate.js <your file> --range <first>-<last lesson number>` (no transcription argument).
2. `node /home/claude/term3/_tools/common/validate.js /home/claude/term3/_tools/law135/images.json <your file> --pages /home/claude/work/law135 --range <first>-<last>`
   - «verbatim text differs from the machine readings»: an OCR reading read that spot differently. Look at the word in the page image: fix your text if you were wrong; if your text is what the image shows, leave it and list it in your report (OCR errs often).
   - «verbatim text not located»: check the page number you gave and your wording.

## Report additions (to BRIEF's final report)
- **To check on the images:** one line per number, date, article number or foreign word you used anywhere (summary, cards, questions, tables, night, defs), in the form `page | the item with 3–5 words around it, as printed`. Do not list `q`, `def`, `defs` or `list` texts: they are taken from your file automatically.
- Every word you could not read with certainty in the image, with its page and the words around it.
- Do not paste the content itself into the report.
