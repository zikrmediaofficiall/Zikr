import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { HADY_SHOW, SEASON_ONE } from "../../src/features/videos/shows/hady-show";
import { SHOW_TOPIC_BACKGROUNDS, SHOW_TOPIC_THEMES, backgroundForTheme } from "../../src/features/videos/shows/topic-backgrounds";
import { estimateEpisodeSeconds, validateHadyEpisode, validateHadyEpisodeForProduction, type HadyEpisode } from "../../src/features/videos/shows/episode-contract";
import { getVideoVoiceProfile } from "../../src/features/videos/services/voice-profiles";

const templates = new Set(readdirSync("public/video/templates").filter((name) => name.endsWith(".svg")).map((name) => name.replace(/\.svg$/, "")));

// --- Host identity: one fixed Egyptian male voice, with formal voices reserved for quoted text.
const adminVideoCreateSource = readFileSync("src/app/api/admin/videos/create/route.ts", "utf8");
const adminStudioSource = readFileSync("src/features/admin/video-studio/components/advanced-video-generators.tsx", "utf8");
const videoWorkerSource = readFileSync("scripts/jobs/template-video-automation.ts", "utf8");
assert.ok(adminStudioSource.includes('<option value="quran">آية من المصحف المعتمد</option>'), "Hady must support selecting a Quran ayah as an editorial source");
assert.ok(adminStudioSource.includes("loadQuranSource()") && adminStudioSource.includes("surahId") && adminStudioSource.includes("ayahNumber"), "Hady Quran source selection must load the exact surah and ayah");
assert.ok(adminStudioSource.includes("HADY_SHOW.signature.openingAr") && adminStudioSource.includes("HADY_SHOW.signature.closingAr"), "the fixed Hady greeting and farewell must be inserted before validation");
assert.ok(adminVideoCreateSource.includes('submittedContent.sourceCategory === "quran"') && adminVideoCreateSource.includes('sourceCategory === "quran" ? "quran" as const'), "the admin API must preserve Quran provenance on the episode source reference");
assert.ok(videoWorkerSource.includes('reference.category as "quran" | "hadith" | "story"') && videoWorkerSource.includes('!["quran", "hadith", "story"].includes(String(reference.category))'), "the render worker must re-resolve Quran, Hadith and story sources before rendering");
const hostVoice = getVideoVoiceProfile(HADY_SHOW.host.hostVoiceProfile);
assert.equal(hostVoice.id, "egyptian_male_story");
assert.equal(hostVoice.voice, "ar-EG-ShakirNeural");
assert.equal(getVideoVoiceProfile(HADY_SHOW.host.quoteVoiceProfiles.quran).id, "quran_reciter");
assert.equal(getVideoVoiceProfile(HADY_SHOW.host.quoteVoiceProfiles.hadith).id, "hadith_male_msa");

// --- Artwork ships as safe 1080x1920 SVG layers and the mouth states differ.
const art = Object.values(HADY_SHOW.host.artwork);
for (const file of art) {
  assert.ok(existsSync(file), `missing host artwork ${file}`);
  const svg = readFileSync(file, "utf8");
  assert.match(svg, /^<svg[^>]+width="1080"[^>]+height="1920"/, `${file} must be 1080x1920`);
  assert.doesNotMatch(svg, /<script|<foreignObject|<image\b|on[a-z]+\s*=|javascript:|(?:href|src)\s*=|url\(\s*["']?https?:/i, `${file} contains active or external content`);
  assert.ok(svg.length < 20_000, `${file} is unexpectedly large`);
}
assert.equal(new Set(art.map((file) => readFileSync(file, "utf8"))).size, art.length, "every mouth state must be a distinct drawing");

// --- Background mapping only points to files that exist.
assert.deepEqual([...SHOW_TOPIC_THEMES].sort(), Object.keys(SHOW_TOPIC_BACKGROUNDS).sort());
for (const theme of SHOW_TOPIC_THEMES) {
  const { primary, alternates } = SHOW_TOPIC_BACKGROUNDS[theme];
  for (const name of [primary, ...alternates]) assert.ok(templates.has(name), `theme ${theme} points to missing background ${name}`);
  assert.equal(backgroundForTheme(theme), primary);
  assert.equal(backgroundForTheme(theme, alternates.length + 1), [primary, ...alternates][(alternates.length + 1) % (alternates.length + 1)]);
}

// --- Season one: twelve distinct weekly topics, none approved without review.
assert.equal(SEASON_ONE.length, 12);
assert.deepEqual(SEASON_ONE.map((topic) => topic.week), Array.from({ length: 12 }, (_, index) => index + 1));
assert.equal(new Set(SEASON_ONE.map((topic) => topic.theme)).size, 12, "each week needs its own theme");
assert.equal(new Set(SEASON_ONE.map((topic) => topic.titleAr)).size, 12);
for (const topic of SEASON_ONE) {
  assert.equal(topic.reviewStatus, "candidate", `week ${topic.week} must stay a candidate until a reviewer approves it`);
  assert.ok(topic.candidateSources.length > 0);
  assert.ok(SHOW_TOPIC_THEMES.includes(topic.theme));
}

// --- Episode contract. The fixture is synthetic filler, not programme content.
const POOL = [
  "إحنا كلنا بنمر بأيام تقيلة وبنحس إن الدنيا ضاغطة علينا أوي.",
  "المهم إننا نفتكر إن ربنا قريب وبيسمع من غير ما نرفع صوتنا.",
  "خلّي قلبك مطمّن وابدأ بخطوة صغيرة النهارده بدل ما تستنى اللحظة المثالية.",
  "وده اللي بيخلّي الحكاية دي تستاهل نقف عندها شوية.",
  "يعني الحكاية مش مجرد معلومة، دي حاجة نقدر نعيشها كل يوم.",
];
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;
function filler(target: number, start = 0) {
  const parts: string[] = [];
  for (let index = start; words(parts.join(" ")) < target; index += 1) parts.push(POOL[index % POOL.length]);
  return parts.join(" ");
}
const verified = [{ kind: "quran", reference: "21:83-84", verified: true }] as const;
function fixture(): HadyEpisode {
  return {
    week: 1,
    titleAr: "حلقة تجريبية",
    theme: "patience",
    background: "moonlit-sea",
    segments: [
      { id: "hook", text: `${HADY_SHOW.signature.openingAr} ${filler(22)}` },
      { id: "advice", text: filler(58, 1) },
      { id: "story", text: `${filler(92, 2)} {{quote:0}} ${filler(12, 3)}`, quotes: [{ kind: "quran", reference: "21:83-84" }], sourceRefs: verified },
      { id: "reflection", text: filler(36, 4) },
      { id: "closing", text: `${filler(12, 2)} ${HADY_SHOW.signature.closingAr}` },
    ],
    review: { status: "draft" },
  };
}
const clone = (episode: HadyEpisode, edit: (draft: { segments: { id: string; text: string; quotes?: unknown; sourceRefs?: unknown }[]; background: string; review: { status: string; reviewer?: string; reviewedAt?: string } }) => void) => {
  const draft = JSON.parse(JSON.stringify(episode));
  edit(draft);
  return draft as HadyEpisode;
};
const fails = (episode: HadyEpisode, pattern: RegExp) => {
  const result = validateHadyEpisode(episode, templates);
  assert.equal(result.ok, false, `expected a failure matching ${pattern}`);
  assert.ok(result.errors.some((message) => pattern.test(message)), `no error matched ${pattern}: ${result.errors.join(" | ")}`);
};

const good = validateHadyEpisode(fixture(), templates);
assert.equal(good.ok, true, good.errors.join(" | "));
assert.ok(good.estimatedSeconds >= HADY_SHOW.episode.minSeconds && good.estimatedSeconds <= HADY_SHOW.episode.maxSeconds, `estimate ${good.estimatedSeconds}s`);
assert.equal(estimateEpisodeSeconds(fixture()), good.estimatedSeconds);
assert.equal(validateHadyEpisodeForProduction(fixture(), templates).ok, false, "draft structural QA must not release Hady for rendering");
const humanReviewedHady = clone(fixture(), (draft) => {
  draft.review = { status: "approved", reviewer: "editor-1", reviewedAt: "2026-11-24T12:00:00.000Z" };
});
assert.equal(validateHadyEpisodeForProduction(humanReviewedHady, templates).ok, true,
  validateHadyEpisodeForProduction(humanReviewedHady, templates).errors.join(" | "));
assert.equal(validateHadyEpisodeForProduction(clone(humanReviewedHady, (draft) => {
  draft.review = { status: "approved", reviewer: "system:zikr-video-factory", reviewedAt: "2026-11-24T12:00:00.000Z" };
}), templates).ok, false, "automated QA cannot impersonate the Hady human reviewer");
assert.equal(validateHadyEpisodeForProduction(clone(humanReviewedHady, (draft) => {
  draft.segments[2]!.sourceRefs = [{ kind: "quran", reference: "different:reference", verified: true }];
}), templates).ok, false, "a different verified source cannot authorize the episode quote");

fails(clone(fixture(), (d) => d.segments.reverse()), /exactly hook/);
fails(clone(fixture(), (d) => { d.background = "not-a-background"; }), /Unknown background/);
fails(clone(fixture(), (d) => { d.segments[1].text = filler(58, 1).replace("ربنا", "الذي ربنا"); }), /formal-only/);
fails(clone(fixture(), (d) => { d.segments[1].text += " قال رسول الله كلام."; }), /quote card/);
fails(clone(fixture(), (d) => { d.segments[1].text += " ودي حاجة حرام."; }), /not religious rulings/);
fails(clone(fixture(), (d) => { d.segments[3].text = "قصير."; }), /reflection: 1 words/);
fails(clone(fixture(), (d) => { d.segments[2].text = d.segments[2].text.replace("{{quote:0}}", ""); }), /every quote/);
fails(clone(fixture(), (d) => { d.segments[2].text += " {{quote:3}}"; }), /no matching quote/);
fails(clone(fixture(), (d) => { d.segments[2].sourceRefs = [{ kind: "quran", reference: "21:83-84", verified: false }]; }), /story needs at least one source/);
fails(clone(fixture(), (d) => { d.segments[2].text += " رضي الله عنه."; d.segments[2].sourceRefs = []; }), /story needs at least one source|honorifics/);
fails(clone(fixture(), (d) => { d.segments[0].text = d.segments[0].text.replace(HADY_SHOW.signature.openingAr, "أهلا بيكم."); }), /signature greeting/);
fails(clone(fixture(), (d) => { d.segments[4].text = d.segments[4].text.replace(HADY_SHOW.signature.closingAr, "مع السلامة."); }), /signature farewell/);
fails(clone(fixture(), (d) => { d.review = { status: "approved" }; }), /name its reviewer/);
fails(clone(fixture(), (d) => { d.segments[2].text = `${filler(190, 2)} {{quote:0}}`; }), /story: \d+ words|Estimated duration/);

console.log(`Religious show contract passed: ${HADY_SHOW.titleAr}, ${SEASON_ONE.length} candidate topics, ${templates.size} backgrounds available.`);
