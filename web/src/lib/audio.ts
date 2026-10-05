// Browser audio helpers for the rider voice chat.

const TARGET_RATE = 16000; // plenty for speech, keeps uploads small (~32 KB per second)
const SILENCE_RMS = 0.004; // below this the recording is effectively silent

export class SilentRecordingError extends Error {
  constructor() {
    super("No speech detected");
  }
}

// Record from the microphone until stop() is called. Returns a WAV (16 kHz mono) as base64.
export async function startRecording(maxMs = 20000) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<string>((resolve, reject) => {
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      try {
        resolve(await toWavBase64(new Blob(chunks, { type: recorder.mimeType })));
      } catch (e) {
        reject(e);
      }
    };
  });
  recorder.start();
  const timer = setTimeout(() => recorder.state === "recording" && recorder.stop(), maxMs);
  return {
    stop: () => {
      clearTimeout(timer);
      if (recorder.state === "recording") recorder.stop();
      return done;
    },
    cancel: () => {
      clearTimeout(timer);
      recorder.onstop = () => stream.getTracks().forEach((t) => t.stop());
      if (recorder.state === "recording") recorder.stop();
    },
    done,
  };
}

// Decode whatever the browser recorded (webm/opus, mp4/aac), resample to 16 kHz mono, encode WAV.
async function toWavBase64(blob: Blob): Promise<string> {
  const decoded = await new AudioContext().decodeAudioData(await blob.arrayBuffer());
  const frames = Math.ceil(decoded.duration * TARGET_RATE);
  const offline = new OfflineAudioContext(1, frames, TARGET_RATE);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const samples = (await offline.startRendering()).getChannelData(0);

  // Don't send silence: models can "hear" plausible words in an empty recording.
  let sumSq = 0;
  for (const v of samples) sumSq += v * v;
  if (Math.sqrt(sumSq / Math.max(1, samples.length)) < SILENCE_RMS) throw new SilentRecordingError();

  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => [...s].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, TARGET_RATE, true);
  view.setUint32(28, TARGET_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 0x7fff, true));

  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

// Speak a reply sentence by sentence: all sentences are requested in parallel and played
// in order, so the first one starts while the rest are still being generated.
export function speak(text: string, voice: string, onEnd?: () => void) {
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
  const controller = new AbortController();
  const clips = sentences.map((s) =>
    fetch("/api/rider-tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: s, voice }),
      signal: controller.signal,
    }).then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`tts ${r.status}`)))),
  );
  // Clips may be aborted (rider stops playback, closes the chat) before they're awaited;
  // mark them handled so that isn't reported as an uncaught error. The loop below still sees the rejection.
  clips.forEach((c) => c.catch(() => {}));
  let current: HTMLAudioElement | null = null;
  let stopped = false;

  (async () => {
    try {
      for (const clip of clips) {
        const blob = await clip;
        if (stopped) return;
        const url = URL.createObjectURL(blob);
        current = new Audio(url);
        await new Promise<void>((resolve) => {
          current!.onended = current!.onerror = () => resolve();
          current!.play().catch(() => resolve());
        });
        URL.revokeObjectURL(url);
      }
    } catch {
      // A failed sentence ends playback; the text reply is still on screen.
    } finally {
      if (!stopped) onEnd?.();
    }
  })();

  return () => {
    stopped = true;
    controller.abort();
    current?.pause();
    onEnd?.();
  };
}
