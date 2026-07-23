/** Paystack inline checkout loader. The script is injected on demand, once. */

interface PaystackHandler {
  openIframe(): void;
}

interface PaystackPop {
  setup(options: {
    key: string;
    email: string;
    amount: number;
    currency: string;
    ref: string;
    onClose: () => void;
    callback: () => void;
  }): PaystackHandler;
}

declare global {
  interface Window {
    PaystackPop?: PaystackPop;
  }
}

let loading: Promise<PaystackPop> | null = null;

export function loadPaystack(): Promise<PaystackPop> {
  if (window.PaystackPop) return Promise.resolve(window.PaystackPop);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.onload = () => {
      if (window.PaystackPop) resolve(window.PaystackPop);
      else reject(new Error("Paystack failed to initialise"));
    };
    script.onerror = () => reject(new Error("Paystack script failed to load"));
    document.head.appendChild(script);
  });
  return loading;
}
