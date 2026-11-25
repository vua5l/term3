#!/bin/bash
# prep.sh <part e.g. c10-a> <range e.g. 55-55>: validators -> reviews/auto-<part>.txt ; list items -> crops/list-<part>.txt
set -u
part=$1; range=$2; ch=${part%%-*}
P=/home/claude/build/work/$ch/$part.js
A=/home/claude/build/reviews/auto-$part.txt
cd /home/claude/term3
{ echo "== law135/validate.js --range $range"; node _tools/law135/validate.js "$P" --range "$range" 2>&1;
  echo "== common/validate.js --pages --range $range"; node _tools/common/validate.js _tools/law135/images.json "$P" --pages /home/claude/work/law135 --range "$range" 2>&1; } > "$A"
node _tools/law135/listitems.js "$P" "/home/claude/build/work/$ch/$part.check.txt" | sed -E "s/^r([0-9]+) \|/$part-r\1 |/" > /home/claude/build/crops/list-$part.txt
echo "$part: auto $(grep -c -i -E 'error' "$A") error-lines, $(grep -c -i -E 'warn' "$A") warn-lines; list $(wc -l < /home/claude/build/crops/list-$part.txt) items"
