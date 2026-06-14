"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  Bot,
  ChevronDown,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  X,
} from "lucide-react";
import {
  CHAT_OPEN_EVENT,
  getChatProfile,
  getOrCreateChatSessionId,
  saveChatProfile,
} from "@/lib/website/chat-session";
import {
  parseSlotOptions,
  stripSlotLines,
  type ParsedSlotOption,
} from "@/lib/website/parse-chat-slots";
import { ga4Events } from "@/lib/analytics/ga4-events";

export type ChatWidgetProps = {
  /** Label on the floating bubble (tooltip / aria) */
  ctaText?: string;
  position?: "bottom-right" | "bottom-left";
  /** Accent color (CSS color) */
  color?: string;
  /** POST endpoint — default same-origin proxy → N8N */
  apiBaseUrl?: string;
  agentName?: string;
  placeholder?: string;
  locale?: "es" | "en";
  /** floating = bubble + overlay; inline = panel only (e.g. #chat section) */
  variant?: "floating" | "inline";
  className?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  slotOptions?: ParsedSlotOption[];
  status?: "sent" | "error";
  retryPayload?: string;
};

const COPY = {
  es: {
    agentName: "Andrea",
    placeholder: "Escribe tu mensaje…",
    send: "Enviar",
    close: "Cerrar chat",
    open: "Abrir chat",
    minimize: "Minimizar",
    typing: "Andrea está escribiendo…",
    error: "No pudimos enviar tu mensaje.",
    retry: "Reintentar",
    welcome:
      "¡Hola! Soy Andrea de ClickIn360. ¿En qué te puedo ayudar con tu tienda hoy?",
    slotPrompt: "Elige un horario:",
    you: "Tú",
  },
  en: {
    agentName: "Andrea",
    placeholder: "Type your message…",
    send: "Send",
    close: "Close chat",
    open: "Open chat",
    minimize: "Minimize",
    typing: "Andrea is typing…",
    error: "We couldn't send your message.",
    retry: "Retry",
    welcome:
      "Hi! I'm Andrea from ClickIn360. How can I help with your store today?",
    slotPrompt: "Pick a time:",
    you: "You",
  },
} as const;

const DEFAULT_API = "/api/website/chat";

function messageId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function extractReply(data: unknown): string {
  if (data == null) return "";
  if (typeof data === "string") return data.trim();
  if (typeof data !== "object") return String(data);

  const o = data as Record<string, unknown>;
  const nested = o.reply;
  if (typeof nested === "string") return nested.trim();
  if (nested && typeof nested === "object") {
    const r = nested as Record<string, unknown>;
    for (const key of [
      "reply_to_user",
      "message",
      "text",
      "latest_ai_response",
      "output",
    ]) {
      const v = r[key];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    if (typeof r.output === "object" && r.output) {
      const out = r.output as Record<string, unknown>;
      if (typeof out.reply_to_user === "string") return out.reply_to_user.trim();
    }
  }

  for (const key of [
    "reply_to_user",
    "message",
    "text",
    "latest_ai_response",
    "reply",
  ]) {
    const v = o[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }

  return "";
}

export function ChatWidget({
  ctaText,
  position = "bottom-right",
  color = "#3e5fde",
  apiBaseUrl = DEFAULT_API,
  agentName,
  placeholder,
  locale = "es",
  variant = "floating",
  className = "",
}: ChatWidgetProps) {
  const t = COPY[locale];
  const agent = agentName ?? t.agentName;
  const inputPlaceholder = placeholder ?? t.placeholder;
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(variant === "inline");
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [profile, setProfile] = useState<{ name?: string; email?: string }>({});
  const [welcomed, setWelcomed] = useState(false);
  const [lastHumanMsgId, setLastHumanMsgId] = useState<string | null>(null);
  const [humanMode, setHumanMode] = useState(false);

  useEffect(() => {
    setSessionId(getOrCreateChatSessionId());
    setProfile(getChatProfile());
  }, []);

  useEffect(() => {
    if (variant === "inline") {
      ga4Events.chatStart("inline_section");
    }
  }, [variant]);

  useEffect(() => {
    if (variant !== "floating") return;
    const onOpen = () => {
      setOpen(true);
      setMinimized(false);
    };
    window.addEventListener(CHAT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(CHAT_OPEN_EVENT, onOpen);
  }, [variant]);

  useEffect(() => {
    if ((open || variant === "inline") && !welcomed && messages.length === 0) {
      setMessages([
        {
          id: messageId(),
          role: "assistant",
          content: t.welcome,
        },
      ]);
      setWelcomed(true);
    }
  }, [open, variant, welcomed, messages.length, t.welcome]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: variant === "inline" ? "auto" : "smooth",
    });
  }, [messages, loading, variant]);

  useEffect(() => {
    if (variant === "inline") return;
    if (open && !minimized) {
      const timer = window.setTimeout(
        () => inputRef.current?.focus({ preventScroll: true }),
        200
      );
      return () => window.clearTimeout(timer);
    }
  }, [open, minimized, variant]);

  useEffect(() => {
    if (!sessionId) return;
    if (variant === "floating" && !open) return;

    const poll = async () => {
      try {
        const params = new URLSearchParams({ session_id: sessionId });
        if (lastHumanMsgId) params.set("after", lastHumanMsgId);
        const res = await fetch(`/api/website/chat/messages?${params}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          handler?: string;
          messages?: Array<{ id: string; body: string }>;
        };
        if (data.handler === "human") setHumanMode(true);
        if (data.handler === "ai") setHumanMode(false);
        for (const msg of data.messages ?? []) {
          setLastHumanMsgId(msg.id);
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [
              ...prev,
              {
                id: msg.id,
                role: "assistant" as const,
                content: msg.body,
              },
            ];
          });
        }
      } catch {
        /* ignore poll errors */
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 3000);
    return () => window.clearInterval(interval);
  }, [sessionId, open, variant, lastHumanMsgId]);

  const postMessage = useCallback(
    async (text: string, userMessageId?: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setLoading(true);

      try {
        const res = await fetch(apiBaseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId || getOrCreateChatSessionId(),
            message: trimmed,
            ...(profile.name ? { name: profile.name } : {}),
            ...(profile.email ? { email: profile.email } : {}),
          }),
        });

        const body = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(
            typeof body.error === "string" ? body.error : t.error
          );
        }

        const rawReply = extractReply(body.reply ?? body);
        const slots = parseSlotOptions(rawReply);
        const displayText = slots.length ? stripSlotLines(rawReply) : rawReply;

        if (userMessageId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === userMessageId ? { ...m, status: "sent" } : m
            )
          );
        }

        if (!displayText && !rawReply) {
          setHumanMode(true);
          setLoading(false);
          return;
        }

        setHumanMode(false);
        setMessages((prev) => [
          ...prev,
          {
            id: messageId(),
            role: "assistant",
            content: displayText || rawReply || "…",
            slotOptions: slots.length ? slots : undefined,
          },
        ]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : t.error;
        setMessages((prev) => [
          ...prev,
          {
            id: messageId(),
            role: "assistant",
            content: msg,
            status: "error",
            retryPayload: trimmed,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [apiBaseUrl, loading, profile.email, profile.name, sessionId, t.error]
  );

  const sendUserMessage = useCallback(
    (displayText: string, apiText?: string) => {
      const trimmed = displayText.trim();
      const outbound = (apiText ?? trimmed).trim();
      if (!trimmed || !outbound || loading) return;

      const emailMatch = trimmed.match(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
      );
      if (emailMatch) {
        const email = emailMatch[0].toLowerCase();
        saveChatProfile({ email });
        setProfile((p) => ({ ...p, email }));
      }

      const userMsg: ChatMessage = {
        id: messageId(),
        role: "user",
        content: trimmed,
        status: "sent",
      };
      const length =
        trimmed.length > 100 ? "long" : trimmed.length > 50 ? "medium" : "short";
      ga4Events.chatMessage("user_message", length);

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      void postMessage(outbound, userMsg.id);
    },
    [loading, postMessage]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendUserMessage(input);
  };

  const handleSlotPick = (index: number, label: string) => {
    const confirm =
      locale === "es"
        ? `Elegiste la opción ${index}${label ? `: ${label}` : ""}`
        : `You chose option ${index}${label ? `: ${label}` : ""}`;
    sendUserMessage(confirm, String(index));
  };

  const handleRetry = (payload: string, errorMsgId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== errorMsgId));
    sendUserMessage(payload);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape" && variant === "floating") {
      setOpen(false);
    }
  };

  const positionClass =
    position === "bottom-left" ? "left-4 sm:left-6" : "right-4 sm:right-6";

  const panel = (
    <div
      className={`flex flex-col bg-[var(--card)] text-[var(--foreground)] border border-[var(--card-border)] shadow-2xl overflow-hidden ${
        variant === "inline"
          ? "h-[min(520px,70vh)] w-full rounded-2xl"
          : "h-full w-full sm:h-[min(640px,85vh)] sm:max-w-lg sm:rounded-2xl sm:m-auto"
      }`}
      onKeyDown={handleKeyDown}
    >
      <header
        className="flex items-center gap-3 px-4 py-3 border-b border-[var(--card-border)] shrink-0"
        style={{ background: `linear-gradient(135deg, ${color} 0%, #6b4bb8 100%)` }}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white"
          aria-hidden
        >
          <Bot className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 id={titleId} className="text-sm font-semibold text-white truncate">
            {agent}
          </h2>
          <p className="text-xs text-white/80">ClickIn 360</p>
        </div>
        {variant === "floating" && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMinimized(true)}
              className="p-2 rounded-lg text-white/90 hover:bg-white/15 transition-colors"
              aria-label={t.minimize}
            >
              <ChevronDown className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-2 rounded-lg text-white/90 hover:bg-white/15 transition-colors"
              aria-label={t.close}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </header>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[var(--background)] min-h-0"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            agent={agent}
            youLabel={t.you}
            slotPrompt={t.slotPrompt}
            retryLabel={t.retry}
            accent={color}
            onSlotPick={handleSlotPick}
            onRetry={handleRetry}
            disabled={loading}
          />
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <span>{t.typing}</span>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 p-3 border-t border-[var(--card-border)] bg-[var(--card)] shrink-0"
      >
        <label htmlFor={`${titleId}-input`} className="sr-only">
          {inputPlaceholder}
        </label>
        <input
          id={`${titleId}-input`}
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={inputPlaceholder}
          disabled={loading}
          autoComplete="off"
          className="flex-1 min-w-0 rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--secondary)] disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="inline-flex items-center justify-center h-11 w-11 rounded-xl text-white transition-opacity disabled:opacity-40 shrink-0"
          style={{ backgroundColor: color }}
          aria-label={t.send}
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );

  if (variant === "inline") {
    return <div className={className}>{panel}</div>;
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-[100] flex flex-col transition-all duration-300 ease-out ${
          open && !minimized
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open || minimized}
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px] sm:bg-black/50"
          aria-label={t.close}
          onClick={() => setOpen(false)}
          tabIndex={open && !minimized ? 0 : -1}
        />
        <div
          className={`relative flex flex-col h-full w-full sm:p-4 chat-widget-panel-enter ${
            open && !minimized ? "chat-widget-panel-visible" : ""
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          {panel}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          ga4Events.chatStart("floating_widget");
          setOpen(true);
          setMinimized(false);
        }}
        className={`fixed bottom-4 sm:bottom-6 z-[99] flex h-[60px] w-[60px] items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--secondary)] ${positionClass} ${
          open && !minimized ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        }`}
        style={{ backgroundColor: color }}
        aria-label={ctaText ?? t.open}
        title={ctaText ?? t.open}
      >
        <MessageCircle className="h-7 w-7" aria-hidden />
      </button>
    </>
  );
}

function MessageBubble({
  msg,
  agent,
  youLabel,
  slotPrompt,
  retryLabel,
  accent,
  onSlotPick,
  onRetry,
  disabled,
}: {
  msg: ChatMessage;
  agent: string;
  youLabel: string;
  slotPrompt: string;
  retryLabel: string;
  accent: string;
  onSlotPick: (index: number, label: string) => void;
  onRetry: (payload: string, errorId: string) => void;
  disabled: boolean;
}) {
  const isUser = msg.role === "user";

  if (msg.status === "error" && msg.retryPayload) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50 px-3 py-2 text-sm text-red-800 dark:text-red-200">
        <p>{msg.content}</p>
        <button
          type="button"
          onClick={() => onRetry(msg.retryPayload!, msg.id)}
          disabled={disabled}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold underline-offset-2 hover:underline disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {retryLabel}
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
      <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)] px-1">
        {isUser ? youLabel : agent}
      </span>
      <div
        className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "rounded-br-md text-white"
            : "rounded-bl-md bg-[var(--card)] border border-[var(--card-border)] text-[var(--foreground)]"
        }`}
        style={isUser ? { backgroundColor: accent } : undefined}
      >
        {msg.content}
      </div>
      {msg.slotOptions && msg.slotOptions.length > 0 && (
        <div className="w-full max-w-[92%] space-y-2 pt-1">
          <p className="text-xs font-medium text-[var(--muted)] px-1">{slotPrompt}</p>
          <div className="flex flex-col gap-2">
            {msg.slotOptions.map((slot) => (
              <button
                key={slot.index}
                type="button"
                disabled={disabled}
                onClick={() => onSlotPick(slot.index, slot.label)}
                className="text-left rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2.5 text-sm hover:border-[var(--secondary)] hover:bg-[var(--sidebar-hover)] transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--secondary)]"
              >
                <span className="font-semibold" style={{ color: accent }}>
                  {slot.index})
                </span>{" "}
                {slot.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
