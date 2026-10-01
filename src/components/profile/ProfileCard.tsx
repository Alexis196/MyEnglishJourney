"use client";

import type { ReactNode } from "react";
import { ArtworkCard } from "../ui/ArtworkCard";

interface ProfileCardProps {
  title: string;
  subtitle: string;
  /** Used for the avatar initials only; shown text comes from `displayName`. */
  displayName: string;
  email?: string | null;
  children: ReactNode;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : [parts[0] ?? "?"];
  return letters
    .map((part) => part?.[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Profile card: the form stays on the left, a soft plant illustration sits in the lower right corner. */
export function ProfileCard({ title, subtitle, displayName, email, children }: ProfileCardProps) {
  return (
    <ArtworkCard
      art="profile"
      artPositionClassName="bg-right"
      contentClassName="@xl:max-w-[62%] @xl:py-8"
      hideArtWhenNarrow
      artClassName="dark:@xl:opacity-70"
      scrim="strong"
    >
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">{title}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-lg font-semibold text-white shadow-glow ring-2 ring-white/10"
          >
            {initialsOf(displayName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{displayName}</p>
            {email && <p className="truncate text-xs text-muted">{email}</p>}
          </div>
        </div>

        {children}
      </div>
    </ArtworkCard>
  );
}
