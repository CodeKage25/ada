/** Mock interview + scorecard — the canvas's V2 Interview feedback screen:
 *  centered score ring, serif verdict, "Ada's note", per-question breakdown. */
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { api, type Scorecard } from "@/lib/api";
import { fonts, radius, useTheme } from "@/lib/theme";
import { Button, Card, Eyebrow, Sans, ScoreBar, ScoreRing, Serif, Skeleton } from "@/components/ui";

export default function InterviewScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [questions, setQuestions] = useState<string[] | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [scoring, setScoring] = useState(false);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [error, setError] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    api
      .getRun(id)
      .then((run) => {
        setQuestions(run.questions ?? []);
        setAnswers(new Array(run.questions?.length ?? 0).fill(""));
        setRole(run.target_role);
        if (run.interview) setScorecard(run.interview);
      })
      .catch(() => setQuestions([]));
  }, [id]);

  const back = (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.navigate(`/run/${id}`))}
      style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 20 }}
    >
      <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={t.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M15 18l-6-6 6-6" />
      </Svg>
      <Sans size={13} color={t.muted}>
        {role || "Run"}
      </Sans>
    </Pressable>
  );

  if (!questions)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg, padding: 20 }}>
        {back}
        <Skeleton width="55%" height={26} />
        <Card style={{ marginTop: 20, gap: 10 }}>
          <Skeleton width="80%" />
          <Skeleton width="100%" height={120} />
        </Card>
      </SafeAreaView>
    );

  if (scorecard) {
    const verdict =
      scorecard.overall_score >= 8
        ? "Strong hire signal."
        : scorecard.overall_score >= 6
          ? "Solid — sharpen the specifics."
          : "Keep rehearsing. You'll get there.";
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
          {back}
          <View style={{ alignItems: "center", marginBottom: 22 }}>
            <Eyebrow style={{ marginBottom: 14 }}>Interview scored</Eyebrow>
            <ScoreRing value={scorecard.overall_score} max={10}>
              <Serif size={44}>{scorecard.overall_score}</Serif>
              <Sans size={10} color={t.muted}>
                of 10
              </Sans>
            </ScoreRing>
            <Serif size={20} style={{ marginTop: 14 }}>
              {verdict}
            </Serif>
          </View>

          <View
            style={{
              backgroundColor: t.accentSoft,
              borderWidth: 1,
              borderColor: `${t.accent}33`,
              borderRadius: radius.card,
              padding: 16,
              marginBottom: 14,
            }}
          >
            <Eyebrow color={t.accent} style={{ marginBottom: 4 }}>
              Ada&apos;s note
            </Eyebrow>
            <Sans size={12}>{scorecard.summary}</Sans>
          </View>

          <View style={{ gap: 12 }}>
            {scorecard.scores.map((s, i) => (
              <Card key={i}>
                <Eyebrow style={{ marginBottom: 6 }}>Question {i + 1}</Eyebrow>
                <Sans size={13} weight="medium" style={{ marginBottom: 8 }}>
                  {s.question}
                </Sans>
                <View style={{ borderLeftWidth: 2, borderLeftColor: t.line, paddingLeft: 10, marginBottom: 12 }}>
                  <Sans size={12} color={t.muted}>
                    {s.answer || "(no answer)"}
                  </Sans>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <ScoreBar value={s.score} max={10} />
                  </View>
                  <Serif size={16}>{s.score}/10</Serif>
                </View>
                <Sans size={12} color={t.muted}>
                  {s.feedback}
                </Sans>
              </Card>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (questions.length === 0)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg, padding: 20 }}>
        {back}
        <Sans color={t.muted}>This run has no interview questions yet.</Sans>
      </SafeAreaView>
    );

  const last = index === questions.length - 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          {back}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
            <Serif size={28}>Mock interview.</Serif>
            <Sans size={12} color={t.muted}>
              {index + 1} of {questions.length}
            </Sans>
          </View>
          <Sans size={12} color={t.muted} style={{ marginTop: 6, marginBottom: 16 }}>
            Answer like it&apos;s the real thing — Ada scores substance, structure, and
            relevance.
          </Sans>

          {/* Segmented progress */}
          <View style={{ flexDirection: "row", gap: 5, marginBottom: 16 }}>
            {questions.map((_, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: i < index ? t.accent : i === index ? `${t.accent}80` : t.line,
                }}
              />
            ))}
          </View>

          <Card>
            <Serif size={20} style={{ marginBottom: 14 }}>
              {questions[index]}
            </Serif>
            <TextInput
              value={answers[index] ?? ""}
              onChangeText={(v) =>
                setAnswers((prev) => prev.map((a, i) => (i === index ? v : a)))
              }
              placeholder="Type your answer…"
              placeholderTextColor={`${t.muted}99`}
              multiline
              style={{
                borderWidth: 1,
                borderColor: t.line,
                backgroundColor: t.bg,
                borderRadius: radius.field,
                padding: 12,
                minHeight: 140,
                textAlignVertical: "top",
                fontFamily: fonts.sans,
                fontSize: 13,
                color: t.ink,
              }}
            />
            {error ? (
              <Sans size={12} color={t.danger} style={{ marginTop: 8 }}>
                {error}
              </Sans>
            ) : null}
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16 }}>
              <Button
                label="Previous"
                variant="secondary"
                disabled={index === 0}
                style={{ paddingVertical: 10 }}
                onPress={() => setIndex((i) => i - 1)}
              />
              {last ? (
                <Button
                  label="Score my interview"
                  loading={scoring}
                  style={{ paddingVertical: 10 }}
                  onPress={async () => {
                    setScoring(true);
                    setError("");
                    try {
                      setScorecard(await api.scoreInterview(id, answers));
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Scoring failed — try again.");
                    } finally {
                      setScoring(false);
                    }
                  }}
                />
              ) : (
                <Button label="Next →" style={{ paddingVertical: 10 }} onPress={() => setIndex((i) => i + 1)} />
              )}
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
