"use client";

import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

/**
 * Each illustration has a dark and a light file; globals.css points --art-* at the right one for the active
 * theme (`system` is resolved before first paint), so the browser only ever downloads the active theme's image.
 */
const ARTWORK = {
  hero: "bg-[image:var(--art-hero)]",
  plan: "bg-[image:var(--art-plan)]",
  speaking: "bg-[image:var(--art-speaking)]",
  profile: "bg-[image:var(--art-profile)]",
} as const;

export type ArtworkName = keyof typeof ARTWORK;

const SCRIMS = {
  soft: "bg-[image:var(--scrim-soft)]",
  strong: "bg-[image:var(--scrim-strong)]",
} as const;

interface ArtworkCardProps {
  /** Which decorative illustration to show (purely decorative, never carries meaningful text). */
  art: ArtworkName;
  /** Tailwind background-position classes for the illustration, e.g. "bg-right". */
  artPositionClassName?: string;
  /** Extra classes for the content column (use it to cap the width over the artwork). */
  contentClassName?: string;
  /** Hide the illustration entirely when the card is narrow, instead of stacking it under the content. */
  hideArtWhenNarrow?: boolean;
  /** Strength of the left-to-right scrim that keeps text readable over the artwork. */
  scrim?: keyof typeof SCRIMS;
  /** Extra classes for the artwork box. */
  artClassName?: string;
  /** Featured shadow (blue glow on dark, soft blue-tinted lift on light). */
  featured?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Card whose content is real HTML and whose illustration is purely decorative.
 *
 * Layout adapts to the card's own width (container queries, not the viewport):
 * - wide: the artwork fills the card behind the content and a scrim fades it from the left;
 * - narrow: the content comes first and the artwork becomes a short banner below it
 *   (or disappears with `hideArtWhenNarrow`), so it never sits under text.
 * The illustration is a CSS background with background-size: cover, so it is never stretched.
 */
export function ArtworkCard({
  art,
  artPositionClassName = "bg-right",
  contentClassName,
  hideArtWhenNarrow = false,
  scrim = "soft",
  artClassName,
  featured = false,
  className,
  children,
}: ArtworkCardProps) {
  return (
    <section
      className={cn(
        "@container relative isolate overflow-hidden rounded-3xl border border-line bg-card",
        featured ? "shadow-featured" : "shadow-raised",
        className,
      )}
    >
      <div className="flex flex-col @xl:block">
        {/* Artwork box. Wide cards: sized by the card height (never stretched or cut vertically),
            pinned to the right, and its left edge is feathered into the card background. */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none relative order-2 h-36 overflow-hidden bg-cover bg-no-repeat",
            ARTWORK[art],
            artPositionClassName,
            "@xl:absolute @xl:inset-y-0 @xl:right-0 @xl:order-none @xl:h-auto @xl:aspect-[2048/768] @xl:min-w-full",
            "@xl:[mask-image:linear-gradient(to_right,transparent,black_28%)] @3xl:min-w-0",
            hideArtWhenNarrow && "hidden @xl:block",
            artClassName,
          )}
        >
          {/* narrow: fade the banner into the card background */}
          <div className="absolute inset-0 bg-gradient-to-b from-card via-card/20 to-transparent @xl:hidden" />
        </div>

        {/* wide: scrim behind the text column, over the whole card */}
        <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 hidden @xl:block", SCRIMS[scrim])} />

        <div className={cn("relative z-10 order-1 p-5 @xl:p-7", contentClassName)}>{children}</div>
      </div>
    </section>
  );
}
