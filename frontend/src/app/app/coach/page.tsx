"use client";

import { ArrowUp, Square } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

import { api, streamChat, type ChatMessage } from "@/lib/api";

const SUGGESTIONS = [
  "Review my career trajectory",
  "What roles should I target next?",
  "How do I position my experience for a senior role?",
  "Help me plan a salary negotiation",
];

export default function CoachPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getProfile().then((p) => setHasProfile(p !== null)).catch(() => setHasProfile(false));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || streaming) return;
    setInput("");
    const history: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setStreaming(true);
    abortRef.current = new AbortController();
    try {
      await streamChat(
        history,
        (delta) =>
          setMessages((prev) => {
            const next = [...prev];
            const lastIndex = next.length - 1;
            next[lastIndex] = {
              role: "assistant",
              content: next[lastIndex].content + delta,
            };
            return next;
          }),
        abortRef.current.signal,
      );
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        const lastIndex = next.length - 1;
        if (!next[lastIndex].content) {
          next[lastIndex] = {
            role: "assistant",
            content: "Something interrupted me — ask that again?",
          };
        }
        return next;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col">
      <h1 className="display mb-2 text-3xl">Ask Ada.</h1>
      <p className="mb-4 text-sm text-muted">
        Career advice grounded in your profile and your runs — not generic tips.
      </p>
      {hasProfile === false && (
        <p className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">
          Ada gives sharper advice when she knows your background —{" "}
          <Link href="/app/profile" className="underline">
            import your LinkedIn profile
          </Link>
          .
        </p>
      )}

      <div className="flex-1 space-y-5 overflow-y-auto pb-4 quiet-scroll">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => void send(s)}
                className="rounded-full border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
            {m.role === "user" ? (
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm text-accent-ink">
                {m.content}
              </p>
            ) : (
              <div className="prose-ada max-w-[92%]">
                {m.content ? (
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                ) : (
                  <span className="pulse-soft text-sm text-muted">Ada is thinking…</span>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex items-end gap-2 border-t border-line pt-4"
      >
        <textarea
          rows={1}
          placeholder="Ask Ada anything about your career..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          className="max-h-40 flex-1 resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-sm outline-none quiet-scroll focus:border-accent"
        />
        {streaming ? (
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            aria-label="Stop"
            className="rounded-full bg-ink p-3 text-bg"
          >
            <Square className="size-4" />
          </button>
        ) : (
          <button
            type="submit"
            aria-label="Send"
            disabled={!input.trim()}
            className="rounded-full bg-accent p-3 text-accent-ink disabled:opacity-40"
          >
            <ArrowUp className="size-4" />
          </button>
        )}
      </form>
    </div>
  );
}
