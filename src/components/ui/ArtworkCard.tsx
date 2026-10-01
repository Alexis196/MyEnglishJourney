"use client";

import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

interface ArtworkCardProps {
  /** Decorative illustration (public path). Never carries meaningful text. */
  image: string;
  /** Tailwind object-position class for the illustration, e.g. "object-right". */
  imagePositionClassName?: string;
  /** Extra classes for the content column (use it to cap the width over the artwork). */
  contentClassName?: string;
  /** Hide the illustration entirely when the card is narrow, instead of stacking it under the content. */
  hideArtWhenNarrow?: boolean;
  /** Tone of the left-to-right scrim that keeps text readable over the artwork. */
  scrim?: "soft" | "strong";
  /** Extra classes for the artwork box (e.g. opacity to calm a busy illustration). */
  artClassName?: string;
  /** Adds the blue glow shadow (used by the hero card). */
  glow?: boolean;
  className?: string;
  children: ReactNode;
}

const SCRIMS = {
  soft: "bg-gradient-to-r from-[#0A0D1C]/70 via-[#0A0D1C]/25 to-transparent",
  strong: "bg-gradient-to-r from-[#0A0D1C]/95 via-[#0A0D1C]/70 to-[#0A0D1C]/5",
} as const;

/**
 * Card whose content is real HTML and whose illustration is purely decorative.
 *
 * Layout adapts to the card's own width (container queries, not the viewport):
 * - wide: the artwork fills the card behind the content and a scrim fades it from the left;
 * - narrow: the content comes first and the artwork becomes a short banner below it
 *   (or disappears with `hideArtWhenNarrow`), so it never sits under text.
 * The image always uses object-fit: cover, so it is never stretched.
 */
export function ArtworkCard({
  image,
  imagePositionClassName = "object-right",
  contentClassName,
  hideArtWhenNarrow = false,
  scrim = "soft",
  glow = false,
  artClassName,
  className,
  children,
}: ArtworkCardProps) {
  return (
    <section
      className={cn(
        "@container relative isolate overflow-hidden rounded-3xl border border-white/[0.06] bg-surface-card-dark",
        glow ? "shadow-glow" : "shadow-soft-dark",
        className,
      )}
    >
      <div className="flex flex-col @xl:block">
        {/* Artwork box. Wide cards: sized by the card height (never stretched or cut vertically),
            pinned to the right, and its left edge is feathered into the card background. */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none relative order-2 h-36 overflow-hidden",
            "@xl:absolute @xl:inset-y-0 @xl:right-0 @xl:order-none @xl:h-auto @xl:aspect-[2048/768] @xl:min-w-full",
            "@xl:[mask-image:linear-gradient(to_right,transparent,black_28%)] @3xl:min-w-0",
            hideArtWhenNarrow && "hidden @xl:block",
            artClassName,
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt=""
            loading="lazy"
            decoding="async"
            className={cn("h-full w-full object-cover", imagePositionClassName)}
          />
          {/* narrow: fade the banner into the card background */}
          <div className="absolute inset-0 bg-gradient-to-b from-surface-card-dark via-surface-card-dark/20 to-transparent @xl:hidden" />
        </div>

        {/* wide: scrim behind the text column, over the whole card */}
        <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 hidden @xl:block", SCRIMS[scrim])} />

        <div className={cn("relative z-10 order-1 p-5 @xl:p-7", contentClassName)}>{children}</div>
      </div>
    </section>
  );
}
