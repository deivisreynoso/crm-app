"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ga4Events } from "@/lib/analytics/ga4-events";
import { openChatWidget } from "@/lib/website/chat-session";

type ChatOpenButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

/** Opens the floating chat overlay (dispatches `clickin360:open-chat`). */
export function ChatOpenButton({
  children,
  onClick,
  type = "button",
  ...props
}: ChatOpenButtonProps) {
  return (
    <button
      type={type}
      {...props}
      onClick={(e) => {
        ga4Events.chatStart("cta_button");
        openChatWidget();
        onClick?.(e);
      }}
    >
      {children}
    </button>
  );
}
