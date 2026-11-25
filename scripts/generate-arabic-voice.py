#!/usr/bin/env python3
"""Generate Arabic narration for ZIKR videos using the free Edge TTS endpoint."""
from __future__ import annotations

import argparse
import asyncio
import os
import re
import sys
from pathlib import Path


def clean_text(value: str) -> str:
    text = re.sub(r"<[^>]+>", " ", value or "")
    text = text.replace("—", "، ").replace("–", "، ").replace("•", "، ")
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        raise ValueError("Arabic narration text is empty")
    # Keep the canonical words intact while removing formatting that sounds awkward when spoken.
    return text[:5000]


VOICE_PROFILES = {
    "msa": {"voice": "ar-SA-HamedNeural", "rate": "-10%", "pitch": "-1Hz"},
    "hadith": {"voice": "ar-SA-HamedNeural", "rate": "-10%", "pitch": "-1Hz"},
    "documentary": {"voice": "ar-SA-HamedNeural", "rate": "-8%", "pitch": "-1Hz"},
    "egyptian": {"voice": "ar-EG-ShakirNeural", "rate": "-6%", "pitch": "0Hz"},
    "kids": {"voice": "ar-EG-ShakirNeural", "rate": "-6%", "pitch": "0Hz"},
    "documentary_female_msa": {"voice": "ar-SA-ZariyahNeural", "rate": "-8%", "pitch": "0Hz"},
    "egyptian_female_story": {"voice": "ar-EG-SalmaNeural", "rate": "-6%", "pitch": "0Hz"},
    "egyptian_male_story": {"voice": "ar-EG-ShakirNeural", "rate": "-7%", "pitch": "0Hz"},
    "levant_male_story": {"voice": "ar-JO-TaimNeural", "rate": "-8%", "pitch": "-1Hz"},
}
DEFAULT_PROFILE = "msa"



def signed(value: str, unit: str) -> str:
    """edge-tts rejects unsigned values such as "0Hz" ("Invalid pitch"); it needs "+0Hz" or "-7%"."""
    cleaned = (value or "").strip()
    if cleaned and cleaned[0] not in "+-":
        cleaned = "+" + cleaned
    if not cleaned.endswith(unit):
        cleaned = cleaned + unit if cleaned[-1:].isdigit() else cleaned
    return cleaned


async def synthesize(text: str, output: Path, voice: str, rate: str, pitch: str) -> None:
    rate = signed(rate, "%")
    pitch = signed(pitch, "Hz")
    output.parent.mkdir(parents=True, exist_ok=True)
    normalized_text = clean_text(text)

    # Prefer Microsoft's neural voices when the endpoint accepts the runner's
    # connection. GitHub-hosted datacenter IPs can still receive WebSocket 403s,
    # even on edge-tts versions with Sec-MS-GEC v2 support.
    try:
        import edge_tts  # type: ignore

        # Hosted-runner connections to the Edge endpoint can be rejected intermittently, so retry
        # with backoff before giving up on the requested voice.
        attempts = int(os.getenv("ARABIC_TTS_EDGE_ATTEMPTS", "4") or "4")
        last_error: Exception | None = None
        for attempt in range(1, max(1, attempts) + 1):
            try:
                communicate = edge_tts.Communicate(normalized_text, voice=voice, rate=rate, pitch=pitch)
                await communicate.save(str(output))
                if output.exists() and output.stat().st_size >= 1024:
                    print(f"[arabic-tts] Primary provider succeeded: edge-tts voice={voice} attempt={attempt}")
                    return
                raise RuntimeError("Edge TTS returned an empty or tiny audio file")
            except Exception as attempt_error:  # noqa: BLE001
                last_error = attempt_error
                output.unlink(missing_ok=True)
                if attempt < attempts:
                    delay = 4 * attempt
                    print(f"[arabic-tts] Edge TTS attempt {attempt} failed ({str(attempt_error)[:160]}); retrying in {delay}s", file=sys.stderr)
                    await asyncio.sleep(delay)
        raise last_error if last_error else RuntimeError("Edge TTS failed")
    except Exception as edge_error:
        output.unlink(missing_ok=True)
        if voice.strip().lower().startswith("ar-eg-"):
            raise RuntimeError(
                "The requested Egyptian Arabic neural voice is unavailable; "
                "the generic Arabic fallback is disabled to preserve the requested dialect."
            ) from edge_error
        print(
            "[arabic-tts] Edge TTS failed; trying the no-key Google Translate Arabic fallback: "
            + str(edge_error)[:300],
            file=sys.stderr,
        )

    try:
        from gtts import gTTS  # type: ignore
    except ImportError as exc:
        raise RuntimeError(
            "Edge TTS failed and the gTTS fallback is not installed. "
            "Install gTTS==2.5.4 in the worker environment."
        ) from exc

    try:
        fallback_tld = os.getenv("ARABIC_TTS_FALLBACK_TLD", "com").strip() or "com"
        gTTS(normalized_text, lang="ar", tld=fallback_tld, slow=False).save(str(output))
        if not output.exists() or output.stat().st_size < 1024:
            output.unlink(missing_ok=True)
            raise RuntimeError("gTTS returned an empty or tiny audio file")
        print(f"[arabic-tts] Fallback provider succeeded: gTTS Arabic (tld={fallback_tld})")
    except Exception as fallback_error:
        output.unlink(missing_ok=True)
        raise RuntimeError(
            f"Both Arabic TTS providers failed. Edge TTS failed; gTTS fallback failed: "
            f"{str(fallback_error)[:400]}"
        ) from fallback_error

def resolve_profile() -> dict[str, str]:
    profile_name = os.getenv("ARABIC_TTS_PROFILE", DEFAULT_PROFILE).strip().lower()
    return VOICE_PROFILES.get(profile_name, VOICE_PROFILES[DEFAULT_PROFILE])


def default_voice() -> str:
    explicit = os.getenv("ARABIC_TTS_VOICE", "").strip()
    return explicit or resolve_profile()["voice"]


def default_rate() -> str:
    return os.getenv("ARABIC_TTS_RATE", resolve_profile()["rate"])


def default_pitch() -> str:
    return os.getenv("ARABIC_TTS_PITCH", resolve_profile()["pitch"])


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--voice", default=default_voice())
    parser.add_argument("--rate", default=default_rate())
    parser.add_argument("--pitch", default=default_pitch())
    args = parser.parse_args()
    try:
        asyncio.run(synthesize(args.text, Path(args.output), args.voice, args.rate, args.pitch))
    except Exception as exc:  # pragma: no cover - CLI error path
        print(f"[arabic-tts] {exc}", file=sys.stderr)
        return 1
    print(f"[arabic-tts] Generated {args.output} with {args.voice} rate={args.rate} pitch={args.pitch}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
