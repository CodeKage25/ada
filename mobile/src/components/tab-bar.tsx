/** The floating liquid-glass tab bar from the design canvas: a blurred pill
 *  with crafted stroke icons and a raised accent FAB for New run. */
import { BlurView } from "expo-blur";
import { router, usePathname } from "expo-router";
import { Platform, Pressable, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

import { fonts, useTheme } from "@/lib/theme";

function Icon({ name, color }: { name: "home" | "runs" | "ask" | "you"; color: string }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (name === "home")
    return (
      <Svg {...common}>
        <Path d="M3 10.5 12 3l9 7.5" />
        <Path d="M5 9.5V21h5v-6h4v6h5V9.5" />
      </Svg>
    );
  if (name === "runs")
    return (
      <Svg {...common}>
        <Path d="M4 6h16M4 12h16M4 18h10" />
      </Svg>
    );
  if (name === "ask")
    return (
      <Svg {...common}>
        <Path d="M21 12a8 8 0 1 1-3.1-6.3L21 5l-.6 3.2A8 8 0 0 1 21 12z" />
      </Svg>
    );
  return (
    <Svg {...common}>
      <Circle cx={12} cy={8} r={3.5} />
      <Path d="M5 20c1.4-3.2 4-5 7-5s5.6 1.8 7 5" />
    </Svg>
  );
}

const TABS = [
  { route: "/", label: "Home", icon: "home" },
  { route: "/runs", label: "Runs", icon: "runs" },
  { route: "/ask", label: "Ask Ada", icon: "ask" },
  { route: "/you", label: "You", icon: "you" },
] as const;

export function FloatingTabBar() {
  const t = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const item = (tab: (typeof TABS)[number]) => {
    const active = pathname === tab.route;
    const color = active ? t.accent : t.muted;
    return (
      <Pressable
        key={tab.route}
        onPress={() => router.navigate(tab.route)}
        style={{ alignItems: "center", gap: 2, paddingHorizontal: 12, paddingVertical: 4 }}
        accessibilityLabel={tab.label}
        accessibilityRole="tab"
      >
        <Icon name={tab.icon} color={color} />
        <Text
          style={{
            fontFamily: active ? fonts.sansSemiBold : fonts.sans,
            fontSize: 8.5,
            color,
          }}
        >
          {tab.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: Math.max(insets.bottom, 12) + 8,
      }}
    >
      <BlurView
        intensity={40}
        tint={scheme === "dark" ? "dark" : "light"}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
          borderRadius: 32,
          borderWidth: 1,
          borderColor: `${t.line}e6`,
          paddingVertical: 9,
          paddingHorizontal: 10,
          overflow: "hidden",
          backgroundColor:
            Platform.OS === "web" ? `${t.surface}d0` : `${t.surface}a8`,
        }}
      >
        {item(TABS[0])}
        {item(TABS[1])}
        {/* Raised accent FAB — New run */}
        <Pressable
          onPress={() => router.push("/new")}
          accessibilityLabel="New run"
          style={({ pressed }) => ({
            width: 46,
            height: 46,
            borderRadius: 23,
            marginTop: -26,
            backgroundColor: t.accent,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: t.accent,
            shadowOpacity: 0.4,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          })}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={t.accentInk} strokeWidth={2} strokeLinecap="round">
            <Path d="M12 5v14M5 12h14" />
          </Svg>
        </Pressable>
        {item(TABS[2])}
        {item(TABS[3])}
      </BlurView>
    </View>
  );
}
