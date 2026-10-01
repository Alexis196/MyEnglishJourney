"use client";

import { cn } from "../../utils/cn";

export function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/logo-128.webp"
      alt="My English Journey"
      className={cn("shrink-0 rounded-lg object-cover", className)}
    />
  );
}
