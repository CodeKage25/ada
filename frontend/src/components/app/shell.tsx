"use client";

import {
  FileText,
  LayoutList,
  MessageCircle,
  Mic,
  Plus,
  UserRound,
} from "lucide-react";
import { motion } from "motion/react";
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

const NAV_GROUPS = [
  {
    label: "Runs",
    items: [
      { href: "/app/new", label: "New run", icon: Plus },
      { href: "/app/runs", label: "My runs", icon: LayoutList },
      { href: "/app/documents", label: "Documents", icon: FileText },
    ],
  },
  {
    label: "Coach",
    items: [
      { href: "/app/coach", label: "Ask Ada", icon: MessageCircle },
      { href: "/app/voice", label: "Voice intake", icon: Mic },
    ],
  },
] as const;

const MOBILE_NAV = [
  { href: "/app/new", label: "New", icon: Plus },
  { href: "/app/runs", label: "Runs", icon: LayoutList },
  { href: "/app/coach", label: "Ask Ada", icon: MessageCircle },
  { href: "/app/documents", label: "Docs", icon: FileText },
  { href: "/app/voice", label: "Voice", icon: Mic },
  { href: "/app/profile", label: "You", icon: UserRound },
] as const;

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
          <div className="px-5 pb-2 pt-5">
            <Link href="/">
              <Logo />
            </Link>
          </div>
          <nav className="flex-1 space-y-6 px-3 pt-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="eyebrow mb-2 px-3 !text-[10px]">{group.label}</p>
                <div className="space-y-0.5">
                  {group.items.map(({ href, label, icon: Icon }) => {
                    const active = pathname.startsWith(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                          active
                            ? "bg-accent-soft font-medium text-accent"
                            : "text-muted hover:bg-line/40 hover:text-ink"
                        }`}
                      >
                        {active && (
                          <span
                            className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent"
                            aria-hidden
                          />
                        )}
                        <Icon
                          className={`size-4 transition-transform ${active ? "" : "group-hover:scale-110"}`}
                        />
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className="border-t border-line px-3 py-3">
            <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
              <Link
                href="/app/profile"
                className="flex min-w-0 flex-1 items-center gap-2.5"
                title={user.email}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold uppercase text-accent">
                  {user.email[0]}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium">{user.email}</span>
                  <span className="block text-[10px] text-muted">View profile</span>
                </span>
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </aside>

        {/* Mobile: slim top bar + bottom tab bar */}
        <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between border-b border-line bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/">
            <Logo />
          </Link>
          <ThemeToggle />
        </header>
        <nav
          className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-auto flex max-w-md items-stretch justify-around">
            {MOBILE_NAV.map(({ href, icon: Icon, label }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={label}
                  className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${
                    active ? "text-accent" : "text-muted"
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>

        <main className="flex-1 px-6 pb-28 pt-8 max-lg:pt-20 lg:ml-60 lg:px-10 lg:pb-16">
          {/* Keyed by route so every page glides in */}
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.21, 0.6, 0.35, 1] }}
            className="mx-auto max-w-3xl"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </AuthContext.Provider>
  );
}
