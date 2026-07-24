"use client";

import { Check, LogOut } from "lucide-react";
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
import { api } from "@/lib/api";

export default function ProfilePage() {
  const { email } = useAuth();
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [profileText, setProfileText] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getProfile()
      .then((p) => {
        if (p) {
          setProfileText(p.profile_text);
          setLinkedinUrl(p.linkedin_url ?? "");
        }
      })
      .finally(() => setLoaded(true));
  }, []);

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

  return (
    <>
      <PageHeader
        title="Profile."
        subtitle="The more Ada knows about your background, the sharper her advice, rewrites, and matches get."
      />

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

      <Card className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold uppercase text-accent">
            {email[0]}
          </span>
          <div>
            <p className="text-sm font-medium">{email}</p>
            <p className="text-xs text-muted">Signed in with email and password</p>
          </div>
        </div>
        <Button variant="secondary" onClick={logout}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </Card>
    </>
  );
}
