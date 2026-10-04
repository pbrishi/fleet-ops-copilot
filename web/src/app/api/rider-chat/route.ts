import { GoogleGenAI, Type } from "@google/genai";
import bundle from "@/rider/prompt_bundle.json";

// Rider support chat. The prompt and knowledge base come from prompt_bundle.json,
// the same file the Python eval loads, so the site runs exactly what was evaluated.

const MODEL = process.env.RIDER_MODEL ?? "gemini-flash-latest";
const MAX_MESSAGE_CHARS = 500;
const MAX_TURNS = 12;
const RATE_LIMIT = { max: 20, windowMs: 10 * 60 * 1000 };

// Best-effort, per-instance rate limit. Serverless instances don't share memory, so pair
// this with a spending cap on the Gemini project.
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT.max;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    reply: { type: Type.STRING },
    cited_articles: { type: Type.ARRAY, items: { type: Type.STRING } },
    escalation: { type: Type.STRING, enum: ["none", "human", "emergency"] },
  },
  required: ["reply", "cited_articles", "escalation"],
};

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || process.env.RIDER_CHAT_ENABLED === "false") {
    return Response.json({ error: "offline", message: "Live chat is turned off for this demo right now." }, { status: 503 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return Response.json({ error: "rate_limited", message: "You've sent a lot of messages. Please wait a few minutes and try again." }, { status: 429 });
  }

  let body: { messages?: ChatMessage[]; rideContext?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const messages = (body.messages ?? []).slice(-MAX_TURNS);
  const last = messages.at(-1);
  if (!last || last.role !== "user" || !last.text?.trim() || messages.some((m) => typeof m.text !== "string" || m.text.length > MAX_MESSAGE_CHARS)) {
    return Response.json({ error: "bad_request", message: `Messages must be under ${MAX_MESSAGE_CHARS} characters.` }, { status: 400 });
  }

  const ctx = body.rideContext ? JSON.stringify(body.rideContext, null, 1).slice(0, 2000) : "No active ride.";
  const ai = new GoogleGenAI({ apiKey });
  try {
    const resp = await ai.models.generateContent({
      model: MODEL,
      contents: messages.map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.text }] })),
      config: {
        systemInstruction: bundle.system_prompt.replace("{ride_context}", ctx),
        temperature: 0.2,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema,
      },
    });
    const parsed = JSON.parse(resp.text ?? "{}");
    return Response.json({ reply: parsed.reply, cited_articles: parsed.cited_articles ?? [], escalation: parsed.escalation ?? "none" });
  } catch (err) {
    console.error("rider-chat error", err);
    return Response.json({ error: "upstream", message: "I'm having trouble right now. If this is urgent, tap the red Help button or call 911." }, { status: 502 });
  }
}
