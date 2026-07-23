import { Redirect, Slot, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FloatingTabBar } from "@/components/tab-bar";
import { AuthContext } from "@/lib/auth";
import { api } from "@/lib/api";
import { useTheme } from "@/lib/theme";

export default function TabsLayout() {
  const t = useTheme();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api
      .me()
      .then((u) => setEmail(u.email))
      .catch(() => setEmail(null))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: t.bg }}>
        <ActivityIndicator color={t.accent} />
      </View>
    );
  }
  if (!email) return <Redirect href="/login" />;

  return (
    <AuthContext.Provider value={{ email }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: t.bg }}>
        <Slot key={pathname} />
        <FloatingTabBar />
      </SafeAreaView>
    </AuthContext.Provider>
  );
}
