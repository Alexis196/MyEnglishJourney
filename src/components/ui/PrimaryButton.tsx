"use client";

import Link from "next/link";
import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes } from "react";
import { cn } from "../../utils/cn";
import { primaryActionClasses, type PrimaryTone } from "./buttonStyles";

interface ToneProps {
  tone?: PrimaryTone;
}

export const PrimaryButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & ToneProps>(
  function PrimaryButton({ className, type = "button", tone = "brand", ...props }, ref) {
    return <button ref={ref} type={type} className={cn(primaryActionClasses[tone], className)} {...props} />;
  },
);

/** Same look as PrimaryButton, rendered as a Next.js link. */
export function PrimaryLink({
  className,
  href,
  tone = "brand",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & ToneProps & { href: string }) {
  return <Link href={href} className={cn("group", primaryActionClasses[tone], className)} {...props} />;
}
