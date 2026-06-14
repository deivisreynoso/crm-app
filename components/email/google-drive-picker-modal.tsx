"use client";

import { useMemo, useState } from "react";
import {
  ChevronRight,
  ExternalLink,
  Folder,
  HardDrive,
  Loader2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  useGoogleDriveFiles,
  useGoogleDriveStatus,
  useGoogleSharedDrives,
} from "@/hooks/useGoogleDrive";
import type { DriveFileItem } from "@/lib/google/drive";
import { formatApiError } from "@/lib/validation-errors";
import { formatDate } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (file: DriveFileItem) => void;
  maxSelections?: number;
  selectedCount?: number;
};

export function GoogleDrivePickerModal({
  open,
  onClose,
  onSelect,
  maxSelections = 5,
  selectedCount = 0,
}: Props) {
  const { data: status, isLoading: statusLoading } = useGoogleDriveStatus();
  const [browseSection, setBrowseSection] = useState<"shared" | "my">("shared");
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>(
    []
  );

  const isSharedSection = browseSection === "shared";
  const atSharedDriveList = isSharedSection && folderStack.length === 0;
  const activeDriveId = isSharedSection && folderStack.length > 0 ? folderStack[0].id : null;
  const currentFolderId =
    folderStack.length > 0 ? folderStack[folderStack.length - 1]!.id : null;
  const listFolderId =
    isSharedSection && folderStack.length === 1 ? null : currentFolderId;

  const {
    data: sharedDrivesData,
    isLoading: sharedDrivesLoading,
    error: sharedDrivesError,
  } = useGoogleSharedDrives({
    enabled: open && !!status?.connected && atSharedDriveList,
  });

  const {
    data,
    isLoading: filesLoading,
    error: filesError,
  } = useGoogleDriveFiles(listFolderId, {
    enabled: open && !!status?.connected && !atSharedDriveList,
    driveId: activeDriveId,
  });

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

  const atLimit = selectedCount >= maxSelections;
  const loadError = atSharedDriveList
    ? sharedDrivesError
      ? formatApiError(sharedDrivesError, "Could not load shared drives")
      : null
    : filesError
      ? formatApiError(filesError, "Could not load Drive files")
      : null;

  return (
    <Modal open={open} onClose={onClose} title="Attach from Google Drive" size="lg">
      {statusLoading ? (
        <p className="text-sm text-body-muted py-6 text-center">Loading Drive…</p>
      ) : !status?.connected ? (
        <div className="py-6 text-center space-y-3">
          <HardDrive className="h-8 w-8 mx-auto text-[var(--secondary)]" />
          <p className="text-sm text-body-muted">
            Connect workspace Google Drive in Settings → Integrations to attach files.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--card-border)] pb-3">
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

          <nav
            className="flex flex-wrap items-center gap-1 text-sm"
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

          {atLimit && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Maximum {maxSelections} attachments per email.
            </p>
          )}

          {loadError && (
            <p className="text-sm text-[var(--error)] bg-red-500/10 rounded-lg px-3 py-2">
              {loadError}
            </p>
          )}

          <div className="border border-[var(--card-border)] rounded-lg max-h-72 overflow-y-auto">
            {atSharedDriveList ? (
              sharedDrivesLoading ? (
                <div className="flex items-center justify-center gap-2 p-8 text-body-muted">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading shared drives…
                </div>
              ) : (sharedDrivesData?.drives ?? []).length === 0 ? (
                <p className="p-8 text-center text-body-muted text-sm">
                  No shared drives found. Switch to My Drive or ask your admin for access.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--card-border)]">
                  {(sharedDrivesData?.drives ?? []).map((drive) => (
                    <li key={drive.id}>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-[var(--sidebar-hover)]"
                        onClick={() =>
                          setFolderStack([{ id: drive.id, name: drive.name }])
                        }
                      >
                        <Users className="h-4 w-4 text-[var(--secondary)] shrink-0" />
                        <span className="font-medium text-heading truncate">{drive.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : filesLoading ? (
              <div className="flex items-center justify-center gap-2 p-8 text-body-muted">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading files…
              </div>
            ) : (data?.files ?? []).length === 0 ? (
              <p className="p-8 text-center text-body-muted text-sm">This folder is empty.</p>
            ) : (
              <ul className="divide-y divide-[var(--card-border)]">
                {(data?.files ?? []).map((file) => (
                  <li key={file.id} className="flex items-center gap-2 px-4 py-2.5">
                    {file.isFolder ? (
                      <button
                        type="button"
                        className="flex flex-1 items-center gap-2 text-left hover:text-[var(--primary)] min-w-0"
                        onClick={() =>
                          setFolderStack((prev) => [...prev, { id: file.id, name: file.name }])
                        }
                      >
                        <Folder className="h-4 w-4 text-[var(--secondary)] shrink-0" />
                        <span className="font-medium text-heading truncate">{file.name}</span>
                      </button>
                    ) : (
                      <>
                        <div className="flex flex-1 items-center gap-2 min-w-0">
                          <HardDrive className="h-4 w-4 text-body-muted shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-heading truncate">{file.name}</p>
                            {file.modifiedTime && (
                              <p className="text-xs text-body-muted">
                                {formatDate(file.modifiedTime)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-md hover:bg-[var(--sidebar-hover)] text-[var(--primary)]"
                              title="Open in Drive"
                              aria-label="Open in Drive"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={atLimit}
                            onClick={() => {
                              onSelect(file);
                              onClose();
                            }}
                          >
                            Attach
                          </Button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-xs text-body-muted">
            Google Docs and Sheets are exported as PDF/XLSX when attached. Unsupported types
            are inserted as Drive links in the email body.
          </p>
        </div>
      )}
    </Modal>
  );
}
