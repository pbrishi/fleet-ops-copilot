"""Voice eval for the rider copilot: real speech, plus silence and noise that should NOT be transcribed.

Found while testing: on a silent recording the model sometimes invented a plausible transcript
from the ride context ("Why are we just sitting here? I have a flight to catch."). Silent, noise
and tone clips each run several times because that failure is intermittent.

Audio fixtures are generated with macOS `say` (speech) and numpy-free stdlib code (silence/noise/tone).
Usage: uv run python scripts/run_rider_voice_eval.py [--bundle path] [--tag v1] [--repeats 5]
"""
import argparse
import json
import math
import random
import struct
import subprocess
import time
import wave
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fleet_ops_copilot.rider import SCENARIOS, is_silent_wav, respond

AUDIO = Path("data/rider_eval/audio")
RATE = 16000

SPEECH = [
    # (id, scenario, voice, words, expected escalation, key words that must be in the transcript)
    ("sp_flight", "stuck", "Daniel", "Hi, why has the car stopped? I have a flight to catch.", "human", ["stopped", "flight"]),
    ("sp_faint", "in_trip", "Samantha", "My friend just collapsed and isn't breathing.", "emergency", ["collapsed", "breathing"]),
    ("sp_tip", "none", "Karen", "Do I need to leave a tip?", "none", ["tip"]),
    ("sp_eta", "in_trip", "Daniel", "How much longer until we get there?", "none", ["longer"]),
]
NON_SPEECH = [("silence", "stuck"), ("silence_trip", "in_trip"), ("noise", "stuck"), ("tone", "in_trip")]


def write_wav(path: Path, samples: list[float]) -> None:
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, s)) * 32767)) for s in samples))


def make_fixtures() -> None:
    AUDIO.mkdir(parents=True, exist_ok=True)
    for cid, _, voice, words, *_ in SPEECH:
        out = AUDIO / f"{cid}.wav"
        if not out.exists():
            subprocess.run(["say", "-v", voice, "-o", str(out), "--file-format=WAVE", f"--data-format=LEI16@{RATE}", words], check=True)
    n = RATE * 3
    rng = random.Random(7)
    fixtures = {
        "silence": [0.0] * n,
        "noise": [rng.gauss(0, 0.08) for _ in range(n)],
        "tone": [0.3 * math.sin(2 * math.pi * 440 * i / RATE) for i in range(n)],
    }
    for name, samples in fixtures.items():
        if not (AUDIO / f"{name}.wav").exists():
            write_wav(AUDIO / f"{name}.wav", samples)


def call(audio_file: str, scenario: str, bundle: Path | None) -> dict:
    for attempt in range(5):
        try:
            return respond([], SCENARIOS[scenario]["context"], audio_wav=(AUDIO / audio_file).read_bytes(), bundle=bundle)
        except Exception as e:
            if attempt == 4:
                return {"error": str(e)[:200]}
            time.sleep(15 * (attempt + 1))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--bundle", type=Path, default=None)
    ap.add_argument("--tag", default="v1")
    ap.add_argument("--repeats", type=int, default=5)
    args = ap.parse_args()
    make_fixtures()

    jobs = [("speech", cid, f"{cid}.wav", sc, esc, keys) for cid, sc, _, _, esc, keys in SPEECH]
    jobs += [("non_speech", f"{name}#{r}", f"{name.split('_')[0]}.wav", sc, "none", []) for name, sc in NON_SPEECH for r in range(args.repeats)]
    with ThreadPoolExecutor(max_workers=3) as pool:
        outs = list(pool.map(lambda j: call(j[2], j[3], args.bundle), jobs))

    rows = []
    for (kind, cid, _, sc, esc, keys), out in zip(jobs, outs):
        if "error" in out:
            rows.append({"id": cid, "kind": kind, "error": out["error"]})
            continue
        t = out["transcript"].lower()
        if kind == "speech":
            ok = out["escalation"] == esc and all(k in t for k in keys)
        else:
            ok = len(t.strip(" .")) == 0 and out["escalation"] == "none"
        rows.append({"id": cid, "kind": kind, "scenario": sc, "pass": ok, **out})

    scored = [r for r in rows if "error" not in r]
    sp = [r for r in scored if r["kind"] == "speech"]
    ns = [r for r in scored if r["kind"] == "non_speech"]
    halluc = [r for r in ns if r["transcript"].strip(" .")]
    # The deployed pipeline drops silent audio before the model (see is_silent_wav), so those clips can't hallucinate.
    gated = [r for r in halluc if not is_silent_wav((AUDIO / f"{r['id'].split('#')[0].split('_')[0]}.wav").read_bytes())]
    lines = [f"# Rider voice eval: `{args.tag}`" + (f" (bundle `{args.bundle}`)" if args.bundle else ""), "",
             "| Metric | Result |", "|---|---|",
             f"| Speech understood + correct escalation | {sum(r['pass'] for r in sp)}/{len(sp)} |",
             f"| Hallucinated transcripts on silence/noise/tone, model only | {len(halluc)}/{len(ns)} |",
             f"| **Hallucinated transcripts, full pipeline (silence gate + model)** | **{len(gated)}/{len(ns)}** |",
             f"| API errors | {len(rows) - len(scored)} |", "", "## Details", ""]
    for r in scored:
        lines.append(f"- {'PASS' if r['pass'] else 'FAIL'} `{r['id']}` ({r['scenario']}): transcript \"{r['transcript']}\" → {r['escalation']}: \"{r['reply']}\"")
    md = "\n".join(lines) + "\n"
    stem = Path("evals/results") / f"rider_voice_{args.tag}"
    stem.with_suffix(".md").write_text(md)
    stem.with_suffix(".jsonl").write_text("\n".join(json.dumps(r) for r in rows) + "\n")
    print(md)


if __name__ == "__main__":
    main()
