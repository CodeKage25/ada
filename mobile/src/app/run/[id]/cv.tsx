/** The full rewritten CV, share-ready. */
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Share, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { api } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { Button, Card, Sans, Serif, Skeleton } from "@/components/ui";

export default function CvScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [cv, setCv] = useState<string | null>(null);
  const [role, setRole] = useState("");

  useEffect(() => {
    api
      .getRun(id)
      .then((r) => {
        setCv(r.rewritten_cv ?? "");
        setRole(r.target_role);
      })
      .catch(() => setCv(""));
  }, [id]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 10,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={t.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M15 18l-6-6 6-6" />
          </Svg>
          <Sans size={13} color={t.muted}>
            {role || "Run"}
          </Sans>
        </Pressable>
        <Button
          label="Share"
          variant="secondary"
          style={{ paddingVertical: 8, paddingHorizontal: 14 }}
          onPress={() => {
            if (cv) void Share.share({ message: cv });
          }}
        />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {cv === null ? (
          <Card style={{ gap: 10 }}>
            <Skeleton width="55%" height={22} />
            <Skeleton width="100%" />
            <Skeleton width="90%" />
            <Skeleton width="75%" />
          </Card>
        ) : (
          <Card pad={22}>
            {cv.split("\n").map((line, i) => {
              const text = line.replace(/[#*]/g, "").trim();
              if (!text) return <View key={i} style={{ height: 8 }} />;
              if (line.startsWith("# "))
                return (
                  <Serif key={i} size={24} style={{ marginBottom: 2 }}>
                    {text}
                  </Serif>
                );
              if (line.startsWith("## "))
                return (
                  <Sans key={i} size={11} weight="semibold" style={{ marginTop: 14, marginBottom: 4, letterSpacing: 1, textTransform: "uppercase" }} color={t.muted}>
                    {text}
                  </Sans>
                );
              if (line.trim().startsWith("- "))
                return (
                  <View key={i} style={{ flexDirection: "row", gap: 8, marginVertical: 2 }}>
                    <Sans size={12.5} color={t.accent}>
                      ·
                    </Sans>
                    <Sans size={12.5} style={{ flex: 1 }}>
                      {text.replace(/^-\s*/, "")}
                    </Sans>
                  </View>
                );
              return (
                <Sans key={i} size={12.5} style={{ marginVertical: 2 }}>
                  {text}
                </Sans>
              );
            })}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
