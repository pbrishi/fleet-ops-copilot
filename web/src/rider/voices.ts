// Gemini TTS prebuilt voices offered in the demo. Charon is the default: a deep, even, "informative" male voice.
export const VOICES = [
  { id: "Charon", label: "Charon · informative" },
  { id: "Iapetus", label: "Iapetus · clear" },
  { id: "Alnilam", label: "Alnilam · firm" },
  { id: "Sadaltager", label: "Sadaltager · knowledgeable" },
] as const;

export type VoiceId = (typeof VOICES)[number]["id"];
export const DEFAULT_VOICE: VoiceId = "Charon";
