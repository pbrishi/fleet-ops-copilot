"""Incident triage: the LLM extracts severity, scenario and contributing party; rules route."""
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from fleet_ops_copilot.routing import route

load_dotenv()

PROMPTS_DIR = Path(__file__).resolve().parents[2] / "prompts"
DEFAULT_MODEL = "gemini-flash-latest"


class Triage(BaseModel):
    severity: Literal["S1", "S2", "S3", "S4"]
    scenario: Literal[
        "REAR_STRUCK", "SIDESWIPE_MERGE", "INTERSECTION_TURN", "BACKING",
        "PARKED_OR_DOOR", "VULNERABLE_ROAD_USER", "OBJECT_OR_INFRA", "OTHER",
    ]
    contributing_party: Literal["AV", "AV_OPERATOR", "OTHER_PARTY", "ENVIRONMENT", "UNCLEAR"]
    summary: str = Field(description="One sentence, at most 30 words")


_client = None


def client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client()
    return _client


def triage(narrative: str, prompt_version: str = "v1", model: str = DEFAULT_MODEL) -> dict:
    template = (PROMPTS_DIR / f"triage_{prompt_version}.md").read_text()
    resp = client().models.generate_content(
        model=model,
        contents=template.replace("{narrative}", narrative),
        config=types.GenerateContentConfig(
            temperature=0,
            response_mime_type="application/json",
            response_schema=Triage,
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
        ),
    )
    result = resp.parsed.model_dump()
    owner, secondary = route(result["severity"], result["scenario"], result["contributing_party"])
    usage = resp.usage_metadata
    return {
        **result,
        "owner": owner,
        "secondary": secondary,
        "input_tokens": usage.prompt_token_count,
        "output_tokens": (usage.candidates_token_count or 0) + (usage.thoughts_token_count or 0),
    }
