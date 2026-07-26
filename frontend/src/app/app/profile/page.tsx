"use client";

import { Brain, Check, KeyRound, LogOut, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/app/shell";
import {
  Button,
  Card,
  Input,
  Label,
  PageHeader,
  Skeleton,
  Textarea,
} from "@/components/ui";
import { api, type Memory, type SubscriptionState } from "@/lib/api";

const TIER_LABEL = { free: "Free", pro: "Pro", premium: "Premium" } as const;

/** What Ada has learned from chats — visible, and deletable one fact at a time. */
function Memories() {
  const [memories, setMemories] = useState<Memory[] | null>(null);

  useEffect(() => {
    api
      .listMemories()
      .then(setMemories)
      .catch(() => setMemories([]));
  }, []);

  const forget = async (id: number) => {
    setMemories((prev) => prev?.filter((m) => m.id !== id) ?? null);
    try {
      await api.deleteMemory(id);
    } catch {
      const fresh = await api.listMemories().catch(() => []);
      setMemories(fresh);
    }
  };

  if (memories === null || memories.length === 0) return null;

  return (
    <Card className="mb-6 p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-xl bg-accent-soft">
          <Brain className="size-4 text-accent" />
        </span>
        <div>
          <p className="font-medium">What Ada remembers</p>
          <p className="text-xs text-muted">
            Learned from your conversations — remove anything that&apos;s off.
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {memories.map((m) => (
          <li
            key={m.id}
            className="group flex items-start justify-between gap-3 rounded-lg bg-line/20 px-3.5 py-2.5 text-sm"
          >
            <span>{m.content}</span>
            <button
              type="button"
              onClick={() => forget(m.id)}
              aria-label={`Forget: ${m.content}`}
              className="mt-0.5 shrink-0 text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function ProfilePage() {
  const { email } = useAuth();
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [profileText, setProfileText] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [identitySaving, setIdentitySaving] = useState(false);
  const [identitySaved, setIdentitySaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [sub, setSub] = useState<SubscriptionState | null>(null);
  const [resetState, setResetState] = useState<"idle" | "sending" | "sent">("idle");

  useEffect(() => {
    api
      .getProfile()
      .then((p) => {
        if (p) {
          setProfileText(p.profile_text);
          setLinkedinUrl(p.linkedin_url ?? "");
          setFullName(p.full_name ?? "");
          setPhone(p.phone ?? "");
        }
      })
      .finally(() => setLoaded(true));
    api
      .getSubscription()
      .then(setSub)
      .catch(() => setSub(null));
  }, []);

  const sendReset = async () => {
    setResetState("sending");
    try {
      await api.requestReset(email);
      setResetState("sent");
    } catch {
      setResetState("idle");
      setError("Couldn't send the reset email — try again.");
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.putProfile({
        profile_text: profileText,
        linkedin_url: linkedinUrl || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  };

  const saveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setIdentitySaving(true);
    setError("");
    try {
      await api.putIdentity(fullName.trim(), phone.trim() || null);
      setIdentitySaved(true);
      setTimeout(() => setIdentitySaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setIdentitySaving(false);
    }
  };

  const logout = async () => {
    await api.logout();
    router.replace("/login");
  };

  if (!loaded) {
    return (
      <div>
        <Skeleton className="h-9 w-40" />
        <Card className="mt-8 space-y-4 p-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-48 w-full" />
        </Card>
      </div>
    );
  }

  const displayName = fullName.trim() || email.split("@")[0];
  const tier = sub?.tier ?? "free";

  return (
    <>
      <PageHeader
        title="Profile."
        subtitle="The more Ada knows about your background, the sharper her advice, rewrites, and matches get."
      />

      {/* Who you are, at a glance — identity, plan, and the door to billing */}
      <Card className="mb-6 overflow-hidden !p-0">
        <div className="flex flex-wrap items-center justify-between gap-5 bg-gradient-to-r from-accent-soft/70 to-transparent px-6 py-6">
          <div className="flex items-center gap-4">
            <span className="display flex size-14 shrink-0 items-center justify-center rounded-full bg-ink text-xl uppercase text-bg">
              {displayName[0]}
            </span>
            <div className="min-w-0">
              <p className="display truncate text-2xl">{displayName}</p>
              <p className="truncate text-sm text-muted">{email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium">
              {tier !== "free" && <Sparkles className="size-3.5 text-gold" />}
              {TIER_LABEL[tier]}
              {tier !== "free" && sub?.current_period_end && (
                <span className="text-muted">
                  · renews {new Date(sub.current_period_end).toLocaleDateString()}
                </span>
              )}
            </span>
            <Link href="/app/billing">
              <Button variant="secondary" className="!py-2 text-[13px]">
                {tier === "free" ? "Go unlimited" : "Manage plan"}
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      <Card className="mb-6 p-6">
        <form onSubmit={saveIdentity} className="space-y-5">
          <div>
            <p className="font-medium">Applicant details</p>
            <p className="mt-1 text-xs text-muted">
              Used when Ada fills application forms on your behalf.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="full-name">Full name</Label>
              <Input
                id="full-name"
                required
                minLength={2}
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="+234 800 000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" loading={identitySaving} variant="secondary">
            {identitySaved ? (
              <>
                <Check className="size-4" /> Saved
              </>
            ) : (
              "Save details"
            )}
          </Button>
        </form>
      </Card>

      <Card className="mb-6 p-6">
        <form onSubmit={save} className="space-y-5">
          <div>
            <Label htmlFor="linkedin">LinkedIn URL</Label>
            <Input
              id="linkedin"
              type="url"
              placeholder="https://linkedin.com/in/you"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="profile">Your career background</Label>
            <Textarea
              id="profile"
              rows={12}
              minLength={50}
              required
              placeholder={
                "Paste your LinkedIn profile content (open your profile → More → Save to PDF, then copy the text), or write your background: roles, achievements, skills, education."
              }
              value={profileText}
              onChange={(e) => setProfileText(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-muted">
              LinkedIn doesn&apos;t let apps read profiles directly — pasting your export
              gives Ada the same depth, on your terms.
            </p>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" loading={saving}>
            {saved ? (
              <>
                <Check className="size-4" /> Saved
              </>
            ) : (
              "Save profile"
            )}
          </Button>
        </form>
      </Card>

      <Memories />

      {/* Account & security */}
      <Card className="divide-y divide-line !p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft">
              <KeyRound className="size-4 text-accent" />
            </span>
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted">
                {resetState === "sent"
                  ? `Reset link sent to ${email} — follow it to set a new password.`
                  : "We'll email you a link to set a new one."}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={sendReset}
            loading={resetState === "sending"}
            disabled={resetState === "sent"}
          >
            {resetState === "sent" ? (
              <>
                <Check className="size-4" /> Sent
              </>
            ) : (
              "Change password"
            )}
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div>
            <p className="text-sm font-medium">{email}</p>
            <p className="text-xs text-muted">Signed in with email and password</p>
          </div>
          <Button variant="secondary" onClick={logout}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </Card>
    </>
  );
}
