/** Run detail — the canvas's V2 Run detail: status header, rewritten CV card,
 *  best-fit roles with monogram tiles, and the interview CTA pinned to the
 *  bottom until the interview is scored. Polls live stage while running. */
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { api, type RunResult } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import {
  Button,
  Card,
  Eyebrow,
  MonogramTile,
  Sans,
  ScoreBar,
  Serif,
  Skeleton,
  StatusBadge,
} from "@/components/ui";

const STAGES = [
  { key: "intake", label: "Reading your background" },
  { key: "cv_rewrite", label: "Rewriting your CV for the role" },
  { key: "job_match", label: "Searching for your best-fit roles" },
  { key: "interview_prep", label: "Preparing your interview questions" },
];

export default function RunDetailScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [run, setRun] = useState<RunResult | null>(null);
  const [missing, setMissing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await api.getRun(id);
        if (cancelled) return;
        setRun(r);
        if (r.status !== "complete" && r.status !== "failed") {
          timer.current = setTimeout(tick, 2500);
        }
      } catch {
        if (!cancelled) setMissing(true);
      }
    };
    void tick();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [id]);

  const back = (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.navigate("/runs"))}
      style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 18 }}
    >
      <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={t.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M15 18l-6-6 6-6" />
      </Svg>
      <Sans size={13} color={t.muted}>
        Runs
      </Sans>
    </Pressable>
  );

  if (missing)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg, padding: 20 }}>
        {back}
        <Sans color={t.muted}>Run not found.</Sans>
      </SafeAreaView>
    );

  if (!run)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg, padding: 20 }}>
        {back}
        <Skeleton width="60%" height={28} />
        <Card style={{ marginTop: 20, gap: 10 }}>
          <Skeleton width="100%" />
          <Skeleton width="85%" />
          <Skeleton width="70%" />
        </Card>
      </SafeAreaView>
    );

  // Live progress while paid/running
  if (run.status !== "complete" && run.status !== "failed") {
    const liveIndex = run.stage ? STAGES.findIndex((s) => s.key === run.stage) : 0;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg, padding: 20 }}>
        {back}
        <Serif size={28} style={{ marginBottom: 18 }}>
          Ada is working on it.
        </Serif>
        <Card>
          <View style={{ gap: 14 }}>
            {STAGES.map((s, i) => {
              const done = i < liveIndex;
              const active = i === liveIndex;
              return (
                <View key={s.key} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: done || active ? t.accent : t.line,
                      backgroundColor: done ? t.accent : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Sans size={10} color={done ? t.accentInk : active ? t.accent : t.muted}>
                      {done ? "✓" : i + 1}
                    </Sans>
                  </View>
                  <Sans size={13} color={done || active ? t.ink : t.muted}>
                    {s.label}
                  </Sans>
                </View>
              );
            })}
          </View>
          <Sans size={11} color={t.muted} style={{ marginTop: 16 }}>
            Usually under 3 minutes — this screen updates itself.
          </Sans>
        </Card>
      </SafeAreaView>
    );
  }

  if (run.status === "failed")
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg, padding: 20 }}>
        {back}
        <Card>
          <Sans weight="medium" color={t.danger}>
            This run failed.
          </Sans>
          <Sans size={12} color={t.muted} style={{ marginTop: 4 }}>
            You were not charged for it.
          </Sans>
        </Card>
      </SafeAreaView>
    );

  const showCta = (run.questions?.length ?? 0) > 0 && !run.interview;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: showCta ? 170 : 140 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          {back}
          <StatusBadge tone="success" label="Complete" />
        </View>
        <Eyebrow style={{ marginBottom: 6 }}>Run</Eyebrow>
        <Serif size={30} style={{ marginBottom: 20 }}>
          {run.target_role}.
        </Serif>

        {/* Rewritten CV */}
        <Card style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Eyebrow>Rewritten CV</Eyebrow>
            <Sans size={11} weight="medium" color={t.accent}>
              ATS-ready ✓
            </Sans>
          </View>
          <Sans size={12} numberOfLines={8} color={t.muted}>
            {(run.rewritten_cv ?? "").replace(/[#*]/g, "").trim()}
          </Sans>
          <View style={{ marginTop: 14 }}>
            <Button
              label="Open document ↗"
              variant="secondary"
              style={{ alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 16 }}
              onPress={() => router.push(`/run/${id}/cv`)}
            />
          </View>
        </Card>

        {/* Best-fit roles */}
        {run.matches && run.matches.length > 0 && (
          <Card>
            <Eyebrow style={{ marginBottom: 12 }}>Best-fit roles</Eyebrow>
            <View style={{ gap: 14 }}>
              {run.matches.map((m) => (
                <View key={`${m.title}-${m.company}`} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <MonogramTile label={m.company} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                      <Sans size={12} weight="medium" style={{ flexShrink: 1 }} numberOfLines={1}>
                        {m.title} · {m.company}
                      </Sans>
                      <Serif size={15} color={t.accent}>
                        {m.match}%
                      </Serif>
                    </View>
                    <ScoreBar value={m.match} />
                    <Sans size={11} color={t.muted} style={{ marginTop: 5 }}>
                      {m.reason}
                    </Sans>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        )}

        {run.interview && (
          <Card style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Serif size={26} color={t.accent}>
                {run.interview.overall_score}
                <Sans size={13} color={t.muted}>
                  {" "}
                  /10
                </Sans>
              </Serif>
              <Sans size={12} color={t.muted}>
                Interview scored
              </Sans>
            </View>
            <Button
              label="Review feedback"
              variant="secondary"
              style={{ paddingVertical: 9, paddingHorizontal: 14 }}
              onPress={() => router.push(`/run/${id}/interview`)}
            />
          </Card>
        )}
      </ScrollView>

      {/* Pinned CTA over a paper fade, per the canvas */}
      {showCta && (
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
          <LinearGradient
            colors={[`${t.bg}00`, t.bg, t.bg]}
            style={{ paddingHorizontal: 20, paddingTop: 40, paddingBottom: 116 }}
            pointerEvents="box-none"
          >
            <Button label="Take the mock interview →" onPress={() => router.push(`/run/${id}/interview`)} />
          </LinearGradient>
        </View>
      )}
    </SafeAreaView>
  );
}
