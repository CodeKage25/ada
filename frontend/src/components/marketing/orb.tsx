"use client";

import { ArrowRight, Pause, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/** The hero's signature: Ada as a living voice orb. A canvas blob that idles
 *  with a slow breath, swells toward the cursor, and — once clicked — speaks
 *  (the recorded introduction), its surface rippling with the real audio
 *  amplitude via an AnalyserNode. Reduced motion gets a static disc that
 *  still plays the audio. */

// Irrational-ish speed ratios so the wobble never visibly loops.
const HARMONICS = [
  { lobes: 3, speed: 0.61, phase: 0.0, amp: 0.016 },
  { lobes: 5, speed: -0.94, phase: 1.7, amp: 0.011 },
  { lobes: 8, speed: 1.42, phase: 4.1, amp: 0.006 },
];

function fmt(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function HeroOrb() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  // Animation state lives in refs — the draw loop reads them without rerenders.
  const hoverRef = useRef(0);
  const hoverTarget = useRef(0);
  const levelRef = useRef(0);
  const playingRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(24);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Audio element bookkeeping.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrent(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 24);
    const onEnd = () => {
      setPlaying(false);
      playingRef.current = false;
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  // The draw loop. Runs only while the orb is on screen and the tab is visible.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = false;
    let t = Math.PI * 2 * 0.37; // arbitrary fixed start so SSR/replays match

    const setSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    setSize();

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;
      ctx.clearRect(0, 0, w, h);

      // Smooth the inputs so hover and audio never snap.
      hoverRef.current += (hoverTarget.current - hoverRef.current) * 0.06;
      const analyser = analyserRef.current;
      let target = 0;
      if (analyser && playingRef.current) {
        const data = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        target = Math.min(1, Math.sqrt(sum / data.length) * 3.2);
      }
      levelRef.current += (target - levelRef.current) * 0.18;
      const level = levelRef.current;
      const hover = hoverRef.current;

      const breath = reduce ? 0 : 0.014 * Math.sin(t * 0.5);
      const R = Math.min(w, h) * 0.335 * (1 + breath + level * 0.07);
      const energy = 1 + hover * 0.9 + level * 4.5;

      // Halo first — a soft field behind the body, faded out fully inside the
      // canvas so its edge never prints as a square against the page.
      const haloR = Math.min(R * 1.75, Math.min(w, h) * 0.495);
      const halo = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, haloR);
      halo.addColorStop(0, "rgba(99, 91, 227, 0.28)");
      halo.addColorStop(1, "rgba(99, 91, 227, 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
      ctx.fill();

      // The body: a polygon whose radius wobbles with three sine harmonics.
      ctx.beginPath();
      const N = 160;
      for (let i = 0; i <= N; i++) {
        const th = (i / N) * Math.PI * 2;
        let wob = 0;
        if (!reduce) {
          for (const hm of HARMONICS) {
            wob += hm.amp * energy * Math.sin(hm.lobes * th + t * hm.speed + hm.phase);
          }
        }
        const r = R * (1 + wob);
        const x = cx + Math.cos(th) * r;
        const y = cy + Math.sin(th) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      const body = ctx.createRadialGradient(
        cx - R * 0.35,
        cy - R * 0.4,
        R * 0.1,
        cx,
        cy,
        R * 1.12,
      );
      body.addColorStop(0, "#a9a3f7");
      body.addColorStop(0.42, "#6d64e8");
      body.addColorStop(1, "#3a2fb4");
      ctx.fillStyle = body;
      ctx.fill();

      // A quiet inner highlight — gives the surface a lit, glassy face.
      const sheen = ctx.createRadialGradient(
        cx - R * 0.4,
        cy - R * 0.48,
        0,
        cx - R * 0.3,
        cy - R * 0.35,
        R * 0.75,
      );
      sheen.addColorStop(0, "rgba(255,255,255,0.34)");
      sheen.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sheen;
      ctx.fill();

      t += 0.016;
      if (running && !reduce) raf = requestAnimationFrame(draw);
    };

    const start = () => {
      if (running) return;
      running = true;
      setSize();
      if (reduce) draw();
      else raf = requestAnimationFrame(draw);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0.05 },
    );
    io.observe(canvas);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", setSize);
    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", setSize);
    };
  }, [reduce]);

  const wireAnalyser = () => {
    const audio = audioRef.current;
    if (!audio || audioCtxRef.current) return;
    try {
      const Ctx = window.AudioContext;
      const actx = new Ctx();
      const source = actx.createMediaElementSource(audio);
      const analyser = actx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(actx.destination);
      audioCtxRef.current = actx;
      analyserRef.current = analyser;
    } catch {
      /* no analyser — the orb still plays audio and idles */
    }
  };

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      playingRef.current = false;
      return;
    }
    wireAnalyser();
    void audioCtxRef.current?.resume();
    void audio.play();
    setPlaying(true);
    playingRef.current = true;
  };

  return (
    <div className="relative mx-auto flex w-full max-w-md flex-col items-center">
      <audio ref={audioRef} src="/ada-intro.mp3" preload="metadata" crossOrigin="anonymous" />
      <button
        type="button"
        onClick={toggle}
        onPointerEnter={() => (hoverTarget.current = 1)}
        onPointerLeave={() => (hoverTarget.current = 0)}
        aria-label={playing ? "Pause Ada's introduction" : "Hear Ada introduce herself"}
        className="group relative aspect-square w-72 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-4 focus-visible:ring-offset-bg sm:w-80 lg:w-[24rem]"
      >
        <canvas ref={canvasRef} className="absolute inset-0 size-full" aria-hidden />
        {/* Play affordance floats on the surface; fades once she's speaking */}
        <span
          className={`absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#3a2fb4] shadow-lift backdrop-blur transition-all duration-300 group-hover:scale-105 ${
            playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"
          }`}
        >
          {playing ? <Pause className="size-5" /> : <Play className="ml-0.5 size-5" />}
        </span>
      </button>

      <div className="mt-6 flex items-center gap-3 text-sm text-muted">
        <span
          className={`size-1.5 rounded-full ${playing ? "bg-accent pulse-soft" : "bg-line"}`}
          aria-hidden
        />
        {playing ? (
          <span aria-live="polite">
            Ada is speaking · <span className="tabular-nums">{fmt(current)} / {fmt(duration)}</span>
          </span>
        ) : (
          <span>Press the orb — Ada introduces herself in {fmt(duration)}</span>
        )}
      </div>

      <Link
        href="/app/voice"
        className="group/link mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink underline-offset-4 hover:underline"
      >
        Talk to her live
        <ArrowRight className="size-4 transition-transform group-hover/link:translate-x-0.5" />
      </Link>
    </div>
  );
}
