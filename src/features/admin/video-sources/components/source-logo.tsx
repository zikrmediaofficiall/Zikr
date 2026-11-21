"use client";

import { useState } from "react";

export function SourceLogo({ src, label }: { src: string | null; label: string }) {
  const [failed, setFailed] = useState(!src);
  return (
    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-brand-gold/15 bg-black/25">
      {!failed && src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={label + " logo"}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-9 w-9 object-contain"
        />
      ) : (
        <span aria-hidden="true" className="text-xl font-bold text-brand-gold">
          {label.trim().slice(0, 1) || "؟"}
        </span>
      )}
    </div>
  );
}
