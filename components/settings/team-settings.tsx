"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form-label";
import { formatApiError } from "@/lib/validation-errors";
import { useWorkspace } from "@/components/crm/workspace-provider";
import axios from "axios";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

type MemberRole = "sales" | "viewer" | "admin" | "finance" | "support";

type TeamMember = {
  id: string;
  label: string;
  email: string;
  role?: string;
};

const ROLE_LABELS: Record<MemberRole, string> = {
  sales: "Sales — own CRM records + queue",
  admin: "Admin — full workspace",
  finance: "Finance — invoices & transactions",
  support: "Support — all contacts, tickets, inbox",
  viewer: "Viewer — read-only demo",
};

function isEditableRole(role: string | undefined): role is MemberRole {
  return (
    role === "sales" ||
    role === "admin" ||
    role === "viewer" ||
    role === "finance" ||
    role === "support"
  );
}

export function TeamSettings() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<MemberRole>("sales");
  const [msg, setMsg] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [roleDraft, setRoleDraft] = useState<Record<string, MemberRole>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { ctx } = useWorkspace();
  const isOwner = ctx?.isWorkspaceOwner ?? false;
  const { confirm, dialogProps } = useConfirmDialog();

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const { data } = await axios.get<{ data: TeamMember[] }>("/api/team/members");
      setMembers(data.data ?? []);
      const drafts: Record<string, MemberRole> = {};
      for (const m of data.data ?? []) {
        if (isEditableRole(m.role)) drafts[m.id] = m.role;
      }
      setRoleDraft(drafts);
    } catch {
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

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
      await loadMembers();

      if (data.invite_url) {
        setInviteUrl(data.invite_url);
        setMsg(
          "Invitation created. Share the link below or check the invite email we sent."
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

  async function handleRoleSave(member: TeamMember) {
    const nextRole = roleDraft[member.id];
    if (!nextRole || nextRole === member.role) return;

    setSavingId(member.id);
    setError(null);
    setMsg(null);
    try {
      await axios.patch(`/api/team/members/${member.id}`, { role: nextRole });
      setMsg(`Updated role for ${member.email}.`);
      await loadMembers();
    } catch (err) {
      setError(formatApiError(err, "Could not update role"));
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(member: TeamMember) {
    const confirmed = await confirm({
      title: `Remove ${member.email}?`,
      description: "They will lose access to this workspace immediately.",
      confirmLabel: "Remove teammate",
      destructive: true,
    });
    if (!confirmed) return;

    setDeletingId(member.id);
    setError(null);
    setMsg(null);
    try {
      await axios.delete(`/api/team/members/${member.id}`);
      setMsg(`Removed ${member.email} from the team.`);
      await loadMembers();
    } catch (err) {
      setError(formatApiError(err, "Could not remove teammate"));
    } finally {
      setDeletingId(null);
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

  const teammates = members.filter((m) => m.role !== "owner");

  return (
    <div className="space-y-8 max-w-2xl">
      <ConfirmDialog {...dialogProps} />
      {teammates.length > 0 || membersLoading ? (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-heading">Team members</h3>
            <p className="text-sm text-body-muted mt-1">
              Change roles for existing teammates, or remove access. Only the workspace
              owner can delete members. Admins have the same access as the owner; viewers
              can explore without saving changes.
            </p>
          </div>

          {membersLoading ? (
            <p className="text-sm text-body-muted">Loading team…</p>
          ) : (
            <ul className="divide-y divide-[var(--card-border)] rounded-xl border border-[var(--card-border)] bg-[var(--surface-subtle)]">
              {teammates.map((member) => {
                const draft = roleDraft[member.id] ?? (member.role as MemberRole);
                const dirty = isEditableRole(member.role) && draft !== member.role;
                const busy = savingId === member.id || deletingId === member.id;
                return (
                  <li
                    key={member.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-heading truncate">
                        {member.label}
                      </p>
                      <p className="text-xs text-body-muted truncate">{member.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <select
                        className="input-field text-sm min-w-[11rem]"
                        value={draft}
                        disabled={busy}
                        onChange={(e) =>
                          setRoleDraft((prev) => ({
                            ...prev,
                            [member.id]: e.target.value as MemberRole,
                          }))
                        }
                      >
                        {(Object.keys(ROLE_LABELS) as MemberRole[]).map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        size="sm"
                        variant={dirty ? "default" : "outline"}
                        disabled={!dirty || busy}
                        onClick={() => void handleRoleSave(member)}
                      >
                        {savingId === member.id ? "Saving…" : "Save"}
                      </Button>
                      {isOwner ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          className="text-[var(--error)] border-[var(--error)]/30 hover:bg-[var(--error)]/5"
                          onClick={() => void handleDelete(member)}
                        >
                          {deletingId === member.id ? "Removing…" : "Remove"}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      <form onSubmit={handleAdd} className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-heading">Invite teammate</h3>
          <p className="text-sm text-body-muted mt-1">
            Invite by email. They receive a private registration link (valid 7 days).
            Public registration is disabled — only invited users can create a CRM account.
          </p>
        </div>
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
            onChange={(e) => setRole(e.target.value as MemberRole)}
          >
            <option value="sales">Sales — own CRM records + queue</option>
            <option value="support">Support — contacts, tickets, inbox</option>
            <option value="finance">Finance — invoices & transactions</option>
            <option value="admin">Admin — full workspace access</option>
            <option value="viewer">Viewer — read-only demo</option>
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
    </div>
  );
}
