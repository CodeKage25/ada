"use client";

import { ArrowRight, Pause, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/** The hero's signature: Ada as a voice made visible. A dark glass orb with
 *  gold and emerald light drifting inside it — idling slowly, leaning toward
 *  the cursor, and burning brighter in rhythm with her actual voice (an
 *  AnalyserNode on the recorded introduction). No chrome on the orb itself;
 *  the controls live in a quiet row beneath it. Reduced motion gets a still
 *  frame that still plays audio. */

// Irrational-ish speed ratios so the wobble never visibly loops.
const HARMONICS = [
  { lobes: 3, speed: 0.61, phase: 0.0, amp: 0.014 },
  { lobes: 5, speed: -0.94, phase: 1.7, amp: 0.01 },
  { lobes: 8, speed: 1.42, phase: 4.1, amp: 0.005 },
];

// The light inside: one gold ember, two greens. Positions orbit slowly.
const LOBES = [
  { color: "236, 190, 88", r: 0.7, ox: -0.26, oy: -0.28, speed: 0.21, alpha: 0.85 },
  { color: "62, 207, 142", r: 0.85, ox: 0.32, oy: 0.16, speed: -0.16, alpha: 0.62 },
  { color: "56, 189, 178", r: 0.6, ox: -0.02, oy: 0.36, speed: 0.11, alpha: 0.5 },
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
    let t = Math.PI * 2 * 0.37; // fixed start so replays match

    const setSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    setSize();

    const blobPath = (cx: number, cy: number, R: number, energy: number) => {
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
    };

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

      const breath = reduce ? 0 : 0.012 * Math.sin(t * 0.5);
      const R = Math.min(w, h) * 0.335 * (1 + breath + level * 0.06);
      const energy = 1 + hover * 0.9 + level * 4;
      const brightness = 0.9 + hover * 0.2 + level * 0.8;

      // Ambient glow around the body — light escaping into the dark.
      const haloR = Math.min(R * 1.7, Math.min(w, h) * 0.495);
      const halo = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, haloR);
      halo.addColorStop(0, `rgba(62, 207, 142, ${0.2 + level * 0.14})`);
      halo.addColorStop(0.6, `rgba(227, 179, 76, ${0.07 + level * 0.06})`);
      halo.addColorStop(1, "rgba(227, 179, 76, 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
      ctx.fill();

      // The body: near-black glass.
      blobPath(cx, cy, R, energy);
      const base = ctx.createRadialGradient(cx, cy - R * 0.2, R * 0.2, cx, cy, R * 1.05);
      base.addColorStop(0, "#153426");
      base.addColorStop(1, "#0a150d");
      ctx.fillStyle = base;
      ctx.fill();

      // Light drifting inside: additive lobes clipped to the body.
      ctx.save();
      blobPath(cx, cy, R, energy);
      ctx.clip();
      ctx.globalCompositeOperation = "lighter";
      for (const lobe of LOBES) {
        const ang = t * lobe.speed;
        const lx = cx + (lobe.ox * Math.cos(ang) - lobe.oy * Math.sin(ang)) * R;
        const ly = cy + (lobe.ox * Math.sin(ang) + lobe.oy * Math.cos(ang)) * R;
        const lr = lobe.r * R * (1 + level * 0.25);
        const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr);
        g.addColorStop(0, `rgba(${lobe.color}, ${lobe.alpha * brightness})`);
        g.addColorStop(1, `rgba(${lobe.color}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(lx, ly, lr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // A hairline rim so the glass has an edge against the dark.
      blobPath(cx, cy, R, energy);
      ctx.strokeStyle = `rgba(236, 242, 234, ${0.16 + level * 0.12})`;
      ctx.lineWidth = 1;
      ctx.stroke();

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
      const actx = new window.AudioContext();
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
        aria-label={playing ? "Pause Ada's introduction" : "Play Ada's introduction"}
        className="relative aspect-square w-72 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-4 focus-visible:ring-offset-bg sm:w-80 lg:w-[24rem]"
      >
        <canvas ref={canvasRef} className="absolute inset-0 size-full" aria-hidden />
      </button>

      {/* Controls: a quiet row, not an instruction */}
      <div className="mt-7 flex items-center gap-5">
        <button
          type="button"
          onClick={toggle}
          className="inline-flex items-center gap-2.5 rounded-full border border-line bg-surface/60 py-2 pl-2.5 pr-4 text-sm backdrop-blur transition-colors hover:border-accent/50"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-accent text-accent-ink">
            {playing ? <Pause className="size-3" /> : <Play className="ml-px size-3" />}
          </span>
          <span className="font-mono text-xs tabular-nums text-muted" aria-live="polite">
            {playing ? `${fmt(current)} / ${fmt(duration)}` : `Listen · ${fmt(duration)}`}
          </span>
        </button>
        <Link
          href="/app/voice"
          className="group/link inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
        >
          Talk to her live
          <ArrowRight className="size-4 transition-transform group-hover/link:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
