/** Email + password sign-in / sign-up. Signing in or up mints the native session
 *  cookie; "Forgot password?" emails a reset link that opens the web reset page. */
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError, api } from "@/lib/api";
import { fonts, radius, useTheme } from "@/lib/theme";
import { Button, Card, Logo, Sans, Serif } from "@/components/ui";

type Mode = "signin" | "signup";

export default function LoginScreen() {
  const t = useTheme();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "signup") await api.signup(email.trim(), password);
      else await api.login(email.trim(), password);
      router.replace("/");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong — try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!email.includes("@")) {
      setError("Enter your email first, then tap Forgot password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.requestReset(email.trim());
      setNotice("If that email has an account, a reset link is on its way.");
    } catch {
      setError("Couldn't send the reset link — try again in a moment.");
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
          <Serif size={24}>
            {mode === "signup" ? "Create your account." : "Welcome back."}
          </Serif>
          <Sans color={t.muted}>
            {mode === "signup"
              ? "One account runs the whole loop — CV, matches, interview."
              : "Sign in to pick up where Ada left off."}
          </Sans>
          {notice ? <Sans size={12} color={t.success}>{notice}</Sans> : null}
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={`${t.muted}99`}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            style={fieldStyle}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
            placeholderTextColor={`${t.muted}99`}
            autoCapitalize="none"
            secureTextEntry
            textContentType={mode === "signup" ? "newPassword" : "password"}
            style={fieldStyle}
          />
          {error ? <Sans size={12} color={t.danger}>{error}</Sans> : null}
          <Button
            label={mode === "signup" ? "Create account" : "Sign in"}
            loading={busy}
            disabled={!email.includes("@") || password.length < (mode === "signup" ? 8 : 1)}
            onPress={submit}
          />
          {mode === "signin" ? (
            <Pressable onPress={forgot} style={{ alignSelf: "center" }}>
              <Sans size={12} color={t.muted}>Forgot password?</Sans>
            </Pressable>
          ) : null}
        </Card>
        <Pressable
          onPress={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError("");
            setNotice("");
            setPassword("");
          }}
          style={{ marginTop: 20 }}
        >
          <Sans size={11} color={t.muted}>
            {mode === "signin"
              ? "New to Ada?  Create an account"
              : "Already have an account?  Sign in"}
          </Sans>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
