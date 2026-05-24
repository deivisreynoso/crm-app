"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
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
        openChatWidget();
        onClick?.(e);
      }}
    >
      {children}
    </button>
  );
}
