"""Smoke test: confirm the Gemini API key works and list usable models."""
from dotenv import load_dotenv
from google import genai

load_dotenv()
client = genai.Client()  # reads GEMINI_API_KEY from the environment

models = [
    m.name.removeprefix("models/")
    for m in client.models.list()
    if "generateContent" in (m.supported_actions or [])
]
print("Models available to this key:")
for name in sorted(models):
    print(" ", name)

model = "gemini-flash-latest"  # alias Google keeps pointed at the current Flash model
resp = client.models.generate_content(
    model=model,
    contents="In one sentence, what does a remote assistance operator do for a robotaxi fleet?",
)
print(f"\nTest call to {model}:\n{resp.text}")
