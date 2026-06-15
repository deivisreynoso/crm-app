"use client";

import { useMemo, useRef, useState } from "react";
import axios from "axios";
import Link from "next/link";
import {
  ChevronRight,
  ExternalLink,
  Folder,
  FolderPlus,
  HardDrive,
  Link2,
  Loader2,
  RefreshCw,
  Upload,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ContactSearchCombobox } from "@/components/forms/contact-search-combobox";
import {
  useCreateGoogleDriveFolder,
  useGoogleDriveFiles,
  useGoogleDriveStatus,
  useGoogleSharedDrives,
  useLinkGoogleDriveFile,
  useUploadGoogleDriveFile,
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
  const { canWrite, canManage } = useWorkspaceCapabilities();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } =
    useGoogleDriveStatus();
  const [browseSection, setBrowseSection] = useState<"shared" | "my">("shared");
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>(
    []
  );

  const isSharedSection = browseSection === "shared";
  const atSharedDriveList = isSharedSection && folderStack.length === 0;
  const activeDriveId = isSharedSection && folderStack.length > 0 ? folderStack[0].id : null;
  const currentFolderId =
    folderStack.length > 0
      ? folderStack[folderStack.length - 1]!.id
      : null;
  const listFolderId =
    isSharedSection && folderStack.length === 1 ? null : currentFolderId;

  const {
    data: sharedDrivesData,
    isLoading: sharedDrivesLoading,
    error: sharedDrivesError,
    refetch: refetchSharedDrives,
    isFetching: sharedDrivesFetching,
  } = useGoogleSharedDrives({
    enabled: !!status?.connected && atSharedDriveList,
  });

  const {
    data,
    isLoading: filesLoading,
    error: filesError,
    refetch: refetchFiles,
    isFetching: filesFetching,
  } = useGoogleDriveFiles(listFolderId, {
    enabled: !!status?.connected && !atSharedDriveList,
    driveId: activeDriveId,
  });

  const linkFile = useLinkGoogleDriveFile();
  const createFolder = useCreateGoogleDriveFolder();
  const uploadFile = useUploadGoogleDriveFile();
  const [linkTarget, setLinkTarget] = useState<DriveFileItem | null>(null);
  const [linkContactId, setLinkContactId] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderError, setFolderError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const breadcrumbs = useMemo(() => {
    const root = isSharedSection
      ? { id: "shared-root", name: "Shared drives" }
      : { id: "my-root", name: "My Drive" };
    return [root, ...folderStack];
  }, [folderStack, isSharedSection]);

  const switchSection = (section: "shared" | "my") => {
    setBrowseSection(section);
    setFolderStack([]);
  };

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
        {canWrite ? (
          <>
            <Button
              type="button"
              onClick={() => {
                window.location.href = "/api/auth/google-drive";
              }}
            >
              Connect Google Drive
            </Button>
            {status.redirect_uri && (
              <p className="text-xs text-body-muted max-w-lg mx-auto font-mono break-all">
                Register this redirect URI in Google Cloud Console:
                <br />
                {status.redirect_uri}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-body-muted">
            Ask a workspace admin to connect Google Drive in Settings → Integrations.
          </p>
        )}
      </div>
    );
  }

  const files = data?.files ?? [];
  const sharedDrives = sharedDrivesData?.drives ?? [];
  const isFetching = atSharedDriveList ? sharedDrivesFetching : filesFetching;
  const loadError = atSharedDriveList
    ? sharedDrivesError
      ? formatApiError(sharedDrivesError, "Could not load shared drives")
      : null
    : filesError
      ? formatApiError(filesError, "Could not load Drive files")
      : null;

  const uploadTarget = {
    folder_id: listFolderId,
    drive_id: activeDriveId,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 px-4 pt-4 border-b border-[var(--card-border)] pb-3">
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            isSharedSection
              ? "bg-[var(--primary)] text-white"
              : "text-body-muted hover:bg-[var(--sidebar-hover)]"
          }`}
          onClick={() => switchSection("shared")}
        >
          <Users className="h-4 w-4" />
          Shared drives
        </button>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            !isSharedSection
              ? "bg-[var(--primary)] text-white"
              : "text-body-muted hover:bg-[var(--sidebar-hover)]"
          }`}
          onClick={() => switchSection("my")}
        >
          <HardDrive className="h-4 w-4" />
          My Drive
        </button>
      </div>
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
          {canWrite && !atSharedDriveList && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setNewFolderName("");
                  setFolderError(null);
                  setFolderModalOpen(true);
                }}
              >
                <FolderPlus className="h-4 w-4 mr-1.5" />
                New folder
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={uploadFile.isPending}
                onClick={() => uploadInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-1.5" />
                {uploadFile.isPending ? "Uploading…" : "Upload"}
              </Button>
              <input
                ref={uploadInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={async (e) => {
                  const selected = Array.from(e.target.files ?? []);
                  if (!selected.length) return;
                  setUploadError(null);
                  try {
                    for (const file of selected) {
                      await uploadFile.mutateAsync({
                        file,
                        ...uploadTarget,
                      });
                    }
                    void refetchFiles();
                  } catch (err) {
                    setUploadError(formatApiError(err, "Upload failed"));
                  } finally {
                    e.target.value = "";
                  }
                }}
              />
            </>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isFetching}
            onClick={() => {
              if (atSharedDriveList) {
                void refetchSharedDrives();
              } else {
                void refetchFiles();
              }
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
      {uploadError && (
        <p className="mx-4 text-sm text-[var(--error)] bg-red-500/10 border border-red-200 rounded-lg px-3 py-2">
          {uploadError}
        </p>
      )}
      {canWrite && !atSharedDriveList && (
        <p className="mx-4 text-xs text-body-muted">
          Upload and create folders in the current directory.
          {isSharedSection
            ? " Files are saved to this shared drive, not your personal My Drive."
            : " Switch to Shared drives to save files to a team folder instead."}
        </p>
      )}

      <div className="border-t border-[var(--card-border)]">
        {atSharedDriveList ? (
          sharedDrivesLoading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-body-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading shared drives…
            </div>
          ) : sharedDrives.length === 0 ? (
            <p className="p-10 text-center text-body-muted text-sm">
              No shared drives found. Ask your Google Workspace admin to add you to a
              shared drive, or switch to My Drive.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-subtle)] border-b border-[var(--card-border)]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-heading">Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {sharedDrives.map((drive) => (
                  <tr key={drive.id} className="hover:bg-[var(--sidebar-hover)]">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="flex items-center gap-2 text-left font-medium text-heading hover:text-[var(--primary)]"
                        onClick={() =>
                          setFolderStack([{ id: drive.id, name: drive.name }])
                        }
                      >
                        <Users className="h-4 w-4 text-[var(--secondary)] shrink-0" />
                        <span className="truncate">{drive.name}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : filesLoading ? (
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

      <Modal
        open={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        title="New folder"
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const name = newFolderName.trim();
            if (!name) return;
            setFolderError(null);
            try {
              await createFolder.mutateAsync({
                name,
                ...uploadTarget,
              });
              setFolderModalOpen(false);
              setNewFolderName("");
              void refetchFiles();
            } catch (err) {
              setFolderError(formatApiError(err, "Could not create folder"));
            }
          }}
        >
          <div>
            <label className="text-sm font-medium text-heading block mb-1.5">
              Folder name
            </label>
            <input
              className="input-field w-full"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. Client assets"
              autoFocus
            />
          </div>
          {folderError && (
            <p className="text-sm text-[var(--error)]">{folderError}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFolderModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!newFolderName.trim() || createFolder.isPending}>
              {createFolder.isPending ? "Creating…" : "Create folder"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
