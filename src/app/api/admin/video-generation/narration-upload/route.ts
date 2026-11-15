import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminStepUpApi } from "@/features/admin/services/security";
import { recordAdminAuditEvent } from "@/features/admin/services/audit";
import { runPostCommitAudit } from "@/features/admin/services/post-commit-audit";
import { readBoundedRequestBytes } from "@/lib/request/bounded-json-body";
import {
  markAdminNarrationAssetAuditRecorded,
  registerAdminNarrationAsset,
} from "@/features/media/services/media-assets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const AUDIO_TYPES: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
};

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function hasValidAudioSignature(bytes: Uint8Array, contentType: string) {
  if (bytes.byteLength < 12) return false;
  const ascii = new TextDecoder().decode(bytes.slice(0, 12));

  if (contentType === "audio/mpeg" || contentType === "audio/mp3") {
    const id3 = ascii.startsWith("ID3");
    const frameSync = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
    return id3 || frameSync;
  }

  if (contentType === "audio/mp4" || contentType === "audio/x-m4a") {
    return ascii.slice(4, 8) === "ftyp";
  }

  if (contentType === "audio/wav" || contentType === "audio/x-wav") {
    return ascii.slice(0, 4) === "RIFF" && ascii.slice(8, 12) === "WAVE";
  }

  if (contentType === "audio/ogg") {
    return ascii.slice(0, 4) === "OggS";
  }

  if (contentType === "audio/webm") {
    return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  }

  return false;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminStepUpApi("video.manage", "/admin/video/studio");
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error, nextPath: "nextPath" in auth ? auth.nextPath : undefined },
      { status: auth.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  const contentType = (request.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const extension = AUDIO_TYPES[contentType];
  if (!extension)
    return jsonError("الصيغ المدعومة: MP3 أو M4A أو WAV أو OGG أو WebM.", 415);

  try {
    const body = await readBoundedRequestBytes(request, MAX_AUDIO_BYTES);
    if (!body.ok) return jsonError(body.error, body.status);
    const bytes = body.bytes;
    if (!bytes.byteLength) return jsonError("ملف الصوت فارغ.", 400);

    if (!hasValidAudioSignature(bytes, contentType)) {
      return jsonError("محتوى الملف لا يطابق صيغة الصوت المعلنة.", 415);
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
    if (!cloudName || !apiKey || !apiSecret) {
      return jsonError("تخزين التسجيلات غير مهيأ على الخادم.", 503);
    }

    // Audio is uploaded directly to Cloudinary; it must not use the Supabase
    // videos bucket, which is reserved for no persistent generated-media files.
    const publicId = `audio-human-${randomUUID()}`;
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: contentType }), `${publicId}.${extension}`);
    form.append("public_id", publicId);
    form.append("overwrite", "false");
    form.append("invalidate", "true");
    form.append("tags", "zikr,narration,video_generation");
    form.append("context", `purpose=video_generation_narration|uploaded_by=${auth.profile.id}`);
    const authorization = `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`;
    const upload = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/video/upload`,
      {
        method: "POST",
        headers: { Authorization: authorization },
        body: form,
        signal: AbortSignal.timeout(30_000),
      }
    );
    const result = await upload.json().catch(() => ({})) as {
      secure_url?: string;
      public_id?: string;
      error?: { message?: string };
    };
    if (!upload.ok || !result.secure_url || result.public_id !== publicId) {
      const recoveryRequired =
        upload.ok ||
        (typeof result.public_id === "string" && result.public_id.trim().length > 0);
      console.error("[api/admin/video-generation/narration-upload] Cloudinary response validation failed.", {
        requestedPublicId: publicId,
        returnedPublicId: result.public_id,
        status: upload.status,
        recoveryRequired,
      });
      return NextResponse.json(
        {
          error: "فشل التحقق من استجابة Cloudinary؛ احتفظنا بمرجع الرفع للمراجعة اليدوية.",
          ...(recoveryRequired ? { uploadReference: publicId, recoveryRequired: true } : {}),
        },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
    let audioUrl: URL;
    try {
      audioUrl = new URL(result.secure_url);
    } catch (urlError) {
      console.error("[api/admin/video-generation/narration-upload] Invalid Cloudinary secure URL; asset retained for reconciliation.", { publicId, urlError });
      return NextResponse.json(
        { error: "رابط التخزين الناتج غير صالح؛ احتفظنا بمرجع الرفع للمراجعة اليدوية.", uploadReference: publicId, recoveryRequired: true },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (audioUrl.protocol !== "https:" || audioUrl.hostname !== "res.cloudinary.com" ||
        !audioUrl.pathname.includes(`/${cloudName}/video/upload/`)) {
      console.error("[api/admin/video-generation/narration-upload] Non-canonical Cloudinary URL; asset retained for reconciliation.", { publicId, secureUrl: result.secure_url });
      return NextResponse.json(
        { error: "رابط التخزين الناتج غير صالح؛ احتفظنا بمرجع الرفع للمراجعة اليدوية.", uploadReference: publicId, recoveryRequired: true },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    let mediaAssetId: string;
    try {
      mediaAssetId = await registerAdminNarrationAsset({
        publicId,
        secureUrl: result.secure_url,
        contentType,
        sizeBytes: bytes.byteLength,
        createdBy: auth.profile.id,
      });
    } catch (trackingError) {
      console.error("[api/admin/video-generation/narration-upload] Cloudinary asset retained without a confirmed media_assets row:", { publicId, trackingError });
      return NextResponse.json(
        { error: "تم رفع التسجيل لكن تعذر تسجيل الأصل في مكتبة الوسائط. احتفظ بمرجع الاسترداد.", uploadReference: publicId, recoveryRequired: true },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const auditRecorded = await runPostCommitAudit(
      () => recordAdminAuditEvent({
        action: "video.narration.upload",
        permission: "video.manage",
        resourceType: "video_narration",
        resourceId: publicId,
        metadata: { contentType, byteLength: bytes.byteLength, extension },
      }),
      (auditError) => console.error("[api/admin/video-generation/narration-upload] audit event failed after Cloudinary upload:", { publicId, mediaAssetId, auditError }),
    );

    if (!auditRecorded) {
      return NextResponse.json(
        { error: "تم رفع التسجيل وتسجيله كأصل داخلي، لكن تعذر تأكيد سجل التدقيق. احتفظ بمرجع الاسترداد.", uploadReference: publicId, mediaAssetId, recoveryRequired: true },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    let assetTrackingStatus: "ready" | "reconciliation_pending" = "ready";
    try {
      await markAdminNarrationAssetAuditRecorded(mediaAssetId, publicId, contentType, auth.profile.id);
    } catch (trackingError) {
      assetTrackingStatus = "reconciliation_pending";
      console.warn("[api/admin/video-generation/narration-upload] audit succeeded but media asset state needs reconciliation:", { publicId, mediaAssetId, trackingError });
    }

    return NextResponse.json(
      { audioUrl: result.secure_url, audioSource: "human_recording", auditRecorded: true, mediaAssetId, assetTrackingStatus },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[api/admin/video-generation/narration-upload] POST:", error);
    return jsonError("تعذر رفع التسجيل الصوتي.", 500);
  }
}
