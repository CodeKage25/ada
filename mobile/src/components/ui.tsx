/** Ada's native UI kit — the design canvas's primitives as React Native
 *  components: serif display text, paper cards, pill buttons, status badges,
 *  gradient score bars, and the radial score ring. */
import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleProp,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";

import { fonts, radius, useTheme, type Palette } from "@/lib/theme";

export function Serif({
  children,
  size = 30,
  color,
  italic = false,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  color?: string;
  italic?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const t = useTheme();
  return (
    <Text
      style={[
        {
          fontFamily: italic ? fonts.serifItalic : fonts.serif,
          fontSize: size,
          lineHeight: size * 1.08,
          color: color ?? t.ink,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Sans({
  children,
  size = 13,
  color,
  weight = "regular",
  numberOfLines,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  color?: string;
  weight?: "regular" | "medium" | "semibold";
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
}) {
  const t = useTheme();
  const family =
    weight === "semibold"
      ? fonts.sansSemiBold
      : weight === "medium"
        ? fonts.sansMedium
        : fonts.sans;
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        { fontFamily: family, fontSize: size, lineHeight: size * 1.55, color: color ?? t.ink },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Eyebrow({
  children,
  color,
  style,
}: {
  children: React.ReactNode;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const t = useTheme();
  return (
    <Text
      style={[
        {
          fontFamily: fonts.sansSemiBold,
          fontSize: 10,
          letterSpacing: 1.4,
          textTransform: "uppercase",
          color: color ?? t.muted,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
  pad = 18,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  pad?: number;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: t.surface,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: t.line,
          padding: pad,
          shadowColor: "#17150f",
          shadowOpacity: 0.05,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 3 },
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ink";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const bg =
    variant === "primary" ? t.accent : variant === "ink" ? t.ink : t.surface;
  const fg =
    variant === "primary" ? t.accentInk : variant === "ink" ? t.bg : t.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: radius.pill,
          borderWidth: variant === "secondary" ? 1 : 0,
          borderColor: t.line,
          paddingVertical: 13,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: disabled || loading ? 0.55 : pressed ? 0.85 : 1,
          ...(variant === "primary"
            ? {
                shadowColor: t.accent,
                shadowOpacity: 0.3,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: 4,
              }
            : {}),
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : icon}
      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: fg }}>{label}</Text>
    </Pressable>
  );
}

const badgeTones = (t: Palette) => ({
  success: { bg: t.successSoft, fg: t.success },
  accent: { bg: t.accentSoft, fg: t.accent },
  warn: { bg: t.warnSoft, fg: t.warn },
  danger: { bg: t.dangerSoft, fg: t.danger },
  neutral: { bg: t.surface2, fg: t.muted },
});

export function StatusBadge({
  tone = "neutral",
  label,
}: {
  tone?: "success" | "accent" | "warn" | "danger" | "neutral";
  label: string;
}) {
  const t = useTheme();
  const { bg, fg } = badgeTones(t)[tone];
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: bg,
        borderRadius: radius.pill,
        paddingHorizontal: 9,
        paddingVertical: 3.5,
      }}
    >
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: fg }} />
      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 10, color: fg }}>{label}</Text>
    </View>
  );
}

/** Gradient meter for match percentages and interview scores. */
export function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const t = useTheme();
  const pct = Math.max(0, Math.min(1, value / max));
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 700, useNativeDriver: false }).start();
  }, [anim, pct]);
  return (
    <View
      style={{ height: 4, borderRadius: 99, backgroundColor: t.line, overflow: "hidden" }}
    >
      <Animated.View
        style={{
          height: "100%",
          borderRadius: 99,
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
        }}
      >
        <LinearGradient
          colors={[`${t.accent}b3`, t.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}

/** Radial gauge from the design canvas — 132px ring on the scorecard. */
export function ScoreRing({
  value,
  max = 100,
  size = 132,
  stroke = 8,
  children,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const t = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={t.line} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={t.accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c}`}
          strokeDashoffset={c * (1 - pct)}
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View
        style={{
          position: "absolute",
          inset: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </View>
    </View>
  );
}

/** Two-letter company tile used on match rows. */
export function MonogramTile({ label, size = 32 }: { label: string; size?: number }) {
  const t = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        backgroundColor: t.surface2,
        borderWidth: 1,
        borderColor: t.line,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 12, color: t.muted }}>
        {label.slice(0, 2)}
      </Text>
    </View>
  );
}

/** Soft pulsing placeholder block. */
export function Skeleton({
  width,
  height = 14,
  style,
}: {
  width: number | `${number}%`;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const anim = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: 8, backgroundColor: t.line, opacity: anim },
        style,
      ]}
    />
  );
}

/** The wordmark. */
export function Logo({ size = 23 }: { size?: number }) {
  const t = useTheme();
  return (
    <Text style={{ fontFamily: fonts.serif, fontSize: size, color: t.ink }}>
      Ada<Text style={{ color: t.accent }}>.</Text>
    </Text>
  );
}

/** Ada's monogram avatar (chat, headers). */
export function AdaMark({ size = 28 }: { size?: number }) {
  const t = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: t.accentSoft,
        borderWidth: 1,
        borderColor: `${t.accent}26`,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontFamily: fonts.serif, fontSize: size * 0.48, color: t.accent }}>A</Text>
    </View>
  );
}
