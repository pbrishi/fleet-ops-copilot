import { GoogleGenAI } from "@google/genai";
import { clientIp, rateLimited } from "@/lib/server/rateLimit";
import { DEFAULT_VOICE, VOICES } from "@/rider/voices";

// Text to speech for rider replies. Gemini TTS returns a complete WAV file, passed through as-is.

const MODEL = process.env.RIDER_TTS_MODEL ?? "gemini-3.8-flash-tts";
const MAX_CHARS = 400;

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || process.env.RIDER_CHAT_ENABLED === "false") {
    return Response.json({ error: "offline" }, { status: 503 });
  }
  if (rateLimited(`tts:${clientIp(request)}`, 60, 10 * 60 * 1000)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { text?: string; voice?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const text = body.text?.trim();
  if (!text || text.length > MAX_CHARS) return Response.json({ error: "bad_request" }, { status: 400 });
  const voice = VOICES.some((v) => v.id === body.voice) ? body.voice! : (process.env.RIDER_TTS_VOICE ?? DEFAULT_VOICE);

  const ai = new GoogleGenAI({ apiKey });
  try {
    const resp = await ai.models.generateContent({
      model: MODEL,
      // Send only the words to speak: this TTS model reads style instructions aloud.
      contents: text,
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
    });
    const data = resp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!data) throw new Error("no audio returned");
    return new Response(Buffer.from(data, "base64"), {
      headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("rider-tts error", err);
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}
