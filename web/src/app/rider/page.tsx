"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Card, PageHeader } from "@/components/dashboard";
import { BlurFade } from "@/components/ui/blur-fade";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import kbData from "@/rider/kb.json";
import scenarios from "@/rider/scenarios.json";

type Escalation = "none" | "human" | "emergency";
interface Article {
  id: string;
  category: string;
  question: string;
  alt_phrasings: string[];
  answer: string;
  escalation: Escalation;
  uses_vehicle_context: boolean;
  source: string;
}
interface Message {
  role: "user" | "assistant";
  text: string;
  cited?: string[];
  escalation?: Escalation;
  error?: boolean;
}
type ScenarioKey = keyof typeof scenarios;

const articles = kbData.articles as Article[];
const articleById = Object.fromEntries(articles.map((a) => [a.id, a]));
const categories = [...new Set(articles.map((a) => a.category))];

const SUGGESTIONS: Record<ScenarioKey, string[]> = {
  waiting: ["Where's my car?", "Which car is mine?", "Can my dog come?", "How much will this cost?"],
  in_trip: ["How long until we get there?", "Can we go somewhere else?", "Let me out at the next corner", "My friend just passed out"],
  stuck: ["Why aren't we moving?", "I'm going to miss my flight", "Is someone driving us remotely?", "I want a refund"],
  none: ["I left my phone in the car", "Do I need to tip?", "Can my 15-year-old ride alone?", "Are there cameras in the car?"],
};

const ESCALATION_META: Record<Escalation, { label: string; cls: string }> = {
  none: { label: "Answered", cls: "bg-slate-500/15 text-slate-300 ring-slate-500/30" },
  human: { label: "Agent requested", cls: "bg-sky-500/15 text-sky-300 ring-sky-500/30" },
  emergency: { label: "Emergency", cls: "bg-rose-500/20 text-rose-200 ring-rose-500/40" },
};

export default function RiderPage() {
  const [tab, setTab] = useState<"chat" | "kb">("chat");
  const [focusArticle, setFocusArticle] = useState<string | null>(null);

  const openArticle = (id: string) => {
    setFocusArticle(id);
    setTab("kb");
  };

  return (
    <>
      <PageHeader
        eyebrow="Gemini · grounded in a 78-article knowledge base"
        title="Rider support copilot"
        subtitle="A chat assistant for riders of a fictional robotaxi service, Copilot Rides. It answers only from a 78-article knowledge base plus the rider's live trip, and hands off to a human or flags an emergency when it should."
      >
        <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1 text-sm">
          {(["chat", "kb"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3.5 py-1.5 transition ${tab === t ? "bg-sky-500/15 text-sky-100 ring-1 ring-sky-400/30" : "text-slate-400 hover:text-slate-200"}`}
            >
              {t === "chat" ? "Chat" : "Knowledge base"}
            </button>
          ))}
        </div>
      </PageHeader>
      {tab === "chat" ? <Chat onOpenArticle={openArticle} /> : <KnowledgeBase focusId={focusArticle} />}
    </>
  );
}

function Chat({ onOpenArticle }: { onOpenArticle: (id: string) => void }) {
  const [scenario, setScenario] = useState<ScenarioKey>("stuck");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const context = scenarios[scenario].context;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, sending]);

  const switchScenario = (s: ScenarioKey) => {
    setScenario(s);
    setMessages([]);
  };

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const history: Message[] = [...messages, { role: "user", text: trimmed }];
    setMessages(history);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/rider-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.filter((m) => !m.error).map(({ role, text }) => ({ role, text })),
          rideContext: context,
        }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        res.ok
          ? { role: "assistant", text: data.reply, cited: data.cited_articles, escalation: data.escalation }
          : { role: "assistant", text: data.message ?? "Something went wrong. Please try again.", error: true },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Couldn't reach support. Check your connection and try again.", error: true }]);
    } finally {
      setSending(false);
    }
  }

  const lastEscalation = [...messages].reverse().find((m) => m.escalation)?.escalation;

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card title="Rider chat" className="xl:col-span-2" beam={{ from: "#38bdf8", to: "#818cf8" }} action={<span className="text-xs text-slate-500">Gemini · grounded in the knowledge base</span>}>
        <div className="mb-3 flex flex-wrap gap-2">
          {(Object.keys(scenarios) as ScenarioKey[]).map((s) => (
            <button
              key={s}
              onClick={() => switchScenario(s)}
              className={`rounded-full border px-3 py-1 text-xs transition ${scenario === s ? "border-sky-400/50 bg-sky-500/15 text-sky-100" : "border-white/10 text-slate-400 hover:text-slate-200"}`}
            >
              {scenarios[s].label}
            </button>
          ))}
        </div>

        {lastEscalation && lastEscalation !== "none" && (
          <div className={`mb-3 rounded-lg px-3 py-2 text-sm ${lastEscalation === "emergency" ? "border border-rose-500/50 bg-rose-500/10 text-rose-200" : "border border-sky-500/40 bg-sky-500/10 text-sky-200"}`}>
            {lastEscalation === "emergency"
              ? "Emergency flagged: in a real service this pages an agent immediately and shares the car's location with responders."
              : "Handoff requested: in a real service this opens a ticket for a support agent with the full chat and trip details."}
          </div>
        )}

        <div className="h-[440px] space-y-3 overflow-y-auto rounded-xl border border-white/5 bg-slate-950/70 p-4" aria-live="polite">
          {messages.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-500">Ask anything a rider might ask, or tap a suggestion below.</p>
          )}
          {messages.map((m, i) => (
            <BlurFade key={i} duration={0.3} inView={false} direction={m.role === "user" ? "left" : "right"} offset={8} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${m.role === "user" ? "rounded-br-md bg-gradient-to-br from-sky-500 to-indigo-500 text-white" : m.error ? "rounded-bl-md bg-slate-800/80 text-amber-200 ring-1 ring-amber-500/20" : "rounded-bl-md bg-slate-800/80 text-slate-100 ring-1 ring-white/5"}`}>
                <p className="whitespace-pre-wrap">{m.text}</p>
                {m.role === "assistant" && !m.error && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {m.escalation && <Badge cls={ESCALATION_META[m.escalation].cls}>{ESCALATION_META[m.escalation].label}</Badge>}
                    {m.cited?.filter((id) => articleById[id]).map((id) => (
                      <button key={id} onClick={() => onOpenArticle(id)} className="rounded bg-slate-900/70 px-1.5 py-0.5 font-mono text-[11px] text-slate-400 hover:text-sky-300" title={articleById[id].question}>
                        {id}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </BlurFade>
          ))}
          {sending && (
            <div className="flex items-center gap-1.5 px-1 text-xs text-slate-500" aria-label="Support is typing">
              {[0, 150, 300].map((d) => (
                <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS[scenario].map((s) => (
            <button key={s} onClick={() => send(s)} disabled={sending} className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-xs text-slate-300 transition hover:border-sky-400/40 hover:text-sky-100 disabled:opacity-50">
              {s}
            </button>
          ))}
        </div>

        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={500}
            placeholder="Type a message"
            aria-label="Message"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-sky-400/50 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
          />
          <ShimmerButton type="submit" disabled={sending || !input.trim()} background="linear-gradient(135deg,#0ea5e9,#6366f1)" shimmerColor="#e0f2fe" borderRadius="12px" className="px-5 py-2.5 text-sm font-medium disabled:opacity-50">
            Send
          </ShimmerButton>
        </form>
      </Card>

      <div className="space-y-4">
        <Card title="Ride context sent to the model">
          {context ? (
            <dl className="space-y-1.5 text-sm">
              {Object.entries(context).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-slate-500">{k.replaceAll("_", " ")}</dt>
                  <dd className="text-right text-slate-200">{v === null ? "unknown" : String(v)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-slate-500">No active ride. The copilot answers general questions only.</p>
          )}
        </Card>
        <Card title="How it works">
          <ul className="space-y-2 text-sm text-slate-300">
            <li>The full knowledge base (about 6k tokens) goes into the prompt. At this size that&apos;s simpler and more reliable than a search index.</li>
            <li>The model must cite the articles it used and pick an escalation level: answered, agent, or emergency.</li>
            <li>It can&apos;t drive the car, take card details, promise refunds or give medical advice.</li>
            <li>Eval: 52 test conversations, including emergencies and prompt-injection attempts. Latest run: 98% pass all checks, 100% emergency recall.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function KnowledgeBase({ focusId }: { focusId: string | null }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    if (focusId) document.getElementById(`kb-${focusId}`)?.scrollIntoView({ block: "center" });
  }, [focusId]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter(
      (a) =>
        (category === "all" || a.category === category) &&
        (!q || [a.question, a.answer, ...a.alt_phrasings].some((t) => t.toLowerCase().includes(q))),
    );
  }, [query, category]);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions and answers"
          className="w-64 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100">
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="ml-auto text-xs text-slate-500">{rows.length} of {articles.length} articles · topics researched from public robotaxi help centers, rider reviews and news; answers and policies are fictional</span>
      </div>
      <ul className="-mx-4 divide-y divide-slate-800/70">
        {rows.map((a) => (
          <li key={a.id} id={`kb-${a.id}`} className={`px-4 py-3 ${a.id === focusId ? "bg-sky-500/10" : ""}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-slate-500">{a.id}</span>
              <span className="text-sm font-medium text-slate-100">{a.question}</span>
              {a.escalation !== "none" && <Badge cls={ESCALATION_META[a.escalation].cls}>{ESCALATION_META[a.escalation].label}</Badge>}
              {a.uses_vehicle_context && <Badge cls="bg-violet-500/15 text-violet-300 ring-violet-500/30">Uses trip data</Badge>}
              <span className="ml-auto text-xs text-slate-500">{a.category}</span>
            </div>
            <p className="mt-1 text-sm text-slate-300">{a.answer}</p>
            <p className="mt-1 text-xs text-slate-500">Also asked as: {a.alt_phrasings.join(" · ")}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
