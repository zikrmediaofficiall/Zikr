import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  mergeKnowledgeSourceMetadata,
  validateKnowledgePublication,
} from "../../src/features/admin/services/knowledge-publication-policy";

test("new biographies remain drafts until Arabic biography and source are supplied", () => {
  assert.equal(
    validateKnowledgePublication({
      kind: "biography",
      published: false,
      arabicText: "",
      source: "",
    }),
    null,
  );
  assert.match(
    validateKnowledgePublication({
      kind: "biography",
      published: true,
      wasPublished: false,
      arabicText: "سيرة موثقة",
      source: "",
    }) ?? "",
    /المصدر أو المرجع مطلوب/,
  );
  assert.match(
    validateKnowledgePublication({
      kind: "biography",
      published: true,
      wasPublished: false,
      arabicText: "",
      source: "كتاب موثق",
    }) ?? "",
    /النص العربي مطلوب/,
  );
  assert.equal(
    validateKnowledgePublication({
      kind: "biography",
      published: true,
      wasPublished: false,
      arabicText: "سيرة موثقة",
      source: "كتاب موثق",
    }),
    null,
  );
});

test("legacy published biographies are not blocked or silently rewritten", () => {
  assert.equal(
    validateKnowledgePublication({
      kind: "biography",
      published: true,
      wasPublished: true,
      arabicText: "سيرة قائمة",
      source: null,
    }),
    null,
  );
  assert.deepEqual(
    mergeKnowledgeSourceMetadata({ reviewedBy: "editor", version: 2 }, null),
    { reviewedBy: "editor", version: 2 },
  );
  assert.deepEqual(
    mergeKnowledgeSourceMetadata({ reviewedBy: "editor" }, "  كتاب موثق  "),
    { reviewedBy: "editor", source: "كتاب موثق" },
  );
});

test("published hadiths require Arabic text, reference and grade", () => {
  assert.equal(
    validateKnowledgePublication({
      kind: "hadith",
      published: false,
      arabicText: "",
      source: "",
      grade: "",
    }),
    null,
  );
  assert.match(
    validateKnowledgePublication({
      kind: "hadith",
      published: true,
      arabicText: "نص الحديث",
      source: "",
      grade: "صحيح",
    }) ?? "",
    /المصدر أو المرجع مطلوب/,
  );
  assert.match(
    validateKnowledgePublication({
      kind: "hadith",
      published: true,
      arabicText: "نص الحديث",
      source: "صحيح البخاري",
      grade: "",
    }) ?? "",
    /درجة الحديث مطلوبة/,
  );
  assert.equal(
    validateKnowledgePublication({
      kind: "hadith",
      published: true,
      arabicText: "نص الحديث",
      source: "صحيح البخاري",
      grade: "صحيح",
    }),
    null,
  );
});

test("admin forms default new records to draft and provide source fields", () => {
  const page = readFileSync("src/app/admin/knowledge/page.tsx", "utf8");
  const actions = readFileSync("src/app/admin/knowledge/actions.ts", "utf8");
  const service = readFileSync("src/features/admin/services/knowledge.ts", "utf8");

  assert.match(page, /function Published\(\{ checked = false \}/);
  assert.match(page, /name="source" label="المصدر \/ المرجع"/);
  assert.match(page, /name="source" label="المصدر" defaultValue=\{item\.metadata/);
  assert.match(actions, /validateKnowledgePublication/);
  assert.match(actions, /findExistingBiographyRecord/);
  assert.match(actions, /method: existing \? 'PATCH' : 'POST'/);
  assert.match(service, /youtube_url,published,metadata&order=created_at\.desc/);
});
