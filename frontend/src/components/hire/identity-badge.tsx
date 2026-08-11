import { BadgeCheck, UserRound } from "lucide-react";

import { type IdentityLevel } from "@/lib/api";

/** Honest identity evidence: a green check means government-ID verified only.
 *  Self-attestation renders as a neutral label so the two can never be confused. */
export function IdentityBadge({ level }: { level?: IdentityLevel | null }) {
  if (level === "government_id_verified") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success"
        title="Government ID verified by Smile Identity"
      >
        <BadgeCheck className="size-3" /> ID verified
      </span>
    );
  }
  if (level === "self_attested") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted"
        title="The candidate affirmed their identity — not independently verified"
      >
        <UserRound className="size-3" /> Self-attested
      </span>
    );
  }
  return null;
}
