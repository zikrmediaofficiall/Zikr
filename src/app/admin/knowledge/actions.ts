'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminPermission } from '@/features/admin/services/admin';
import { requireAdminStepUp } from '@/features/admin/services/security';
import { recordAdminAuditEvent } from '@/features/admin/services/audit';
import { runPostCommitAudit } from '@/features/admin/services/post-commit-audit';
import {
  mergeKnowledgeSourceMetadata,
  validateKnowledgePublication,
} from '@/features/admin/services/knowledge-publication-policy';
import { supabaseServerAdminRequest } from '@/lib/supabase/server';

function text(formData: FormData, key: string, required = false) {
  const value = String(formData.get(key) ?? '').trim();
  if (required && !value) throw new Error(`الحقل ${key} مطلوب.`);
  return value || null;
}

function id(formData: FormData) {
  const value = text(formData, 'id');
  return value && /^[0-9a-f-]{8,}$/i.test(value) ? value : null;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
}

type ExistingKnowledgeRecord = {
  id: string;
  published: boolean;
  metadata: Record<string, unknown> | null;
};

async function findExistingBiographyRecord(
  table: 'companions' | 'scholars',
  recordId: string | null,
  normalizedSlug: string,
): Promise<ExistingKnowledgeRecord | null> {
  const filter = recordId
    ? `id=eq.${encodeURIComponent(recordId)}`
    : `slug=eq.${encodeURIComponent(normalizedSlug)}`;
  const rows = await supabaseServerAdminRequest<ExistingKnowledgeRecord[]>(
    `/rest/v1/${table}?${filter}&select=id,published,metadata&limit=1`,
  );
  if (recordId && !rows[0]) {
    throw new Error('السجل المطلوب تحريره غير موجود. حدّث الصفحة قبل المحاولة مرة أخرى.');
  }
  return rows[0] ?? null;
}

type AdminAuditEvent = Parameters<typeof recordAdminAuditEvent>[0];
async function recordAdminAuditEventSafely(event: AdminAuditEvent): Promise<boolean> {
  return runPostCommitAudit(
    () => recordAdminAuditEvent(event),
    (error) => console.error("[admin/knowledge] audit event failed after committed mutation:", error),
  );
}

export async function saveCompanionAction(formData: FormData) {
  await requireAdminPermission("knowledge.manage");
  await requireAdminStepUp("content.publish", "/admin/knowledge");
  const nameAr = text(formData, 'name_ar', true)!;
  const nameEn = text(formData, 'name_en') ?? nameAr;
  const normalizedSlug = slug(text(formData, 'slug') ?? nameAr);
  if (!normalizedSlug) throw new Error('الرابط المختصر للصحابي مطلوب.');

  const recordId = id(formData);
  const existing = await findExistingBiographyRecord('companions', recordId, normalizedSlug);
  const published = formData.has('published');
  const bioAr = text(formData, 'bio_ar');
  const sourceInput = text(formData, 'source');
  const existingSource = typeof existing?.metadata?.source === 'string'
    ? String(existing.metadata.source)
    : null;
  const source = sourceInput ?? existingSource;
  const publicationError = validateKnowledgePublication({
    kind: 'biography',
    published,
    wasPublished: existing?.published ?? false,
    arabicText: bioAr,
    source,
  });
  if (publicationError) throw new Error(publicationError);

  const payload = {
    name_ar: nameAr,
    name_en: nameEn,
    slug: normalizedSlug,
    bio_ar: bioAr,
    bio_en: text(formData, 'bio_en'),
    category: text(formData, 'category'),
    thumbnail_url: text(formData, 'thumbnail_url'),
    featured_image_url: text(formData, 'featured_image_url'),
    order_num: Number(text(formData, 'order_num') ?? 0) || null,
    published,
    metadata: mergeKnowledgeSourceMetadata(existing?.metadata, source),
    updated_at: new Date().toISOString(),
  };
  await supabaseServerAdminRequest(
    existing
      ? `/rest/v1/companions?id=eq.${encodeURIComponent(existing.id)}`
      : '/rest/v1/companions?on_conflict=slug',
    {
      method: existing ? 'PATCH' : 'POST',
      headers: { Prefer: existing ? 'return=minimal' : 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(payload),
    },
  );
  await recordAdminAuditEventSafely({
    action: "knowledge.companion.save",
    permission: "knowledge.manage",
    resourceType: "companions",
    resourceId: existing?.id ?? recordId ?? normalizedSlug,
    metadata: { slug: normalizedSlug, published },
  });
  revalidatePath('/companions'); revalidatePath('/admin/knowledge');
}

export async function saveScholarAction(formData: FormData) {
  await requireAdminPermission("knowledge.manage");
  await requireAdminStepUp("content.publish", "/admin/knowledge");
  const nameAr = text(formData, 'name_ar', true)!;
  const nameEn = text(formData, 'name_en') ?? nameAr;
  const normalizedSlug = slug(text(formData, 'slug') ?? nameAr);
  if (!normalizedSlug) throw new Error('الرابط المختصر للعالم مطلوب.');

  const recordId = id(formData);
  const existing = await findExistingBiographyRecord('scholars', recordId, normalizedSlug);
  const published = formData.has('published');
  const bioAr = text(formData, 'bio_ar');
  const sourceInput = text(formData, 'source');
  const existingSource = typeof existing?.metadata?.source === 'string'
    ? String(existing.metadata.source)
    : null;
  const source = sourceInput ?? existingSource;
  const publicationError = validateKnowledgePublication({
    kind: 'biography',
    published,
    wasPublished: existing?.published ?? false,
    arabicText: bioAr,
    source,
  });
  if (publicationError) throw new Error(publicationError);

  const payload = {
    name_ar: nameAr,
    name_en: nameEn,
    slug: normalizedSlug,
    bio_ar: bioAr,
    bio_en: text(formData, 'bio_en'),
    thumbnail_url: text(formData, 'thumbnail_url'),
    website_url: text(formData, 'website_url'),
    youtube_url: text(formData, 'youtube_url'),
    published,
    metadata: mergeKnowledgeSourceMetadata(existing?.metadata, source),
    updated_at: new Date().toISOString(),
  };
  await supabaseServerAdminRequest(
    existing
      ? `/rest/v1/scholars?id=eq.${encodeURIComponent(existing.id)}`
      : '/rest/v1/scholars?on_conflict=slug',
    {
      method: existing ? 'PATCH' : 'POST',
      headers: { Prefer: existing ? 'return=minimal' : 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(payload),
    },
  );
  await recordAdminAuditEventSafely({
    action: "knowledge.scholar.save",
    permission: "knowledge.manage",
    resourceType: "scholars",
    resourceId: existing?.id ?? recordId ?? normalizedSlug,
    metadata: { slug: normalizedSlug, published },
  });
  revalidatePath('/scholars'); revalidatePath('/admin/knowledge');
}

export async function saveSurahAction(formData: FormData) {
  await requireAdminPermission("knowledge.manage");
  const surahId = Number(text(formData, 'id'));
  const order = Number(text(formData, 'order'));
  const ayahsCount = Number(text(formData, 'ayahs_count'));
  if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) throw new Error('رقم السورة يجب أن يكون بين 1 و114.');
  if (!Number.isInteger(order) || order < 1) throw new Error('ترتيب السورة غير صحيح.');
  if (!Number.isInteger(ayahsCount) || ayahsCount < 1) throw new Error('عدد الآيات غير صحيح.');
  const nameAr = text(formData, 'name_ar', true)!;
  await supabaseServerAdminRequest(`/rest/v1/quran_surahs?id=eq.${surahId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ name_ar: nameAr, name_en: text(formData, 'name_en') ?? nameAr, name_translation: text(formData, 'name_translation'), slug: slug(text(formData, 'slug') ?? nameAr), order, ayahs_count: ayahsCount, revelation_place: text(formData, 'revelation_place'), updated_at: new Date().toISOString() }) });
  await recordAdminAuditEventSafely({
    action: "knowledge.surah.update",
    permission: "knowledge.manage",
    resourceType: "quran_surahs",
    resourceId: String(surahId),
    metadata: { order, ayahsCount },
  });
  revalidatePath('/quran'); revalidatePath(`/quran/${slug(text(formData, 'slug') ?? nameAr)}`); revalidatePath('/admin/knowledge');
}

export async function saveHadithAction(formData: FormData) {
  await requireAdminPermission("knowledge.manage");
  await requireAdminStepUp("content.publish", "/admin/knowledge");
  const bookId = text(formData, 'book_id', true)!;
  const hadithNumber = text(formData, 'hadith_number', true)!;
  const textAr = text(formData, 'text_ar', true)!;
  const hadithId = id(formData);
  if (hadithId) {
    const existing = await supabaseServerAdminRequest<Array<{ id: string; published: boolean }>>(
      `/rest/v1/hadiths?id=eq.${encodeURIComponent(hadithId)}&select=id,published&limit=1`,
    );
    if (!existing[0]) {
      throw new Error('الحديث المطلوب تحريره غير موجود. حدّث الصفحة قبل المحاولة مرة أخرى.');
    }
  }
  const published = formData.has('published');
  const gradeAr = text(formData, 'grade_ar');
  const reference = text(formData, 'ref');
  const publicationError = validateKnowledgePublication({
    kind: 'hadith',
    published,
    arabicText: textAr,
    source: reference,
    grade: gradeAr,
  });
  if (publicationError) throw new Error(publicationError);

  const payload = {
    book_id: bookId,
    hadith_number: hadithNumber,
    text_ar: textAr,
    text_en: text(formData, 'text_en'),
    narrator_ar: text(formData, 'narrator_ar'),
    narrator_en: text(formData, 'narrator_en'),
    chapter: text(formData, 'chapter'),
    grade_ar: gradeAr,
    grade_en: text(formData, 'grade_en'),
    ref: reference,
    published,
    updated_at: new Date().toISOString(),
  };
  await supabaseServerAdminRequest(
    hadithId ? `/rest/v1/hadiths?id=eq.${encodeURIComponent(hadithId)}` : '/rest/v1/hadiths',
    { method: hadithId ? 'PATCH' : 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(payload) },
  );
  await recordAdminAuditEventSafely({
    action: "knowledge.hadith.save",
    permission: "knowledge.manage",
    resourceType: "hadiths",
    resourceId: hadithId,
    metadata: { bookId, hadithNumber, published },
  });
  revalidatePath('/hadith'); revalidatePath('/admin/knowledge');
}
