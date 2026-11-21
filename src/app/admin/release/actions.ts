
"use server";

import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/features/admin/services/admin";
import { requireAdminStepUp } from "@/features/admin/services/security";

const SIGNED_RELEASE_BLOCKER =
  "لم يبدأ الإصدار: إنشاء الوسم الحالي لا يثبت توقيعاً تشفيرياً للـGit tag. أُوقف الإطلاق حتى تُجهز آلية توقيع محمية وتتحقق CI من هوية التوقيع على الوسم نفسه.";

export async function createAndroidReleaseAction() {
  await requireAdminPermission("release.manage");
  await requireAdminStepUp("release.manage", "/admin/release");

  // Fail closed: do not create commits, tags, drafts, or alter download metadata
  // until the release path can cryptographically sign and verify its tag.
  redirect("/admin/release?android_release_error=" + encodeURIComponent(SIGNED_RELEASE_BLOCKER));
}
