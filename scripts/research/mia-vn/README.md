# mia.vn harvester (CC-FOOD-010)

One-off tools that produced `research-exchange/inbox/CC-FOOD-010.json`. Work directory `$W` holds downloads (untrusted data); run the scripts from here with `python3 -I`.

1. `curl -s https://mia.vn/sitemap/blog_post.xml -o $W/dl/posts.xml`
2. `python3 -I select.py $W/dl/posts.xml $W/dl/selected.json` — HCMC dish listicles by URL slug → catalogue dish id (+ "regional style not confirmed" flag)
3. `./fetch.sh $W` — polite fetch (1 request / 1.5 s) into `$W/dl/pages/`
4. `python3 -I parse.py $W` — heading name, `Địa chỉ`, `Giờ mở cửa` → `$W/dl/harvest.json`
5. `python3 -I build_batch.py $W` — manual name clean-ups / drops (from the source headings), writes the batch
6. `npm run intake -- research-exchange/inbox/<batch>.json` (dry run), then `--apply`

Re-running for a new batch: change the batch id and the output path in `build_batch.py` (it writes `/home/user/K-sExperience/research-exchange/inbox/CC-FOOD-010.json`) and re-check the name fixes, which are keyed by address.
