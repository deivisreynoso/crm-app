"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form-label";
import { formatApiError } from "@/lib/validation-errors";
import axios from "axios";

export function TeamSettings() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"sales" | "viewer">("sales");
  const [msg, setMsg] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setInviteUrl(null);
    try {
      const { data } = await axios.post<{ invite_url?: string | null }>(
        "/api/team/members",
        {
          email: email.trim(),
          display_name: name.trim() || undefined,
          role,
        }
      );
      setEmail("");
      setName("");
      setRole("sales");

      if (data.invite_url) {
        setInviteUrl(data.invite_url);
        setMsg(
          "Invitation created. Share the link below or use the email we sent (if SMTP is configured)."
        );
      } else {
        setMsg(
          "Teammate added. They already have an account and appear in assignee lists."
        );
      }
    } catch (err) {
      setError(formatApiError(err, "Could not add teammate"));
    }
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setMsg("Invitation link copied to clipboard.");
    } catch {
      setError("Could not copy link. Select and copy manually.");
    }
  }

  return (
    <form onSubmit={handleAdd} className="space-y-3 max-w-lg">
      <p className="text-sm text-body-muted">
        Invite teammates by email. They receive a private registration link (valid 7 days).
        Public registration is disabled — only invited users can create a CRM account.
      </p>
      {error && <p className="text-sm text-[var(--error)]">{error}</p>}
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      {inviteUrl && (
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] p-3 space-y-2">
          <p className="text-xs font-medium text-heading">Registration link</p>
          <p className="text-xs text-body-muted break-all font-mono">{inviteUrl}</p>
          <Button type="button" size="sm" variant="outline" onClick={() => void copyInvite()}>
            Copy link
          </Button>
        </div>
      )}
      <div>
        <FormLabel>Email</FormLabel>
        <input
          type="email"
          className="input-field w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <FormLabel>Role</FormLabel>
        <select
          className="input-field w-full"
          value={role}
          onChange={(e) => setRole(e.target.value as "sales" | "viewer")}
        >
          <option value="sales">Sales — full CRM access</option>
          <option value="viewer">Viewer — read-only (coming soon)</option>
        </select>
      </div>
      <div>
        <FormLabel>Display name</FormLabel>
        <input
          className="input-field w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Optional"
        />
      </div>
      <Button type="submit" size="sm">
        Send invitation
      </Button>
    </form>
  );
}
