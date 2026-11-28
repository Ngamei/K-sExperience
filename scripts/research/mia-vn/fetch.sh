#!/bin/bash
# polite fetch of selected mia.vn articles (1 req / 1.5 s), cached
S=$1; mkdir -p $S/dl/pages
python3 -I -c "import json,sys;[print(x['url']) for x in json.load(open(sys.argv[1]))]" $S/dl/selected.json | while read u; do
  f=$S/dl/pages/$(basename "$u").html; [ -s "$f" ] && continue
  curl -s --max-time 40 -A "KsExperienceResearch/0.1 (low-volume venue research)" "$u" -o "$f"; sleep 1.5
done; ls $S/dl/pages | wc -l
