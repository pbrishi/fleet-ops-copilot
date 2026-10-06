"""Pre-record the rider app's fixed in-car announcements with Gemini TTS (voice Charon).

Fixed phrases ship as small static audio files, so they play instantly in the car and cost
nothing per ride. Re-run after editing ANNOUNCEMENTS. Requires macOS `afconvert` for AAC.
Usage: uv run python scripts/generate_announcements.py
"""
import subprocess
import time
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

OUT = Path("web/public/voice")
VOICE = "Charon"
STYLE = "Say in a calm, warm, professional tone, like a premium car's announcement system:"

ANNOUNCEMENTS = {
    "welcome": "Welcome to Auto-Drive. Please fasten your seatbelt, and tap Start when you're ready to go.",
    "seatbelt": "Please put on your seatbelts. We'll start once everyone is buckled.",
    "starting": "Thank you. The doors are closing. Here we go.",
    "arriving": "We're arriving at your destination. Please exit on the right, on the curb side.",
    "traffic_left": "Watch out. Traffic is approaching on your left. Please exit on the right.",
    "traffic_clear": "The traffic has passed. It's safe to exit.",
    "pulling_over": "Pulling over safely. Support has been notified.",
    "stopped": "We've stopped safely. You can continue, or end your trip here.",
}


def main() -> None:
    load_dotenv(".env")
    client = genai.Client()
    OUT.mkdir(parents=True, exist_ok=True)
    for name, text in ANNOUNCEMENTS.items():
        for attempt in range(4):
            try:
                resp = client.models.generate_content(
                    model="gemini-3.8-flash-tts",
                    contents=f"{STYLE} {text}",
                    config=types.GenerateContentConfig(
                        response_modalities=["AUDIO"],
                        speech_config=types.SpeechConfig(voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=VOICE))),
                    ),
                )
                break
            except Exception:
                if attempt == 3:
                    raise
                time.sleep(15 * (attempt + 1))
        wav = OUT / f"{name}.wav"
        wav.write_bytes(resp.candidates[0].content.parts[0].inline_data.data)  # complete WAV from Gemini
        m4a = OUT / f"{name}.m4a"
        subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "64000", str(wav), str(m4a)], check=True)
        wav.unlink()
        print(f"{name}: {m4a.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
