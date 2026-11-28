#!/usr/bin/env python3
"""Unit tests for the positional API contracts of the public video Spaces."""

import importlib.util
from pathlib import Path


SOURCE = Path(__file__).resolve().parents[1] / "jobs" / "hf-space-video.py"
SPEC = importlib.util.spec_from_file_location("zikr_hf_space_video", SOURCE)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Could not load the Hugging Face video adapter module.")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def fake_handle_file(value):
    return ("handled-file", value)


wan = MODULE.build_wan_predict_arguments(
    fake_handle_file,
    "/tmp/conditioning.png",
    "cinematic landscape",
    8,
    12345,
)
assert len(wan) == 9, f"WAN API requires 9 positional inputs, received {len(wan)}"
assert wan[0] == ("handled-file", "/tmp/conditioning.png")
assert wan[1] == "cinematic landscape"
assert wan[2] == 4, "WAN steps must be the third argument"
assert wan[3] == MODULE.NEGATIVE_PROMPT, "WAN negative prompt must follow steps"
assert wan[4] == 5.0, "WAN duration must be clamped to the Space's 5-second limit"
assert wan[5:7] == (1.0, 1.0), "WAN guidance values must occupy their own slots"
assert wan[7] == 12345
assert wan[8] is False, "WAN must use the deterministic request seed"

wan_min = MODULE.build_wan_predict_arguments(
    fake_handle_file, "/tmp/conditioning.png", "prompt", 1, -5
)
assert wan_min[4] == 2.0, "WAN duration must not fall below 2 seconds"
assert wan_min[7] == 0, "WAN seed must be clamped to a non-negative value"

ltx = MODULE.build_ltx_predict_arguments("prompt", 8, 42)
assert len(ltx) == 13, f"LTX API requires 13 positional inputs, received {len(ltx)}"
assert ltx[:4] == ("prompt", MODULE.NEGATIVE_PROMPT, None, None)
assert ltx[4:8] == (512, 704, "text-to-video", 6)
assert ltx[8:] == (9, 42, True, 3.0, False)

print("Hugging Face WAN/LTX adapter contract tests passed.")
