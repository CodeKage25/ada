"use client";

import { ArrowRight, Bookmark, Check, ExternalLink, Inbox, Send, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button, Card, EmptyState, PageHeader, Skeleton, StatusBadge } from "@/components/ui";
import { ApiError, api, type FeedJob, type JobsFeed } from "@/lib/api";

type Tab = "new" | "tracked";

export default function JobsPage() {
  const [tab, setTab] = useState<Tab>("new");
  const [feed, setFeed] = useState<JobsFeed | null>(null);
  const [tracked, setTracked] = useState<FeedJob[] | null>(null);
  const [open, setOpen] = useState<FeedJob | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [applyMsg, setApplyMsg] = useState<Record<number, string>>({});

  useEffect(() => {
    api.jobsFeed(null).then(setFeed).catch(() => setFeed({ jobs: [], next_cursor: null, total: 0, role: null }));
    api.trackedJobs().then(setTracked).catch(() => setTracked([]));
  }, []);

  const loadMore = async () => {
    if (!feed?.next_cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await api.jobsFeed(feed.next_cursor);
      setFeed({ ...next, jobs: [...feed.jobs, ...next.jobs] });
    } finally {
      setLoadingMore(false);
    }
  };

  // Triage removes the job from the inbox optimistically; Track also adds to the shortlist.
  const triage = useCallback(
    async (job: FeedJob, action: "tracked" | "dismissed") => {
      setFeed((f) =>
        f ? { ...f, total: f.total - 1, jobs: f.jobs.filter((j) => j.id !== job.id) } : f,
      );
      if (action === "tracked") setTracked((t) => (t ? [job, ...t] : [job]));
      setOpen(null);
      await api.triageJob(job.id, action).catch(() => {});
    },
    [],
  );

  const apply = async (job: FeedJob) => {
    setApplyMsg((m) => ({ ...m, [job.id]: "…" }));
    try {
      const out = await api.applyToJob(job.id);
      setApplyMsg((m) => ({
        ...m,
        [job.id]: out.already_applied ? "Already applied" : "Ada is applying…",
      }));
    } catch (err) {
      setApplyMsg((m) => ({
        ...m,
        [job.id]: err instanceof ApiError ? err.message : "Couldn't apply — try again.",
      }));
    }
  };

  return (
    <>
      <PageHeader
        title="Jobs."
        subtitle={
          feed?.role
            ? `Fresh roles matched to “${feed.role}” — review each one, track or pass.`
            : "Fresh roles from the market — review each one, track or pass."
        }
      />

      <div className="mb-5 flex gap-1 rounded-full border border-line bg-surface p-1 text-sm w-fit">
        {(
          [
            { key: "new", label: `New${feed ? ` · ${Math.min(feed.total, 99)}${feed.total > 99 ? "+" : ""}` : ""}` },
            { key: "tracked", label: `Tracked${tracked ? ` · ${tracked.length}` : ""}` },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 transition-colors ${
              tab === t.key ? "bg-accent-soft font-medium text-accent" : "text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "new" ? (
        feed === null ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="px-5 py-4">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="mt-2 h-3 w-40" />
              </Card>
            ))}
          </div>
        ) : feed.jobs.length === 0 ? (
          <EmptyState
            icon={<Inbox className="size-5" />}
            title="Inbox zero"
            body="No new roles right now — Ada ingests fresh jobs continuously, so check back soon."
          />
        ) : (
          <>
            <div className="space-y-2.5">
              {feed.jobs.map((job) => (
                <Card key={job.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{job.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {job.company} · {job.remote ? "Remote" : job.location}
                    </p>
                  </div>
                  <Button variant="secondary" onClick={() => setOpen(job)} className="!py-2 text-xs">
                    Review <ArrowRight className="size-3.5" />
                  </Button>
                </Card>
              ))}
            </div>
            {feed.next_cursor && (
              <div className="mt-5 text-center">
                <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
                  Load more ({feed.total - feed.jobs.length} left)
                </Button>
              </div>
            )}
          </>
        )
      ) : tracked === null ? (
        <Skeleton className="h-24 w-full" />
      ) : tracked.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="size-5" />}
          title="Nothing tracked yet"
          body="Track roles from the New tab and they'll collect here — then let Ada apply."
        />
      ) : (
        <div className="space-y-2.5">
          {tracked.map((job) => (
            <Card key={job.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{job.title}</p>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {job.company} · {job.remote ? "Remote" : job.location}
                </p>
                {applyMsg[job.id] && (
                  <p className="mt-1 text-xs text-accent">{applyMsg[job.id]}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {job.url && (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted transition-colors hover:text-ink"
                    aria-label="View job post"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                )}
                <Button onClick={() => apply(job)} className="!py-2 text-xs">
                  <Send className="size-3.5" /> Apply
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {open && (
        <ReviewModal
          job={open}
          onClose={() => setOpen(null)}
          onTrack={() => triage(open, "tracked")}
          onDismiss={() => triage(open, "dismissed")}
        />
      )}
    </>
  );
}

function ReviewModal({
  job,
  onClose,
  onTrack,
  onDismiss,
}: {
  job: FeedJob;
  onClose: () => void;
  onTrack: () => void;
  onDismiss: () => void;
}) {
  // Keyboard triage: T track, S skip, Esc close — fast inbox-zero flow.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key.toLowerCase() === "t") onTrack();
      else if (e.key.toLowerCase() === "s") onDismiss();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onTrack, onDismiss]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={job.title}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-surface shadow-lift sm:rounded-3xl"
      >
        <div className="border-b border-line px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="display text-xl">{job.title}</p>
              <p className="mt-0.5 text-sm text-muted">
                {job.company} · {job.remote ? "Remote" : job.location}
              </p>
            </div>
            <StatusBadge tone="neutral">Web-sourced</StatusBadge>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{job.description}</p>
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-accent underline-offset-2 hover:underline"
            >
              View job post <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
        <div className="flex items-center justify-center gap-3 border-t border-line px-6 py-4">
          <Button variant="secondary" onClick={onDismiss} className="!px-6">
            <X className="size-4" /> Not for me
          </Button>
          <Button onClick={onTrack} className="!px-8">
            <Check className="size-4" /> Track
          </Button>
        </div>
        <p className="pb-3 text-center text-[11px] text-muted">
          T to track · S to skip · Esc to close
        </p>
      </div>
    </div>
  );
}
