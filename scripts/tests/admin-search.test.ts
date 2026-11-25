import assert from "node:assert/strict";
import { matchesAdminSearch, normalizeAdminSearch } from "../../src/features/admin/utils/admin-search";

assert.equal(normalizeAdminSearch("  إِدارة   الْمُحْتَوَى  "), "اداره المحتوي");
assert.equal(normalizeAdminSearch("مكتبة المحتوى"), "مكتبه المحتوي");
assert.equal(normalizeAdminSearch("  VIDEO QA  "), "video qa");
assert.equal(matchesAdminSearch("إدارة", "إدارة المحتوى", "/admin/content"), true);
assert.equal(matchesAdminSearch("video", "مصنع الفيديوهات", "/admin/video/qa"), true);
assert.equal(matchesAdminSearch("/admin/kids", "عالم الأطفال", "/admin/kids"), true);
assert.equal(matchesAdminSearch("غير موجود", "تحليلات المنصة", "/admin/analytics"), false);
assert.equal(matchesAdminSearch("   ", "أي صفحة"), true);

console.log("Admin search normalization and matching tests passed.");
