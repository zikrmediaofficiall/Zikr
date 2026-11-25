export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { requireAdminPermission } from "@/features/admin/services/admin";
import { getServerEnv } from "@/lib/env";
import { reviewState, summarizeBranches, summarizePulls, type BranchSummary, type PullSummary } from "@/features/admin/omnis/code-center";

export const metadata: Metadata = { title: "مركز تطوير الكود | ZIKR OMNIS" };

const REPO = "https://api.github.com/repos/zikrmediaofficiall/Zikr";
const STATE_LABEL = { draft: "مسودة", needs_reviewer: "بلا مراجع", in_review: "قيد المراجعة" } as const;

async function github(path: string): Promise<unknown | null> {
  const token = getServerEnv().GITHUB_DISPATCH_TOKEN?.trim();
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  try {
    let response = await fetch(`${REPO}${path}`, { headers: token ? { ...headers, Authorization: `Bearer ${token}` } : headers, cache: "no-store", signal: AbortSignal.timeout(6000) });
    if (response.status === 401 && token) response = await fetch(`${REPO}${path}`, { headers, cache: "no-store", signal: AbortSignal.timeout(6000) });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

export default async function OmnisCodeCenterPage() {
  await requireAdminPermission("system.manage");
  const [rawPulls, rawBranches] = await Promise.all([github("/pulls?state=open&per_page=30"), github("/branches?per_page=50")]);
  const pulls: PullSummary[] | null = rawPulls ? summarizePulls(rawPulls) : null;
  const branches: BranchSummary[] | null = rawBranches ? summarizeBranches(rawBranches) : null;
  return (
    <Container className="space-y-7 py-8 md:py-10" dir="rtl">
      <header className="space-y-3">
        <Link href="/admin/omnis" className="text-xs text-brand-gold/70 hover:text-brand-gold">← OMNIS</Link>
        <h1 className="text-3xl font-bold text-brand-gold">مركز تطوير الكود</h1>
        <p className="max-w-4xl text-sm leading-7 text-brand-cream/55">عرض للقراءة فقط للفروع وطلبات الدمج المفتوحة من GitHub. لا دمج ولا إنشاء فروع من هنا: الدمج إلى main يتم يدويًا في GitHub بعد المراجعة. إن لم يكن المستودع عامًا فالعرض يحتاج GITHUB_DISPATCH_TOKEN صالحًا.</p>
      </header>
      <section className="space-y-2">
        <h2 className="font-bold text-brand-gold">طلبات الدمج المفتوحة</h2>
        {pulls === null ? <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-100/85">تعذرت قراءة طلبات الدمج من GitHub.</p> : null}
        <ul className="space-y-2 text-sm">
          {(pulls ?? []).map((pr) => (
            <li key={pr.number} className="rounded-xl border border-brand-gold/10 bg-black/15 p-3">
              <a href={pr.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-cream hover:text-brand-gold">#{pr.number} {pr.title}</a>
              <p className="mt-1 text-xs text-brand-cream/50" dir="ltr">{pr.head} ({pr.headSha}) → {pr.base} · {pr.author} · {STATE_LABEL[reviewState(pr)]}{pr.targetsMain ? " · يستهدف main" : ""}</p>
            </li>
          ))}
          {pulls && !pulls.length ? <li className="text-xs text-brand-cream/40">لا توجد طلبات مفتوحة.</li> : null}
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="font-bold text-brand-gold">الفروع</h2>
        {branches === null ? <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-100/85">تعذرت قراءة الفروع من GitHub.</p> : null}
        <ul className="grid gap-1 text-xs sm:grid-cols-2">
          {(branches ?? []).map((b) => <li key={b.name} className="rounded-lg border border-brand-gold/10 bg-black/15 p-2 font-mono" dir="ltr">{b.name}{b.protectedBranch ? " (محمي)" : ""}</li>)}
        </ul>
      </section>
    </Container>
  );
}
