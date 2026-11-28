#!/usr/bin/env python3
import argparse
import json
import os
import re
from pathlib import Path
from urllib.error import URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

MAX_VIDEO_BYTES = 50 * 1024 * 1024
MIN_VIDEO_BYTES = 1024
SPACE_ID_PATTERN = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
BUILTIN_SPACE_IDS = {
    "zerogpu-aoti/wan2-2-fp8da-aoti-faster",
    "Lightricks/ltx-video-distilled",
}


NEGATIVE_PROMPT = ("worst quality, inconsistent motion, blurry, jittery, distorted, text, letters, words, Arabic script, "
                   "calligraphy, writing, typography, subtitles, captions, watermark, logo, people, human figure, face, hands")


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--provider", choices=["wan2_2_fast", "ltx_fast"], required=True)
    parser.add_argument("--space", required=True)
    parser.add_argument("--prompt-file", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--duration", type=float, default=8)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--image")
    parser.add_argument("--public-space", action="store_true")
    return parser.parse_args()


def build_wan_predict_arguments(handle_file, image_path, prompt, duration, seed):
    """Build the verified 9-input WAN 2.2 Gradio API contract."""
    negative_prompt = NEGATIVE_PROMPT
    duration_seconds = max(2.0, min(5.0, float(duration)))
    guidance_scale = 1.0
    guidance_scale_2 = 1.0
    steps = 4
    seed_value = min(2_147_483_647, max(0, int(seed)))
    randomize_seed = False
    return (
        handle_file(image_path),
        prompt,
        steps,
        negative_prompt,
        duration_seconds,
        guidance_scale,
        guidance_scale_2,
        seed_value,
        randomize_seed,
    )


def build_ltx_predict_arguments(prompt, duration, seed):
    """Build the independent 13-input LTX Distilled Gradio API contract."""
    negative_prompt = NEGATIVE_PROMPT
    input_image = None
    input_video = None
    height = 512
    width = 704
    mode = "text-to-video"
    duration_seconds = max(2, min(6, int(round(duration))))
    frames_to_use = 9
    seed_value = min(4_294_967_295, max(0, int(seed)))
    randomize_seed = True
    guidance_scale = 3.0
    improve_texture = False
    return (
        prompt,
        negative_prompt,
        input_image,
        input_video,
        height,
        width,
        mode,
        duration_seconds,
        frames_to_use,
        seed_value,
        randomize_seed,
        guidance_scale,
        improve_texture,
    )


def _effective_port(parsed):
    # An explicit port 0 is not the HTTPS default; do not treat falsy ports as absent.
    return parsed.port if parsed.port is not None else (443 if parsed.scheme == "https" else 80)


def should_use_public_space(space_id, requested_public=False):
    return requested_public or space_id not in BUILTIN_SPACE_IDS


def is_trusted_space_origin(space_origin):
    try:
        parsed = urlsplit(space_origin)
        host = (parsed.hostname or "").lower()
        if parsed.scheme != "https" or parsed.username or parsed.password:
            return False
        if _effective_port(parsed) != 443:
            return False
        if host.endswith(".hf.space"):
            return True
        return host == "huggingface.co" and parsed.path.startswith("/spaces/")
    except (TypeError, ValueError):
        return False


def is_allowed_space_file_url(candidate, space_origin):
    if not is_trusted_space_origin(space_origin):
        return False
    try:
        target = urlsplit(candidate)
        origin = urlsplit(space_origin)
        if target.scheme != "https" or target.username or target.password:
            return False
        if (target.hostname or "").lower() != (origin.hostname or "").lower():
            return False
        if _effective_port(target) != _effective_port(origin):
            return False
        base_path = origin.path.rstrip("/")
        if base_path and target.path != base_path and not target.path.startswith(base_path + "/"):
            return False
        return True
    except (TypeError, ValueError):
        return False


class SameOriginRedirectHandler(HTTPRedirectHandler):
    def __init__(self, space_origin):
        super().__init__()
        self.space_origin = space_origin

    def redirect_request(self, request, file_pointer, code, message, headers, new_url):
        if not is_allowed_space_file_url(new_url, self.space_origin):
            raise URLError("Gradio output redirect left the configured Hugging Face Space origin.")
        return super().redirect_request(request, file_pointer, code, message, headers, new_url)


# materialize_output verifies the ISO-BMFF "ftyp" signature; do not choose
# WebM/AVI/MKV alternatives that the downloader intentionally cannot persist.
VIDEO_FILE_EXTENSIONS = {".mp4", ".m4v", ".mov"}


def _is_video_file_reference(candidate, mime_type=None):
    if not isinstance(candidate, str) or not candidate.strip():
        return False
    normalized_mime = mime_type.lower().split(";", 1)[0].strip() if isinstance(mime_type, str) else ""
    if normalized_mime in {"video/mp4", "video/quicktime"}:
        return True
    value = candidate.strip()
    try:
        parsed = urlsplit(value)
        path = parsed.path if parsed.scheme else value.split("?", 1)[0].split("#", 1)[0]
        return Path(path).suffix.lower() in VIDEO_FILE_EXTENSIONS
    except (TypeError, ValueError):
        return False


def extract_file_value(value, depth=0):
    """Find an actual video file reference in nested Gradio FileData/Video responses."""
    if depth > 8 or value is None:
        return None
    if isinstance(value, str):
        candidate = value.strip()
        return candidate if _is_video_file_reference(candidate) else None
    if isinstance(value, (list, tuple)):
        for item in value:
            candidate = extract_file_value(item, depth + 1)
            if candidate:
                return candidate
        return None
    if isinstance(value, dict):
        mime_type = value.get("mime_type") or value.get("mimeType")
        # Explicit file fields are preferred. MIME metadata can identify signed or
        # extension-less Gradio file URLs, but is not inherited by arbitrary text.
        for key in ("url", "path", "file", "name"):
            candidate_value = value.get(key)
            if isinstance(candidate_value, str) and _is_video_file_reference(candidate_value, mime_type):
                return candidate_value.strip()
            candidate = extract_file_value(candidate_value, depth + 1)
            if candidate:
                return candidate
        for key in ("video", "data", "output", "result"):
            candidate = extract_file_value(value.get(key), depth + 1)
            if candidate:
                return candidate
        return None
    mime_type = getattr(value, "mime_type", None) or getattr(value, "mimeType", None)
    for key in ("url", "path", "file", "name"):
        candidate_value = getattr(value, key, None)
        if isinstance(candidate_value, str) and _is_video_file_reference(candidate_value, mime_type):
            return candidate_value.strip()
        candidate = extract_file_value(candidate_value, depth + 1)
        if candidate:
            return candidate
    for key in ("video", "data", "output", "result"):
        candidate = extract_file_value(getattr(value, key, None), depth + 1)
        if candidate:
            return candidate
    return None

def resolve_file_url(value, space_origin, encode_file_path):
    source = extract_file_value(value)
    if not isinstance(source, str) or not source:
        raise RuntimeError("Gradio output must include a file URL or remote file path.")
    if source.startswith(("http://", "https://")):
        return source
    if not is_trusted_space_origin(space_origin):
        raise RuntimeError("Cannot construct a file URL for an untrusted Space origin.")
    encoded_path = encode_file_path(source)
    if not isinstance(encoded_path, str) or not encoded_path:
        raise RuntimeError("Gradio returned an invalid remote file path.")
    return space_origin.rstrip("/") + "/file=" + encoded_path


def materialize_output(value, destination, space_origin, token=None):
    source = extract_file_value(value)
    if not isinstance(source, str) or not source or not source.startswith(("http://", "https://")):
        raise RuntimeError("Gradio output must include a remote file URL; local paths are not accepted.")
    if not is_allowed_space_file_url(source, space_origin):
        raise RuntimeError("Gradio output URL must remain on the configured HTTPS Hugging Face Space origin.")

    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(destination.name + ".part")
    headers = {"Authorization": "Bearer " + token} if token else {}
    opener = build_opener(SameOriginRedirectHandler(space_origin))

    try:
        request = Request(source, headers=headers)
        with opener.open(request, timeout=120) as response:
            if not is_allowed_space_file_url(response.geturl(), space_origin):
                raise RuntimeError("Gradio output download resolved outside the configured Space origin.")
            content_length = response.headers.get("Content-Length")
            if content_length is not None:
                try:
                    expected_size = int(content_length)
                except (TypeError, ValueError) as exc:
                    raise RuntimeError("Gradio output returned an invalid Content-Length.") from exc
                if expected_size < 0 or expected_size > MAX_VIDEO_BYTES:
                    raise RuntimeError("Gradio output exceeds the configured video size limit.")

            total_size = 0
            with temporary.open("wb") as target:
                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk:
                        break
                    total_size += len(chunk)
                    if total_size > MAX_VIDEO_BYTES:
                        raise RuntimeError("Gradio output exceeds the configured video size limit.")
                    target.write(chunk)

        if total_size < MIN_VIDEO_BYTES:
            raise RuntimeError("Downloaded video is empty or suspiciously small.")
        with temporary.open("rb") as downloaded:
            header = downloaded.read(12)
        if len(header) < 12 or header[4:8] != b"ftyp":
            raise RuntimeError("Gradio output is not a valid MP4 container.")
        temporary.replace(destination)
        return destination
    except Exception:
        temporary.unlink(missing_ok=True)
        raise


def main():
    args = parse_args()
    if not SPACE_ID_PATTERN.fullmatch(args.space):
        raise RuntimeError("Hugging Face Space must use the owner/name identifier format.")

    args.public_space = should_use_public_space(args.space, args.public_space)
    if args.public_space:
        # A public custom Space must not inherit a runner's token or cached login.
        os.environ["HF_TOKEN"] = ""
        os.environ.pop("HF_TOKEN_PATH", None)
        os.environ.pop("HUGGING_FACE_HUB_TOKEN", None)
        os.environ.pop("HUGGINGFACE_HUB_TOKEN", None)
        os.environ["HF_HUB_DISABLE_IMPLICIT_TOKEN"] = "1"
        os.environ["HF_HOME"] = str(Path(args.output).parent / "hf-home")

    try:
        from gradio_client import Client, handle_file, utils
    except Exception as exc:
        raise RuntimeError(
            "gradio_client is not installed. The workflow must install it before the video worker runs."
        ) from exc

    prompt = Path(args.prompt_file).read_text(encoding="utf-8").strip()
    token = None if args.public_space else (os.environ.get("HF_TOKEN") or None)
    client = Client(args.space, token=token, verbose=False, download_files=False)
    space_origin = getattr(client, "src_prefixed", None) or getattr(client, "src", None)
    if not isinstance(space_origin, str) or not is_trusted_space_origin(space_origin):
        raise RuntimeError("Gradio client resolved to an untrusted or non-HTTPS Space origin.")

    if args.provider == "wan2_2_fast":
        if not args.image:
            raise RuntimeError("Wan2.2 fast requires an input image.")
        # The current Space function signature is:
        # image, prompt, steps, negative_prompt, duration_seconds,
        # guidance_scale, guidance_scale_2, seed, randomize_seed.
        # Keep positional arguments in the separately tested adapter above.
        duration_seconds = max(2.0, min(5.0, float(args.duration)))
        result = client.predict(
            *build_wan_predict_arguments(handle_file, args.image, prompt, duration_seconds, args.seed),
            api_name="/generate_video",
        )
    else:
        # LTX exposes a different 13-input contract; keep its argument order isolated.
        # Generate a short visual layer; FFmpeg composes/loops it into the final reel.
        duration_seconds = max(2, min(6, int(round(args.duration))))
        result = client.predict(
            *build_ltx_predict_arguments(prompt, duration_seconds, args.seed),
            api_name="/text_to_video",
        )

    video_url = resolve_file_url(result, space_origin, utils.encode_file_path)
    output = materialize_output(video_url, args.output, space_origin, token=token)
    print(
        json.dumps(
            {
                "provider": args.provider,
                "space": args.space,
                "output": str(output),
                "size": output.stat().st_size,
                "durationRequested": args.duration,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
