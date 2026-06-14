"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import {
  ChevronRight,
  ExternalLink,
  Folder,
  HardDrive,
  Link2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ContactSearchCombobox } from "@/components/forms/contact-search-combobox";
import {
  useGoogleDriveFiles,
  useGoogleDriveStatus,
  useLinkGoogleDriveFile,
} from "@/hooks/useGoogleDrive";
import type { DriveFileItem } from "@/lib/google/drive";
import { formatApiError } from "@/lib/validation-errors";
import { formatDate } from "@/lib/utils";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";

function formatFileSize(size?: string) {
  if (!size) return "";
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function GoogleDriveBrowser() {
  const { canManage } = useWorkspaceCapabilities();
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } =
    useGoogleDriveStatus();
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>(
    []
  );
  const currentFolderId = folderStack[folderStack.length - 1]?.id ?? null;

  const {
    data,
    isLoading: filesLoading,
    error: filesError,
    refetch: refetchFiles,
    isFetching,
  } = useGoogleDriveFiles(status?.connected ? currentFolderId : null);

  const linkFile = useLinkGoogleDriveFile();
  const [linkTarget, setLinkTarget] = useState<DriveFileItem | null>(null);
  const [linkContactId, setLinkContactId] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  const breadcrumbs = useMemo(
    () => [{ id: "root", name: "My Drive" }, ...folderStack],
    [folderStack]
  );

  if (statusLoading) {
    return <p className="text-sm text-body-muted p-6">Loading Google Drive…</p>;
  }

  if (!status?.configured) {
    return (
      <div className="p-8 text-center space-y-3">
        <HardDrive className="h-10 w-10 mx-auto text-[var(--secondary)]" />
        <p className="text-heading font-medium">Google OAuth not configured</p>
        <p className="text-sm text-body-muted max-w-md mx-auto">
          Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the server, enable the
          Google Drive API, then connect your workspace Drive account.
        </p>
      </div>
    );
  }

  if (!status.connected) {
    return (
      <div className="p-8 text-center space-y-4">
        <HardDrive className="h-10 w-10 mx-auto text-[var(--secondary)]" />
        <div className="space-y-2">
          <p className="text-heading font-medium">Connect workspace Google Drive</p>
          <p className="text-sm text-body-muted max-w-lg mx-auto">
            Link your business Google Drive so the team can browse files and attach
            them to contacts without leaving the CRM.
          </p>
        </div>
        {canManage ? (
          <Button
            type="button"
            onClick={() => {
              window.location.href = "/api/auth/google-drive";
            }}
          >
            Connect Google Drive
          </Button>
        ) : (
          <p className="text-sm text-body-muted">
            Ask a workspace admin to connect Google Drive in Settings → Integrations.
          </p>
        )}
      </div>
    );
  }

  const files = data?.files ?? [];
  const loadError = filesError
    ? formatApiError(filesError, "Could not load Drive files")
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <p className="text-sm text-body-muted">
            Connected as{" "}
            <span className="font-medium text-heading">{status.email ?? "Google account"}</span>
          </p>
          <nav
            className="flex flex-wrap items-center gap-1 mt-1 text-sm"
            aria-label="Drive folders"
          >
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <span key={crumb.id} className="flex items-center gap-1 min-w-0">
                  {index > 0 && (
                    <ChevronRight className="h-3.5 w-3.5 text-body-muted shrink-0" />
                  )}
                  {isLast ? (
                    <span className="font-medium text-heading truncate">{crumb.name}</span>
                  ) : (
                    <button
                      type="button"
                      className="text-[var(--secondary)] hover:text-[var(--primary)] truncate"
                      onClick={() => setFolderStack(folderStack.slice(0, index))}
                    >
                      {crumb.name}
                    </button>
                  )}
                </span>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isFetching}
            onClick={() => {
              void refetchFiles();
              void refetchStatus();
            }}
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {canManage && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={async () => {
                await axios.delete("/api/integrations/google-drive/disconnect");
                void refetchStatus();
              }}
            >
              Disconnect
            </Button>
          )}
        </div>
      </div>

      {loadError && (
        <p className="mx-4 text-sm text-[var(--error)] bg-red-500/10 border border-red-200 rounded-lg px-3 py-2">
          {loadError}
        </p>
      )}

      <div className="border-t border-[var(--card-border)]">
        {filesLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-body-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading files…
          </div>
        ) : files.length === 0 ? (
          <p className="p-10 text-center text-body-muted text-sm">This folder is empty.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-subtle)] border-b border-[var(--card-border)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-heading">Name</th>
                <th className="text-left px-4 py-3 font-medium text-heading hidden sm:table-cell">
                  Modified
                </th>
                <th className="text-left px-4 py-3 font-medium text-heading hidden md:table-cell">
                  Size
                </th>
                <th className="text-right px-4 py-3 font-medium text-heading w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-[var(--sidebar-hover)]">
                  <td className="px-4 py-3">
                    {file.isFolder ? (
                      <button
                        type="button"
                        className="flex items-center gap-2 text-left font-medium text-heading hover:text-[var(--primary)]"
                        onClick={() =>
                          setFolderStack((prev) => [...prev, { id: file.id, name: file.name }])
                        }
                      >
                        <Folder className="h-4 w-4 text-[var(--secondary)] shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        {file.iconLink ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={file.iconLink} alt="" className="h-4 w-4 shrink-0" />
                        ) : (
                          <HardDrive className="h-4 w-4 text-body-muted shrink-0" />
                        )}
                        <span className="truncate font-medium text-heading">{file.name}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-body-muted hidden sm:table-cell">
                    {file.modifiedTime ? formatDate(file.modifiedTime) : "—"}
                  </td>
                  <td className="px-4 py-3 text-body-muted hidden md:table-cell">
                    {file.isFolder ? "—" : formatFileSize(file.size) || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {!file.isFolder && (
                        <button
                          type="button"
                          className="p-2 rounded-md hover:bg-[var(--sidebar-hover)] text-[var(--primary)]"
                          title="Link to contact"
                          aria-label="Link to contact"
                          onClick={() => {
                            setLinkTarget(file);
                            setLinkContactId("");
                            setLinkError(null);
                          }}
                        >
                          <Link2 className="h-4 w-4" />
                        </button>
                      )}
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-md hover:bg-[var(--sidebar-hover)] text-[var(--primary)]"
                          title="Open in Google Drive"
                          aria-label="Open in Google Drive"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={!!linkTarget}
        onClose={() => setLinkTarget(null)}
        title="Link Drive file to contact"
      >
        {linkTarget && (
          <div className="space-y-4">
            <p className="text-sm text-body-muted">
              Attach <span className="font-medium text-heading">{linkTarget.name}</span> as a
              CRM attachment linked to this Drive file.
            </p>
            <ContactSearchCombobox
              value={linkContactId}
              onChange={setLinkContactId}
              required
            />
            {linkError && (
              <p className="text-sm text-[var(--error)]">{linkError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setLinkTarget(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!linkContactId || linkFile.isPending}
                onClick={async () => {
                  setLinkError(null);
                  try {
                    await linkFile.mutateAsync({
                      file_id: linkTarget.id,
                      contact_id: linkContactId,
                    });
                    setLinkTarget(null);
                  } catch (err) {
                    setLinkError(formatApiError(err, "Could not link file"));
                  }
                }}
              >
                {linkFile.isPending ? "Linking…" : "Link file"}
              </Button>
            </div>
            <p className="text-xs text-body-muted">
              Linked files stay in Google Drive. View them from{" "}
              <Link href="/attachments" className="text-[var(--secondary)] hover:underline">
                Attachments
              </Link>
              .
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
