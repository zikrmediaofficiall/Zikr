// Checks that every quran.com/<surah>/<ayah> reference in the article data points at an ayah that exists.
import { readFileSync, readdirSync } from 'node:fs';
const counts = JSON.parse(readFileSync('scripts/data/quran-ayah-counts.json', 'utf8'));
const dir = 'src/features/articles/data';
const errors = [];
let checked = 0;
for (const file of readdirSync(dir).filter((f) => f.startsWith('longform-'))) {
  const text = readFileSync(`${dir}/${file}`, 'utf8');
  for (const m of text.matchAll(/\bq\((\d+),\s*(\d+),/g)) {
    checked++;
    const [s, a] = [Number(m[1]), Number(m[2])];
    const max = counts[String(s)] ?? counts[s];
    if (!max || a < 1 || a > max) errors.push(`${file}: invalid Quran reference ${s}:${a}`);
  }
  for (const m of text.matchAll(/https:\/\/quran\.com\/(\d+)\/(\d+)/g)) {
    checked++;
    const [s, a] = [Number(m[1]), Number(m[2])];
    const max = counts[String(s)] ?? counts[s];
    if (!max || a < 1 || a > max) errors.push(`${file}: invalid Quran URL ${s}:${a}`);
  }
}
if (errors.length) { console.error('ARTICLE_SOURCES_FAILED\n' + errors.join('\n')); process.exit(1); }
console.log(`ARTICLE_SOURCES_OK (${checked} Quran references checked)`);
