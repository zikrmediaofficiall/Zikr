# Article source audit

Scope: the long-form editorial articles in `src/features/articles/data/longform-editorial.ts` and `longform-extra-*.ts`.

## Method
- Quran references: each `quran.com/<surah>/<ayah>` link is checked by `scripts/verify-article-sources.mjs` against `scripts/data/quran-ayah-counts.json` (ayah counts taken from the app's own `quran_ayahs` table, 6236 rows). Articles paraphrase the meaning and do not quote long passages. Existing Uthmani text is never edited.
- Hadith references: each `sunnah.com/<collection>:<number>` link was opened and the wording or chapter was matched to the point the article makes before use. Hadith are paraphrased with the collection and number.
- Anything that could not be matched to a source was left out of the article instead of being published as fact.

## Not independently verified
- `muslim:49` (changing evil): book and number matched, wording matched on the page.
- Gradings and scholarly rulings are not discussed beyond what Sahih al-Bukhari and Sahih Muslim already carry.
- Exceptions to backbiting are summarized in general terms and the article points readers to scholars.

## Recommendation
Have a qualified scholar review the articles before reapplying to AdSense. The author label "فريق التحرير في ذِكر" is the editorial label already used on existing articles.
