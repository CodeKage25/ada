/** Magic-link sign-in. The emailed link carries a one-time token — tapping
 *  "I've got my link" lets the user paste it (or a deep link `ada://login?token=…`
 *  delivers it), then the app exchanges it for a native session cookie. */
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/lib/api";
import { fonts, radius, useTheme } from "@/lib/theme";
import { Button, Card, Logo, Sans, Serif } from "@/components/ui";

export default function LoginScreen() {
  const t = useTheme();
  const { token: linkedToken } = useLocalSearchParams<{ token?: string }>();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const verify = async (value: string) => {
    setBusy(true);
    setError("");
    try {
      await api.verify(value.trim());
      router.replace("/");
    } catch {
      setError("That link is invalid or expired — request a fresh one.");
    } finally {
      setBusy(false);
    }
  };

  // Deep link ada://login?token=… straight from the email.
  useEffect(() => {
    if (linkedToken) void verify(linkedToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedToken]);

  const requestLink = async () => {
    setBusy(true);
    setError("");
    try {
      await api.requestLink(email.trim());
      setSent(true);
    } catch {
      setError("Couldn't send the link — try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const fieldStyle = {
    borderWidth: 1,
    borderColor: t.line,
    backgroundColor: t.surface,
    borderRadius: radius.field,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: t.ink,
  } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ marginBottom: 32 }}>
          <Logo size={34} />
        </View>
        <Card style={{ width: "100%", maxWidth: 380, gap: 14 }} pad={24}>
          {sent ? (
            <>
              <Serif size={24}>Check your inbox.</Serif>
              <Sans color={t.muted}>
                A one-time sign-in link is on its way to {email}. Open it on this phone —
                or paste the token from the link below.
              </Sans>
              <TextInput
                value={token}
                onChangeText={setToken}
                placeholder="Paste your sign-in token"
                placeholderTextColor={`${t.muted}99`}
                autoCapitalize="none"
                style={fieldStyle}
              />
              {error ? <Sans size={12} color={t.danger}>{error}</Sans> : null}
              <Button label="Sign in" loading={busy} disabled={!token.trim()} onPress={() => verify(token)} />
            </>
          ) : (
            <>
              <Serif size={24}>Sign in to Ada.</Serif>
              <Sans color={t.muted}>No passwords. We email you a one-time link.</Sans>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={`${t.muted}99`}
                autoCapitalize="none"
                keyboardType="email-address"
                style={fieldStyle}
              />
              {error ? <Sans size={12} color={t.danger}>{error}</Sans> : null}
              <Button label="Email me a link" loading={busy} disabled={!email.includes("@")} onPress={requestLink} />
            </>
          )}
        </Card>
        <Sans size={11} color={t.muted} style={{ marginTop: 20 }}>
          New here? The same link signs you up.
        </Sans>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
