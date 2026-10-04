"""Rider support copilot: answers from the knowledge base plus live ride context.

The prompt and knowledge base live in web/src/rider/. scripts/build_rider_kb.py renders
them into prompt_bundle.json, which both the web chat route and this module load, so the
eval always tests exactly what the site runs.
"""
import json
from pathlib import Path
from typing import Literal

from google.genai import types
from pydantic import BaseModel

from fleet_ops_copilot.triage import client

RIDER_DIR = Path(__file__).resolve().parents[2] / "web" / "src" / "rider"
DEFAULT_MODEL = "gemini-flash-latest"

# Ride contexts the web chat offers as demo scenarios; mirrored in web/src/rider/scenarios.json.
SCENARIOS: dict = json.loads((RIDER_DIR / "scenarios.json").read_text())


SILENCE_RMS = 0.004  # mirrors the guard in web/src/app/api/rider-chat/route.ts and web/src/lib/audio.ts


def is_silent_wav(wav: bytes) -> bool:
    """True if a 16-bit PCM WAV is effectively silent. Silent audio is never sent to the model."""
    import array
    pcm = array.array("h", wav[44:])
    if not pcm:
        return True
    return (sum(v * v for v in pcm) / len(pcm)) ** 0.5 / 32768 < SILENCE_RMS


class RiderReply(BaseModel):
    transcript: str
    reply: str
    cited_articles: list[str]
    escalation: Literal["none", "human", "emergency"]


def system_prompt(ride_context: dict | None, bundle: Path | None = None) -> str:
    template = json.loads((bundle or RIDER_DIR / "prompt_bundle.json").read_text())["system_prompt"]
    ctx = json.dumps(ride_context, indent=1) if ride_context else "No active ride."
    return template.replace("{ride_context}", ctx)


def respond(messages: list[dict], ride_context: dict | None, model: str = DEFAULT_MODEL, audio_wav: bytes | None = None,
            bundle: Path | None = None) -> dict:
    """messages: [{"role": "user"|"assistant", "text": ...}], oldest first.
    For a voice turn, pass the rider's recording as audio_wav; it becomes the final user turn."""
    contents = [
        types.Content(role="user" if m["role"] == "user" else "model", parts=[types.Part(text=m["text"])])
        for m in messages
    ]
    if audio_wav is not None:
        contents.append(types.Content(role="user", parts=[types.Part.from_bytes(data=audio_wav, mime_type="audio/wav")]))
    resp = client().models.generate_content(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt(ride_context, bundle),
            temperature=0.2,
            response_mime_type="application/json",
            response_schema=RiderReply,
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
        ),
    )
    return resp.parsed.model_dump()
