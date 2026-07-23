/** Home — the design canvas's V2 Home screen: serif greeting, segmented stat
 *  card, latest-run panel with monogram tiles, and the Ask-Ada pill. */
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useAuth } from "@/lib/auth";
import { api, type RunResult, type RunSummary } from "@/lib/api";
import { fonts, radius, useTheme } from "@/lib/theme";
import {
  Button,
  Card,
  Eyebrow,
  Logo,
  MonogramTile,
  Sans,
  ScoreBar,
  Serif,
  Skeleton,
  StatusBadge,
} from "@/components/ui";

const STATUS: Record<string, { label: string; tone: "success" | "accent" | "warn" | "danger" | "neutral" }> = {
  pending_payment: { label: "Awaiting payment", tone: "warn" },
  paid: { label: "Queued", tone: "accent" },
  running: { label: "Running", tone: "accent" },
  complete: { label: "Complete", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function firstName(email: string): string {
  const raw = email.split("@")[0].split(/[._\-+]/)[0] || "there";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export default function HomeScreen() {
  const t = useTheme();
  const { email } = useAuth();
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [latest, setLatest] = useState<{ summary: RunSummary; result: RunResult } | null>(null);
  const [ask, setAsk] = useState("");

  useEffect(() => {
    api
      .listRuns()
      .then((rs) => {
        setRuns(rs);
        const done = rs.find((r) => r.status === "complete");
        if (done) {
          api
            .getRun(done.run_id)
            .then((result) => setLatest({ summary: done, result }))
            .catch(() => {});
        }
      })
      .catch(() => setRuns([]));
  }, []);

  const completed = runs?.filter((r) => r.status === "complete").length ?? 0;
  const interviews = runs?.filter((r) => r.has_interview).length ?? 0;
  const topMatch = latest?.result.matches?.[0]?.match ?? null;
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <Logo />
        <Pressable
          onPress={() => router.navigate("/you")}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: t.accentSoft,
            borderWidth: 1,
            borderColor: `${t.accent}26`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Sans size={12} weight="semibold" color={t.accent}>
            {email[0].toUpperCase()}
          </Sans>
        </Pressable>
      </View>

      <Eyebrow style={{ marginBottom: 8 }}>{today}</Eyebrow>
      <Serif size={32}>
        {greeting()},{"\n"}
        {firstName(email)}.
      </Serif>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8, marginBottom: 22 }}>
        <Sans color={t.muted}>You&apos;re </Sans>
        <Serif size={15} italic color={t.accent}>
          one run
        </Serif>
        <Sans color={t.muted}> from your next role.</Sans>
      </View>

      {/* Segmented stat card */}
      <Card pad={0} style={{ flexDirection: "row", marginBottom: 14 }}>
        {(
          [
            [String(completed), completed === 1 ? "run" : "runs", t.ink],
            [String(interviews), interviews === 1 ? "interview" : "interviews", t.ink],
            [topMatch !== null ? `${topMatch}%` : "—", "top match", t.accent],
          ] as const
        ).map(([value, label, color], i) => (
          <View
            key={label}
            style={{
              flex: 1,
              alignItems: "center",
              paddingVertical: 15,
              borderLeftWidth: i === 0 ? 0 : 1,
              borderLeftColor: t.line,
            }}
          >
            {runs === null ? (
              <Skeleton width={36} height={26} />
            ) : (
              <Serif size={27} color={color}>
                {value}
              </Serif>
            )}
            <Sans size={9.5} color={t.muted} style={{ marginTop: 3 }}>
              {label}
            </Sans>
          </View>
        ))}
      </Card>

      {/* Latest run */}
      {latest ? (
        <Card style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Eyebrow>Latest run</Eyebrow>
            <StatusBadge tone="success" label="Complete" />
          </View>
          <Serif size={22} style={{ marginBottom: 14 }}>
            {latest.summary.target_role}.
          </Serif>
          <View style={{ gap: 12 }}>
            {(latest.result.matches ?? []).slice(0, 3).map((m) => (
              <View key={`${m.title}-${m.company}`} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <MonogramTile label={m.company} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                    <Sans size={12} weight="medium" style={{ flexShrink: 1 }} numberOfLines={1}>
                      {m.title} <Sans size={12} color={t.muted}>· {m.company}</Sans>
                    </Sans>
                    <Serif size={15} color={t.accent}>
                      {m.match}%
                    </Serif>
                  </View>
                  <ScoreBar value={m.match} />
                </View>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
            <Button
              label="View full run"
              variant="secondary"
              style={{ flex: 1, paddingVertical: 10 }}
              onPress={() => router.push(`/run/${latest.summary.run_id}`)}
            />
            <Button
              label={latest.summary.has_interview ? "Review interview" : "Take the interview"}
              style={{ flex: 1, paddingVertical: 10 }}
              onPress={() => router.push(`/run/${latest.summary.run_id}/interview`)}
            />
          </View>
        </Card>
      ) : runs !== null && runs.length === 0 ? (
        <Card style={{ marginBottom: 14 }}>
          <Eyebrow style={{ marginBottom: 8 }}>First run</Eyebrow>
          <Serif size={24}>Your next role starts with one run.</Serif>
          <Sans color={t.muted} style={{ marginTop: 8, marginBottom: 16 }}>
            Ada rewrites your CV for the role you want, ranks your best-fit jobs, and
            scores a mock interview — autonomously, in minutes.
          </Sans>
          <Button label="Start your first run" onPress={() => router.push("/new")} />
        </Card>
      ) : null}

      {/* Ask Ada pill */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: t.surface,
          borderWidth: 1,
          borderColor: t.line,
          borderRadius: radius.pill,
          paddingLeft: 16,
          paddingRight: 7,
          paddingVertical: 7,
          marginBottom: 20,
        }}
      >
        <TextInput
          value={ask}
          onChangeText={setAsk}
          placeholder="Ask Ada anything…"
          placeholderTextColor={`${t.muted}99`}
          style={{ flex: 1, fontFamily: fonts.sans, fontSize: 13, color: t.ink, paddingVertical: 4 }}
          onSubmitEditing={() => {
            if (ask.trim()) router.push({ pathname: "/ask", params: { q: ask.trim() } });
          }}
        />
        <Pressable
          onPress={() => {
            if (ask.trim()) router.push({ pathname: "/ask", params: { q: ask.trim() } });
          }}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: t.accent,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={t.accentInk} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M12 19V5M5 12l7-7 7 7" />
          </Svg>
        </Pressable>
      </View>

      {/* Recent runs */}
      {runs && runs.length > 0 && (
        <View>
          <Eyebrow style={{ marginBottom: 10 }}>Recent runs</Eyebrow>
          <View style={{ gap: 10 }}>
            {runs.slice(0, 4).map((run) => {
              const s = STATUS[run.status] ?? { label: run.status, tone: "neutral" as const };
              return (
                <Pressable key={run.run_id} onPress={() => router.push(`/run/${run.run_id}`)}>
                  <Card pad={14} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Sans size={13} weight="medium" style={{ flex: 1 }} numberOfLines={1}>
                      {run.target_role}
                    </Sans>
                    <StatusBadge tone={s.tone} label={s.label} />
                    <Sans size={11} color={t.muted}>
                      {new Date(run.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                    </Sans>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
