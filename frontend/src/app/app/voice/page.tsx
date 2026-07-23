"use client";

import { Mic, MicOff, PhoneOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button, Card, PageHeader } from "@/components/ui";
import { voiceWsUrl } from "@/lib/api";
import { startMic, type MicSession } from "@/lib/audio";

type CallState = "idle" | "connecting" | "live" | "extracting" | "error";

export default function VoicePage() {
  const router = useRouter();
  const [state, setState] = useState<CallState>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const micRef = useRef<MicSession | null>(null);

  const cleanup = () => {
    micRef.current?.stop();
    micRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
  };
  useEffect(() => cleanup, []);

  const start = async () => {
    setState("connecting");
    setError("");
    setTranscript("");
    try {
      const ws = new WebSocket(voiceWsUrl());
      wsRef.current = ws;

      ws.onopen = async () => {
        try {
          micRef.current = await startMic((frame) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "audio", data: frame }));
            }
          });
          setState("live");
        } catch {
          setError("Microphone access was denied.");
          setState("error");
          cleanup();
        }
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data as string) as {
          type: string;
          data?: string;
          target_role?: string;
          cv_text?: string;
          message?: string;
        };
        if (msg.type === "transcript" && msg.data) {
          setTranscript((prev) => prev + msg.data);
        } else if (msg.type === "intake") {
          localStorage.setItem(
            "ada.intake-draft",
            JSON.stringify({ target_role: msg.target_role, cv_text: msg.cv_text }),
          );
          cleanup();
          router.push("/app/new");
        } else if (msg.type === "error") {
          setError(msg.message ?? "Voice intake is unavailable right now.");
          setState("error");
          cleanup();
        }
      };

      ws.onerror = () => {
        setError("Couldn't reach the voice service.");
        setState("error");
      };
    } catch {
      setError("Couldn't start the call.");
      setState("error");
    }
  };

  const end = () => {
    micRef.current?.stop();
    micRef.current = null;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setState("extracting");
      wsRef.current.send(JSON.stringify({ type: "end" }));
    } else {
      setState("idle");
    }
  };

  return (
    <>
      <PageHeader
        title="Talk to Ada."
        subtitle="A short spoken intake — Ada asks about your background and target role, then drafts your run for you."
      />

      <Card className="flex flex-col items-center gap-6 p-10">
        {state === "idle" || state === "error" ? (
          <>
            <div className="flex size-20 items-center justify-center rounded-full bg-accent-soft">
              <Mic className="size-8 text-accent" />
            </div>
            {error && <p className="text-center text-sm text-danger">{error}</p>}
            <Button onClick={start} className="!px-7 !py-3">
              Start the conversation
            </Button>
            <p className="text-center text-xs text-muted">
              Uses your microphone. Prefer typing? Use{" "}
              <a href="/app/new" className="underline underline-offset-2 transition-colors hover:text-ink">
                the form
              </a>
              .
            </p>
          </>
        ) : (
          <>
            <div className="relative flex size-24 items-center justify-center">
              {state === "live" && (
                <>
                  <span className="ring-ping absolute inset-2 rounded-full border-2 border-accent" aria-hidden />
                  <span
                    className="ring-ping absolute inset-2 rounded-full border-2 border-accent"
                    style={{ animationDelay: "0.6s" }}
                    aria-hidden
                  />
                </>
              )}
              <div
                className={`relative flex size-20 items-center justify-center rounded-full ${
                  state === "live"
                    ? "bg-accent text-accent-ink shadow-btn"
                    : "pulse-soft bg-accent-soft text-accent"
                }`}
              >
                {state === "connecting" ? (
                  <MicOff className="size-8" />
                ) : (
                  <Mic className="size-8" />
                )}
              </div>
            </div>
            <p className="text-sm text-muted">
              {state === "connecting" && "Connecting to Ada..."}
              {state === "live" && "Ada is listening — speak naturally."}
              {state === "extracting" && "Wrapping up — drafting your run..."}
            </p>
            {transcript && (
              <div className="max-h-48 w-full overflow-y-auto rounded-xl border border-line bg-bg p-4 text-sm leading-relaxed quiet-scroll">
                {transcript}
                <span className="caret-blink text-accent">▎</span>
              </div>
            )}
            <Button variant="danger" onClick={end} disabled={state === "extracting"}>
              <PhoneOff className="size-4" /> End &amp; draft my run
            </Button>
          </>
        )}
      </Card>
    </>
  );
}
