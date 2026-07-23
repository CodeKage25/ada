import { router } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { api, type RunSummary } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { Button, Card, Sans, Serif, Skeleton, StatusBadge } from "@/components/ui";

const STATUS: Record<string, { label: string; tone: "success" | "accent" | "warn" | "danger" | "neutral" }> = {
  pending_payment: { label: "Awaiting payment", tone: "warn" },
  paid: { label: "Queued", tone: "accent" },
  running: { label: "Running", tone: "accent" },
  complete: { label: "Complete", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
};

export default function RunsScreen() {
  const t = useTheme();
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    api.listRuns().then(setRuns).catch(() => setRuns([]));
  }, []);
  useFocusEffect(load);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={t.accent}
          onRefresh={() => {
            setRefreshing(true);
            api
              .listRuns()
              .then(setRuns)
              .catch(() => {})
              .finally(() => setRefreshing(false));
          }}
        />
      }
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <Serif size={30}>My runs.</Serif>
        <Button label="＋ New" style={{ paddingVertical: 9, paddingHorizontal: 16 }} onPress={() => router.push("/new")} />
      </View>

      {runs === null ? (
        <View style={{ gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <Skeleton width="70%" height={16} />
              <Skeleton width={90} height={12} style={{ marginTop: 8 }} />
            </Card>
          ))}
        </View>
      ) : runs.length === 0 ? (
        <Card style={{ alignItems: "center", paddingVertical: 40 }}>
          <Serif size={22}>No runs yet</Serif>
          <Sans color={t.muted} style={{ marginTop: 6, marginBottom: 16, textAlign: "center" }}>
            Start your first run — Ada rewrites your CV, finds matching roles, and preps
            your interview.
          </Sans>
          <Button label="Start a run" onPress={() => router.push("/new")} />
        </Card>
      ) : (
        <View style={{ gap: 10 }}>
          {runs.map((run) => {
            const s = STATUS[run.status] ?? { label: run.status, tone: "neutral" as const };
            return (
              <Pressable key={run.run_id} onPress={() => router.push(`/run/${run.run_id}`)}>
                <Card pad={16}>
                  <Sans size={14} weight="medium" numberOfLines={1}>
                    {run.target_role}
                  </Sans>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
                    <StatusBadge tone={s.tone} label={s.label} />
                    {run.has_interview && <StatusBadge tone="accent" label="Interview scored" />}
                    <Sans size={11} color={t.muted}>
                      {new Date(run.created_at).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </Sans>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
