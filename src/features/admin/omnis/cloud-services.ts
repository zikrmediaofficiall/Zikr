/**
 * OMNIS P11-01: read-only cloud services overview. Reports only whether configuration is present and
 * non-secret identifiers (environment, short commit, Supabase host). Secret values are never returned.
 */
export type ServiceCheck = { key: string; label: string; ok: boolean; detail: string };

const has = (env: Record<string, string | undefined>, name: string) => Boolean(env[name]?.trim());

export function supabaseHost(url: string | undefined): string | null {
  try {
    return url ? new URL(url).host : null;
  } catch {
    return null;
  }
}

export function buildCloudServiceChecks(env: Record<string, string | undefined>): ServiceCheck[] {
  const sha = env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
  const host = supabaseHost(env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL);
  return [
    { key: "vercel-env", label: "بيئة Vercel", ok: has(env, "VERCEL_ENV"), detail: has(env, "VERCEL_ENV") ? `${env.VERCEL_ENV}${sha ? ` · ${sha}` : ""}` : "غير مضبوطة (تشغيل محلي أو خارج Vercel)" },
    { key: "supabase-url", label: "عنوان Supabase", ok: Boolean(host), detail: host ?? "غير مضبوط أو غير صالح" },
    { key: "supabase-service", label: "مفتاح خدمة Supabase", ok: has(env, "SUPABASE_SERVICE_ROLE_KEY"), detail: has(env, "SUPABASE_SERVICE_ROLE_KEY") ? "موجود (القيمة مخفية)" : "غير موجود" },
    { key: "supabase-anon", label: "مفتاح Supabase العام", ok: has(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY"), detail: has(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY") ? "موجود" : "غير موجود" },
    { key: "storage-cloudinary", label: "تخزين Cloudinary", ok: has(env, "CLOUDINARY_CLOUD_NAME") && has(env, "CLOUDINARY_API_KEY") && has(env, "CLOUDINARY_API_SECRET"), detail: has(env, "CLOUDINARY_CLOUD_NAME") ? `السحابة: ${env.CLOUDINARY_CLOUD_NAME}` : "غير مضبوط" },
    { key: "github-token", label: "رمز GitHub للتشغيل", ok: has(env, "GITHUB_DISPATCH_TOKEN"), detail: has(env, "GITHUB_DISPATCH_TOKEN") ? "موجود (القيمة مخفية)" : "غير موجود" },
  ];
}
