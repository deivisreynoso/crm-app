"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form-label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CurrencySettings } from "@/components/settings/currency-settings";
import { NotificationPreferencesSettings } from "@/components/settings/notification-preferences-settings";
import { formatApiError } from "@/lib/validation-errors";
import axios from "axios";

export function AccountSettings() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [fullName, setFullName] = useState(session?.user?.name ?? "");
  const [email, setEmail] = useState(session?.user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setProfileMsg(null);
    try {
      await axios.patch("/api/account/profile", {
        full_name: fullName.trim(),
        email: email.trim(),
      });
      await update({ name: fullName.trim(), email: email.trim() });
      setProfileMsg("Profile updated.");
    } catch (err) {
      setError(formatApiError(err, "Could not update profile"));
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    try {
      await axios.post("/api/account/password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg("Password updated.");
    } catch (err) {
      setError(formatApiError(err, "Could not change password"));
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await axios.delete("/api/account");
      await signOut({ redirect: false });
      router.push("/login");
    } catch (err) {
      setError(formatApiError(err, "Could not delete account"));
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <p className="text-sm text-[var(--error)] bg-red-500/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <form onSubmit={saveProfile} className="space-y-4">
        <h3 className="text-sm font-semibold text-heading">Profile</h3>
        <div>
          <FormLabel>Full name</FormLabel>
          <input
            className="input-field w-full max-w-md"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div>
          <FormLabel>Email</FormLabel>
          <input
            type="email"
            className="input-field w-full max-w-md"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="text-xs text-body-muted mt-1">
            Changing email may require confirmation depending on your auth settings.
          </p>
        </div>
        {profileMsg && <p className="text-sm text-emerald-700">{profileMsg}</p>}
        <Button type="submit" size="sm">
          Save profile
        </Button>
      </form>

      <form
        onSubmit={changePassword}
        className="space-y-4 border-t border-[var(--card-border)] pt-6"
      >
        <h3 className="text-sm font-semibold text-heading">Password</h3>
        <div>
          <FormLabel>Current password</FormLabel>
          <input
            type="password"
            className="input-field w-full max-w-md"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div>
          <FormLabel>New password</FormLabel>
          <input
            type="password"
            className="input-field w-full max-w-md"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div>
          <FormLabel>Confirm new password</FormLabel>
          <input
            type="password"
            className="input-field w-full max-w-md"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        {passwordMsg && <p className="text-sm text-emerald-700">{passwordMsg}</p>}
        <Button type="submit" size="sm" variant="outline">
          Update password
        </Button>
      </form>

      <div className="border-t border-[var(--card-border)] pt-6 space-y-3">
        <h3 className="text-sm font-semibold text-heading">Two-step authentication</h3>
        <p className="text-sm text-body-muted">
          Add an extra layer of security when signing in. Full setup will be available
          in a future update.
        </p>
        <Button type="button" size="sm" variant="outline" disabled>
          Set up two-step auth (coming soon)
        </Button>
      </div>

      <div className="border-t border-[var(--card-border)] pt-6 space-y-4">
        <h3 className="text-sm font-semibold text-heading">Notifications</h3>
        <NotificationPreferencesSettings />
      </div>

      <div className="border-t border-[var(--card-border)] pt-6 space-y-4">
        <h3 className="text-sm font-semibold text-heading">Currency</h3>
        <CurrencySettings />
      </div>

      <div className="border-t border-[var(--card-border)] pt-6 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--error)]">Delete account</h3>
        <p className="text-sm text-body-muted">
          Permanently delete your account and CRM data. This cannot be undone.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-[var(--error)] text-[var(--error)] hover:bg-red-500/10"
          onClick={() => setDeleteOpen(true)}
        >
          Delete account
        </Button>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete your account?"
        description="All contacts, deals, tickets, and settings for this user will be removed."
        confirmLabel="Delete permanently"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
