const SESSION_KEY = "clickin360_chat_session_id";
const SECRET_KEY = "clickin360_chat_session_secret";
const PROFILE_KEY = "clickin360_chat_profile";

export type ChatProfile = {
  name?: string;
  email?: string;
};

function randomUuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getOrCreateChatSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = randomUuid();
    localStorage.setItem(SESSION_KEY, id);
    localStorage.removeItem(SECRET_KEY);
  }
  return id;
}

export function getOrCreateChatSessionSecret(): string {
  if (typeof window === "undefined") return "";
  let secret = localStorage.getItem(SECRET_KEY);
  if (!secret) {
    secret = randomUuid() + randomUuid().replace(/-/g, "");
    localStorage.setItem(SECRET_KEY, secret);
  }
  return secret;
}

export function getChatProfile(): ChatProfile {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ChatProfile;
  } catch {
    return {};
  }
}

export function saveChatProfile(profile: ChatProfile) {
  if (typeof window === "undefined") return;
  const current = getChatProfile();
  localStorage.setItem(
    PROFILE_KEY,
    JSON.stringify({ ...current, ...profile })
  );
}

export const CHAT_OPEN_EVENT = "clickin360:open-chat";

export function openChatWidget() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHAT_OPEN_EVENT));
}
