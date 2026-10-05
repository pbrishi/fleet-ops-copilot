"use client";

import { useEffect, useRef, useState } from "react";
import { SilentRecordingError, speak, startRecording } from "@/lib/audio";
import { DEFAULT_VOICE, type VoiceId } from "@/rider/voices";

// Shared rider support chat logic (text + voice), used by the console demo and the rider app.

export type Escalation = "none" | "human" | "emergency";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  cited?: string[];
  escalation?: Escalation;
  error?: boolean;
  voice?: boolean; // rider spoke this turn
  pending?: boolean; // voice turn still being transcribed
}

export function useRiderChat(rideContext: unknown, { speakByDefault = true } = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [speakReplies, setSpeakReplies] = useState(speakByDefault);
  const [voice, setVoice] = useState<VoiceId>(DEFAULT_VOICE);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const recorderRef = useRef<Awaited<ReturnType<typeof startRecording>> | null>(null);
  const stopSpeechRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setRecordSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  // Stop any audio when the chat unmounts.
  useEffect(() => () => stopSpeechRef.current?.(), []);

  const stopSpeaking = () => {
    stopSpeechRef.current?.();
    stopSpeechRef.current = null;
    setSpeakingIndex(null);
  };

  const playReply = (index: number, text: string) => {
    stopSpeaking();
    setSpeakingIndex(index);
    stopSpeechRef.current = speak(text, voice, () => setSpeakingIndex((cur) => (cur === index ? null : cur)));
  };

  const reset = () => {
    stopSpeaking();
    setMessages([]);
  };

  // Text turns send `text`; voice turns send the recording and get the transcript back.
  async function send(turn: { text: string } | { audio: string }) {
    if (sending) return;
    const isVoice = "audio" in turn;
    if (!isVoice && !turn.text.trim()) return;
    stopSpeaking();
    const prior = messages.filter((m) => !m.error && !m.pending);
    const userMsg: ChatMessage = isVoice ? { role: "user", text: "Transcribing…", voice: true, pending: true } : { role: "user", text: turn.text.trim() };
    setMessages([...messages, userMsg]);
    setSending(true);
    try {
      const res = await fetch("/api/rider-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...prior, ...(isVoice ? [] : [userMsg])].map(({ role, text }) => ({ role, text })),
          rideContext,
          ...(isVoice ? { audio: { mimeType: "audio/wav", data: turn.audio } } : {}),
        }),
      });
      const data = await res.json();
      const reply: ChatMessage = res.ok
        ? { role: "assistant", text: data.reply, cited: data.cited_articles, escalation: data.escalation }
        : { role: "assistant", text: data.message ?? "Something went wrong. Please try again.", error: true };
      setMessages((m) => [
        ...(isVoice ? m.map((x) => (x.pending ? { ...x, text: res.ok ? data.transcript || "(couldn't make that out)" : "Voice message", pending: false } : x)) : m),
        reply,
      ]);
      // The reply lands right after the rider's turn.
      if (res.ok && speakReplies) playReply(messages.length + 1, data.reply);
    } catch {
      setMessages((m) => [...m.map((x) => (x.pending ? { ...x, text: "Voice message", pending: false } : x)), { role: "assistant", text: "Couldn't reach support. Check your connection and try again.", error: true }]);
    } finally {
      setSending(false);
    }
  }

  async function toggleRecording() {
    setMicError(null);
    if (recording) {
      setRecording(false);
      try {
        const audio = await recorderRef.current!.stop();
        if (recordSecs < 1) return setMicError("That was very short. Hold on a moment longer, then tap stop.");
        await send({ audio });
      } catch (e) {
        setMicError(
          e instanceof SilentRecordingError
            ? "I didn't hear anything. Check that the right microphone is selected and not muted, then try again."
            : "Couldn't process that recording. Please try again or type your message.",
        );
      }
      return;
    }
    try {
      stopSpeaking();
      recorderRef.current = await startRecording();
      setRecordSecs(0);
      setRecording(true);
      // The recorder stops itself at the 20s limit; reflect that here.
      recorderRef.current.done.then(() => setRecording(false)).catch(() => setRecording(false));
    } catch {
      setMicError("Microphone access was blocked. Allow it in your browser's site settings, or type instead.");
    }
  }

  function cancelRecording() {
    recorderRef.current?.cancel();
    setRecording(false);
  }

  const lastEscalation = [...messages].reverse().find((m) => m.escalation)?.escalation;

  return {
    messages,
    sending,
    recording,
    recordSecs,
    micError,
    speakReplies,
    setSpeakReplies: (on: boolean) => {
      if (!on) stopSpeaking();
      setSpeakReplies(on);
    },
    voice,
    setVoice,
    speakingIndex,
    send,
    toggleRecording,
    cancelRecording,
    playReply,
    stopSpeaking,
    reset,
    lastEscalation,
  };
}
