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


class RiderReply(BaseModel):
    reply: str
    cited_articles: list[str]
    escalation: Literal["none", "human", "emergency"]


def system_prompt(ride_context: dict | None) -> str:
    template = json.loads((RIDER_DIR / "prompt_bundle.json").read_text())["system_prompt"]
    ctx = json.dumps(ride_context, indent=1) if ride_context else "No active ride."
    return template.replace("{ride_context}", ctx)


def respond(messages: list[dict], ride_context: dict | None, model: str = DEFAULT_MODEL) -> dict:
    """messages: [{"role": "user"|"assistant", "text": ...}], oldest first, ending with the rider's turn."""
    contents = [
        types.Content(role="user" if m["role"] == "user" else "model", parts=[types.Part(text=m["text"])])
        for m in messages
    ]
    resp = client().models.generate_content(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt(ride_context),
            temperature=0.2,
            response_mime_type="application/json",
            response_schema=RiderReply,
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
        ),
    )
    return resp.parsed.model_dump()
