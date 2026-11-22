#!/bin/bash
# يرسم صفحة الكتاب ويقرؤها آلياً قبل عمل البانين. وصفحة الملف تحسبها pdfpage.py (الملف الكامل والنسخة الجزئية، وصورتا ص 446–447)
p=$1; D=${BOOK_TSV:-/home/claude/book/tsv}; export BOOK_PDF=${BOOK_PDF:?set BOOK_PDF to the book PDF}
mkdir -p "$D"
if [ ! -f "$D/p$p.png" ]; then python3 "$(dirname "$0")/pdfpage.py" --render "$p" 300 "$D/p$p.png" >/dev/null || exit 1; fi
if [ ! -f "$D/p$p.tsv" ]; then tesseract "$D/p$p.png" "$D/p$p" -l ara --psm 3 tsv >/dev/null 2>&1; fi
