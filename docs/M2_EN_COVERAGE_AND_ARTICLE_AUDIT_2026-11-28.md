# M2 EN coverage and article audit (2026-11-28)

Read-only crawl of the live site with the `zikr-locale=en` cookie against all 436 sitemap URLs. Counts text nodes inside `<main>`; the shared "جاري التحميل..." placeholder is ignored.

## Per-route-group EN coverage

"Mixed" = pages that still contain Arabic UI text beyond the placeholder. "Mostly Arabic" = more than half of the text is Arabic. Quran text, hadith text and dua text are Arabic by design and are not defects.

| Route group | Pages | Mixed | Mostly Arabic |
|---|---|---|---|
| /quran | 115 | 115 | 0 |
| /content | 91 | 91 | 91 |
| /articles | 70 | 69 | 0 |
| /dua | 31 | 31 | 0 |
| /prophets | 26 | 25 | 0 |
| /battles | 22 | 22 | 21 |
| /conquests | 16 | 15 | 15 |
| /stories | 14 | 14 | 0 |
| /companions | 13 | 13 | 0 |
| /hadith | 10 | 9 | 0 |
| /scholars | 9 | 9 | 0 |
| /kids | 2 | 0 | 0 |
| / | 1 | 0 | 0 |
| /mushaf | 1 | 0 | 0 |
| /adhkar | 1 | 0 | 0 |
| /library | 1 | 1 | 0 |
| /audio | 1 | 1 | 0 |
| /knowledge | 1 | 1 | 0 |
| /videos | 1 | 0 | 0 |
| /poetry | 1 | 0 | 0 |
| /competitions | 1 | 1 | 1 |
| /tafsir | 1 | 1 | 0 |
| /about | 1 | 0 | 0 |
| /contact | 1 | 1 | 0 |
| /platform | 1 | 1 | 0 |
| /faq | 1 | 0 | 0 |
| /privacy | 1 | 0 | 0 |
| /editorial-policy | 1 | 1 | 1 |
| /terms | 1 | 0 | 0 |

## Findings

- Translated shell and above-the-fold text: /, /about, /faq, /platform, /kids, library, videos, adhkar.
- Arabic-first pages with no EN UI text: /contact, /competitions, /privacy, /terms, /editorial-policy. Legal pages (privacy, terms) need a qualified translation; they are not machine-translated here.
- Content routes whose body is Arabic source text (quran, content, battles, conquests) have no EN titles or summaries. A sourced translation is a content project, not a code fix.
- No invented translations were added. Anything not sourced stays Arabic until the owner supplies or approves text.

## Article quality sweep (69 published)

- Length: min 448, median 634, max 1011 words. None under 400.
- Duplicate openings (first 600 characters): none.
- Articles with no visible sources section or outbound link by a simple text check (15); verify by hand, the check can miss sources rendered another way:
  - /articles/five-pillars-of-islam-practical-guide
  - /articles/zakat-meaning-conditions-and-recipients
  - /articles/ramadan-preparation-practical-plan
  - /articles/khushu-in-prayer-how-to-focus
  - /articles/honoring-parents-status-and-practical-ways
  - /articles/patience-sabr-in-the-quran-types-and-training
  - /articles/hajj-and-umrah-beginner-guide
  - /articles/beautiful-names-of-allah-introduction
  - /articles/story-of-prophet-ibrahim-lessons
  - /articles/moderation-and-avoiding-waste-in-islam
  - /articles/trust-amanah-responsibility-in-islam
  - /articles/good-neighbor-rights-and-etiquette
  - /articles/guarding-the-tongue-backbiting-and-ridicule
  - /articles/sadaqah-charity-small-giving-big-reward
  - /articles/islamic-brotherhood-building-trust-and-support
