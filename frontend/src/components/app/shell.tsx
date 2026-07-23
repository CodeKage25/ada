"use client";

import {
  FileText,
  LayoutList,
  MessageCircle,
  Mic,
  Plus,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

import { Logo, Spinner, ThemeToggle } from "@/components/ui";
import { api } from "@/lib/api";

const AuthContext = createContext<{ email: string } | null>(null);
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AppShell");
  return ctx;
};

const NAV = [
  { href: "/app/new", label: "New run", icon: Plus },
  { href: "/app/runs", label: "My runs", icon: LayoutList },
  { href: "/app/coach", label: "Ask Ada", icon: MessageCircle },
  { href: "/app/documents", label: "Documents", icon: FileText },
  { href: "/app/voice", label: "Voice intake", icon: Mic },
  { href: "/app/profile", label: "Profile", icon: UserRound },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => router.replace("/login"))
      .finally(() => setChecking(false));
  }, [router]);

  if (checking || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner label="Opening Ada..." />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={user}>
      <div className="flex min-h-dvh">
        <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-line bg-surface max-lg:hidden">
          <div className="px-5 py-5">
            <Link href="/">
              <Logo />
            </Link>
          </div>
          <nav className="flex-1 space-y-0.5 px-3">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? "bg-accent-soft font-medium text-accent"
                      : "text-muted hover:bg-line/40 hover:text-ink"
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center justify-between border-t border-line px-5 py-4">
            <p className="truncate text-xs text-muted" title={user.email}>
              {user.email}
            </p>
            <ThemeToggle />
          </div>
        </aside>

        {/* Mobile top bar */}
        <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:hidden">
          <Link href="/">
            <Logo />
          </Link>
          <nav className="flex gap-1">
            {NAV.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className={`rounded-lg p-2 ${
                  pathname.startsWith(href) ? "bg-accent-soft text-accent" : "text-muted"
                }`}
              >
                <Icon className="size-4" />
              </Link>
            ))}
          </nav>
        </header>

        <main className="flex-1 px-6 pb-16 pt-8 max-lg:pt-20 lg:ml-60 lg:px-10">
          <div className="mx-auto max-w-3xl">{children}</div>
        </main>
      </div>
    </AuthContext.Provider>
  );
}
