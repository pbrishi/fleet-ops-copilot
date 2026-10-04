import { GoogleGenAI, Type } from "@google/genai";
import { clientIp, rateLimited } from "@/lib/server/rateLimit";
import bundle from "@/rider/prompt_bundle.json";

// Rider support chat. The prompt and knowledge base come from prompt_bundle.json,
// the same file the Python eval loads, so the site runs exactly what was evaluated.
// Voice turns send the rider's recording; Gemini transcribes and answers in one call.

const MODEL = process.env.RIDER_MODEL ?? "gemini-flash-latest";
const MAX_MESSAGE_CHARS = 500;
const MAX_TURNS = 12;
const MAX_AUDIO_BASE64 = 1_200_000; // ~20s of 16 kHz mono WAV

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    transcript: { type: Type.STRING },
    reply: { type: Type.STRING },
    cited_articles: { type: Type.ARRAY, items: { type: Type.STRING } },
    escalation: { type: Type.STRING, enum: ["none", "human", "emergency"] },
  },
  required: ["transcript", "reply", "cited_articles", "escalation"],
};

// Models can "hear" plausible words in silence (12 of 20 silent/noise clips in the voice eval before
// guardrails), so silent recordings are answered here without calling the model.
const SILENCE_RMS = 0.004;
const NO_SPEECH_REPLY = "I didn't catch anything. Please try again, or type your question.";

function isSilentWav(base64: string) {
  const bytes = Buffer.from(base64, "base64");
  const samples = Math.floor((bytes.length - 44) / 2);
  if (samples <= 0) return true;
  let sumSq = 0;
  for (let i = 0; i < samples; i++) {
    const v = bytes.readInt16LE(44 + i * 2) / 32768;
    sumSq += v * v;
  }
  return Math.sqrt(sumSq / samples) < SILENCE_RMS;
}

const bad = (message: string) => Response.json({ error: "bad_request", message }, { status: 400 });

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || process.env.RIDER_CHAT_ENABLED === "false") {
    return Response.json({ error: "offline", message: "Live chat is turned off for this demo right now." }, { status: 503 });
  }
  if (rateLimited(`chat:${clientIp(request)}`, 20, 10 * 60 * 1000)) {
    return Response.json({ error: "rate_limited", message: "You've sent a lot of messages. Please wait a few minutes and try again." }, { status: 429 });
  }

  let body: { messages?: ChatMessage[]; rideContext?: unknown; audio?: { data?: string; mimeType?: string } };
  try {
    body = await request.json();
  } catch {
    return bad("Invalid request.");
  }

  const messages = (body.messages ?? []).slice(-MAX_TURNS);
  if (messages.some((m) => typeof m.text !== "string" || m.text.length > MAX_MESSAGE_CHARS)) {
    return bad(`Messages must be under ${MAX_MESSAGE_CHARS} characters.`);
  }
  const audio = body.audio;
  if (audio) {
    if (typeof audio.data !== "string" || audio.data.length > MAX_AUDIO_BASE64 || audio.mimeType !== "audio/wav") {
      return bad("Recordings must be WAV and under 20 seconds.");
    }
  } else {
    const last = messages.at(-1);
    if (!last || last.role !== "user" || !last.text.trim()) return bad("Send a message or a recording.");
  }

  if (audio && isSilentWav(audio.data!)) {
    return Response.json({ transcript: "", reply: NO_SPEECH_REPLY, cited_articles: [], escalation: "none", no_speech: true });
  }

  const contents = messages.map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.text }] }));
  if (audio) contents.push({ role: "user", parts: [{ inlineData: { mimeType: "audio/wav", data: audio.data! } } as never] });

  const ctx = body.rideContext ? JSON.stringify(body.rideContext, null, 1).slice(0, 2000) : "No active ride.";
  const ai = new GoogleGenAI({ apiKey });
  try {
    const resp = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: bundle.system_prompt.replace("{ride_context}", ctx),
        temperature: 0.2,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema,
      },
    });
    const parsed = JSON.parse(resp.text ?? "{}");
    return Response.json({
      transcript: parsed.transcript ?? "",
      reply: parsed.reply,
      cited_articles: parsed.cited_articles ?? [],
      escalation: parsed.escalation ?? "none",
    });
  } catch (err) {
    console.error("rider-chat error", err);
    return Response.json({ error: "upstream", message: "I'm having trouble right now. If this is urgent, tap the red Help button or call 911." }, { status: 502 });
  }
}
