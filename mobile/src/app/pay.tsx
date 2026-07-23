/** Paystack inline checkout inside a WebView — same public key + reference
 *  the web app uses; success hands off to the run's live progress. */
import { router, useLocalSearchParams } from "expo-router";
import { Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/lib/theme";
import { Button, Sans, Serif } from "@/components/ui";

export default function PayScreen() {
  const t = useTheme();
  const { runId, reference, publicKey, amount, currency, email } = useLocalSearchParams<{
    runId: string;
    reference: string;
    publicKey: string;
    amount: string;
    currency: string;
    email: string;
  }>();

  // react-native-webview has no web build — on web (dev/preview) we short-circuit.
  if (Platform.OS === "web") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Serif size={22} style={{ textAlign: "center", marginBottom: 8 }}>
          Paystack checkout
        </Serif>
        <Sans color={t.muted} style={{ textAlign: "center", marginBottom: 16 }}>
          Inline checkout runs in the native app. Continue to the run to watch it once
          payment is confirmed.
        </Sans>
        <Button label="Go to my run" onPress={() => router.replace(`/run/${runId}`)} />
      </SafeAreaView>
    );
  }

  // Required lazily so the web bundle never touches the native-only module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { WebView } = require("react-native-webview") as typeof import("react-native-webview");

  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:#faf9f6">
<script src="https://js.paystack.co/v1/inline.js"></script>
<script>
  var handler = PaystackPop.setup({
    key: ${JSON.stringify(publicKey)},
    email: ${JSON.stringify(email)},
    amount: ${Number(amount) || 0},
    currency: ${JSON.stringify(currency)},
    ref: ${JSON.stringify(reference)},
    onClose: function () { window.ReactNativeWebView.postMessage("closed"); },
    callback: function () { window.ReactNativeWebView.postMessage("paid"); }
  });
  handler.openIframe();
</script>
</body></html>`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ flex: 1 }}>
        <WebView
          originWhitelist={["*"]}
          source={{ html, baseUrl: "https://checkout.ada.app" }}
          onMessage={(event) => {
            if (event.nativeEvent.data === "paid") router.replace(`/run/${runId}`);
            else router.back();
          }}
        />
      </View>
    </SafeAreaView>
  );
}
