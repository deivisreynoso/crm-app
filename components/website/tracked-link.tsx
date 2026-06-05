"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { ga4Events } from "@/lib/analytics/ga4-events";

type TrackedLinkProps = ComponentProps<typeof Link> & {
  ctaName: string;
  ctaLocation: string;
};

export function TrackedLink({
  ctaName,
  ctaLocation,
  href,
  onClick,
  ...props
}: TrackedLinkProps) {
  const destination = typeof href === "string" ? href : "";

  return (
    <Link
      href={href}
      {...props}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        ga4Events.ctaClick(ctaName, ctaLocation, destination);
        onClick?.(e);
      }}
    />
  );
}

type TrackedAnchorProps = ComponentProps<"a"> & {
  ctaName: string;
  ctaLocation: string;
};

export function TrackedAnchor({
  ctaName,
  ctaLocation,
  href,
  onClick,
  ...props
}: TrackedAnchorProps) {
  return (
    <a
      href={href}
      {...props}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        ga4Events.ctaClick(ctaName, ctaLocation, href ?? "");
        onClick?.(e);
      }}
    />
  );
}
