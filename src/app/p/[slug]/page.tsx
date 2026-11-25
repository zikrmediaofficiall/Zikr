export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { PageBlocksView } from "@/features/site-content/components/page-blocks-view";
import { isCustomPagesEnabled, slugProblem } from "@/features/site-content/pages/page-blocks";
import { getPublishedPage } from "@/features/site-content/pages/page-store";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  // Off by default: the route does not exist publicly until the flag is set.
  if (!isCustomPagesEnabled() || slugProblem(slug)) return null;
  try {
    return await getPublishedPage(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await load((await params).slug);
  return page ? { title: page.title } : { title: "غير موجود", robots: { index: false } };
}

export default async function CustomPage({ params }: Props) {
  const page = await load((await params).slug);
  if (!page) notFound();
  return (
    <Container className="max-w-3xl space-y-6 py-10" dir="rtl">
      <h1 className="text-3xl font-bold text-brand-gold">{page.title}</h1>
      <PageBlocksView blocks={page.blocks} />
    </Container>
  );
}
