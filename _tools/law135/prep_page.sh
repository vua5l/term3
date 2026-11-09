#!/bin/bash
p=$1; D=${BOOK_TSV:-/home/claude/book/tsv}; PDF=${BOOK_PDF:?set BOOK_PDF to the book PDF}
if [ ! -f "$D/p$p.png" ]; then pdftoppm -r 300 -gray -f $((p-97)) -l $((p-97)) -png "$PDF" "$D/prep$p" && mv "$D"/prep$p-*.png "$D/p$p.png"; fi
if [ ! -f "$D/p$p.tsv" ]; then tesseract "$D/p$p.png" "$D/p$p" -l ara --psm 3 tsv >/dev/null 2>&1; fi
