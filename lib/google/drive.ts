import { createServerSideClient } from "@/lib/supabase";
import {
  getGoogleDriveRedirectUri,
  getGoogleOAuthClientId,
  getGoogleOAuthClientSecret,
  isGoogleDriveConfigured,
} from "@/lib/google/oauth-config";

export { getGoogleDriveRedirectUri, isGoogleDriveConfigured };

export const DRIVE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/userinfo.email",
] as const;

type TokenRow = {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  email_address: string | null;
  root_folder_id: string | null;
  connected_by: string | null;
};

export type DriveFileItem = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
  size?: string;
  isFolder: boolean;
};

export type DriveSharedDrive = {
  id: string;
  name: string;
};

export async function getGoogleDriveAccessToken(
  workspaceOwnerId: string
): Promise<string | null> {
  if (!isGoogleDriveConfigured()) return null;

  const supabase = createServerSideClient();
  const { data: row, error } = await supabase
    .from("google_drive_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (error || !row?.access_token) return null;

  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  const stillValid = expiresAt > Date.now() + 60_000;
  if (stillValid) return row.access_token;

  if (!row.refresh_token) return null;

  const clientId = getGoogleOAuthClientId();
  const clientSecret = getGoogleOAuthClientSecret();
  if (!clientId || !clientSecret) return null;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: row.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenRes.ok) {
    console.error("Drive token refresh failed:", await tokenRes.text());
    return null;
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  const newExpires = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabase
    .from("google_drive_tokens")
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? row.refresh_token,
      expires_at: newExpires,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", workspaceOwnerId);

  return tokens.access_token;
}

export async function getGoogleDriveConnection(
  workspaceOwnerId: string
): Promise<{
  connected: boolean;
  email: string | null;
  root_folder_id: string | null;
  connected_by: string | null;
}> {
  if (!isGoogleDriveConfigured()) {
    return {
      connected: false,
      email: null,
      root_folder_id: null,
      connected_by: null,
    };
  }

  const supabase = createServerSideClient();
  const { data, error } = await supabase
    .from("google_drive_tokens")
    .select("user_id, email_address, root_folder_id, connected_by")
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (error) {
    console.error("getGoogleDriveConnection:", error.message);
  }

  return {
    connected: !!data?.user_id,
    email: data?.email_address?.trim() || null,
    root_folder_id: data?.root_folder_id?.trim() || null,
    connected_by: data?.connected_by ?? null,
  };
}

function folderMimeType(mimeType: string) {
  return mimeType === "application/vnd.google-apps.folder";
}

export async function listGoogleSharedDrives(
  workspaceOwnerId: string
): Promise<DriveSharedDrive[]> {
  const accessToken = await getGoogleDriveAccessToken(workspaceOwnerId);
  if (!accessToken) {
    throw new Error("Google Drive is not connected for this workspace");
  }

  const params = new URLSearchParams({
    pageSize: "100",
    fields: "drives(id,name),nextPageToken",
  });

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/drives?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Drive list shared drives failed:", text);
    throw new Error("Could not load shared drives");
  }

  const body = (await res.json()) as {
    drives?: Array<{ id: string; name: string }>;
  };

  return (body.drives ?? []).map((drive) => ({
    id: drive.id,
    name: drive.name,
  }));
}

export async function listGoogleDriveFiles(
  workspaceOwnerId: string,
  folderId?: string | null,
  driveId?: string | null
): Promise<{ files: DriveFileItem[]; parentId: string }> {
  const accessToken = await getGoogleDriveAccessToken(workspaceOwnerId);
  if (!accessToken) {
    throw new Error("Google Drive is not connected for this workspace");
  }

  const connection = await getGoogleDriveConnection(workspaceOwnerId);
  const sharedDriveId = driveId?.trim() || null;
  const parentId =
    folderId?.trim() ||
    sharedDriveId ||
    connection.root_folder_id ||
    "root";

  const q = `'${parentId.replace(/'/g, "\\'")}' in parents and trashed=false`;
  const params = new URLSearchParams({
    q,
    pageSize: "100",
    orderBy: "folder,name",
    fields:
      "files(id,name,mimeType,modifiedTime,webViewLink,iconLink,size),nextPageToken",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });

  if (sharedDriveId) {
    params.set("corpora", "drive");
    params.set("driveId", sharedDriveId);
  }

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Drive list files failed:", text);
    throw new Error("Could not load Google Drive files");
  }

  const body = (await res.json()) as {
    files?: Array<{
      id: string;
      name: string;
      mimeType: string;
      modifiedTime?: string;
      webViewLink?: string;
      iconLink?: string;
      size?: string;
    }>;
  };

  const files = (body.files ?? []).map((file) => ({
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    modifiedTime: file.modifiedTime,
    webViewLink: file.webViewLink,
    iconLink: file.iconLink,
    size: file.size,
    isFolder: folderMimeType(file.mimeType),
  }));

  return { files, parentId };
}

export async function getGoogleDriveFileMeta(
  workspaceOwnerId: string,
  fileId: string
): Promise<DriveFileItem | null> {
  const accessToken = await getGoogleDriveAccessToken(workspaceOwnerId);
  if (!accessToken) return null;

  const params = new URLSearchParams({
    fields: "id,name,mimeType,modifiedTime,webViewLink,iconLink,size",
    supportsAllDrives: "true",
  });

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) return null;

  const file = (await res.json()) as {
    id: string;
    name: string;
    mimeType: string;
    modifiedTime?: string;
    webViewLink?: string;
    iconLink?: string;
    size?: string;
  };

  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    modifiedTime: file.modifiedTime,
    webViewLink: file.webViewLink,
    iconLink: file.iconLink,
    size: file.size,
    isFolder: folderMimeType(file.mimeType),
  };
}

async function resolveParentFolderId(
  workspaceOwnerId: string,
  folderId?: string | null,
  driveId?: string | null
): Promise<string> {
  if (folderId?.trim()) return folderId.trim();
  if (driveId?.trim()) return driveId.trim();
  const connection = await getGoogleDriveConnection(workspaceOwnerId);
  return connection.root_folder_id || "root";
}

function mapDriveFile(file: {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
  size?: string;
}): DriveFileItem {
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    modifiedTime: file.modifiedTime,
    webViewLink: file.webViewLink,
    iconLink: file.iconLink,
    size: file.size,
    isFolder: folderMimeType(file.mimeType),
  };
}

export async function createGoogleDriveFolder(
  workspaceOwnerId: string,
  name: string,
  folderId?: string | null,
  driveId?: string | null
): Promise<DriveFileItem> {
  const accessToken = await getGoogleDriveAccessToken(workspaceOwnerId);
  if (!accessToken) {
    throw new Error("Google Drive is not connected for this workspace");
  }

  const parentId = await resolveParentFolderId(
    workspaceOwnerId,
    folderId,
    driveId
  );
  const params = new URLSearchParams({
    fields: "id,name,mimeType,modifiedTime,webViewLink,iconLink,size",
    supportsAllDrives: "true",
  });

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name.trim(),
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Drive create folder failed:", text);
    throw new Error("Could not create folder in Google Drive");
  }

  const file = (await res.json()) as {
    id: string;
    name: string;
    mimeType: string;
    modifiedTime?: string;
    webViewLink?: string;
    iconLink?: string;
    size?: string;
  };

  return mapDriveFile(file);
}

export async function uploadGoogleDriveFile(
  workspaceOwnerId: string,
  input: {
    name: string;
    mimeType: string;
    buffer: Buffer;
    folderId?: string | null;
    driveId?: string | null;
  }
): Promise<DriveFileItem> {
  const accessToken = await getGoogleDriveAccessToken(workspaceOwnerId);
  if (!accessToken) {
    throw new Error("Google Drive is not connected for this workspace");
  }

  const parentId = await resolveParentFolderId(
    workspaceOwnerId,
    input.folderId,
    input.driveId
  );
  const metadata = JSON.stringify({
    name: input.name.trim(),
    parents: [parentId],
  });
  const boundary = `crm_drive_${Date.now()}`;
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`),
    Buffer.from(metadata),
    Buffer.from(`\r\n--${boundary}\r\nContent-Type: ${input.mimeType || "application/octet-stream"}\r\n\r\n`),
    input.buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const params = new URLSearchParams({
    uploadType: "multipart",
    fields: "id,name,mimeType,modifiedTime,webViewLink,iconLink,size",
    supportsAllDrives: "true",
  });

  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files?${params.toString()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Drive upload failed:", text);
    throw new Error("Could not upload file to Google Drive");
  }

  const file = (await res.json()) as {
    id: string;
    name: string;
    mimeType: string;
    modifiedTime?: string;
    webViewLink?: string;
    iconLink?: string;
    size?: string;
  };

  return mapDriveFile(file);
}

const GOOGLE_NATIVE_EXPORT: Record<
  string,
  { exportMime: string; filenameSuffix: string }
> = {
  "application/vnd.google-apps.document": {
    exportMime: "application/pdf",
    filenameSuffix: ".pdf",
  },
  "application/vnd.google-apps.spreadsheet": {
    exportMime:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filenameSuffix: ".xlsx",
  },
  "application/vnd.google-apps.presentation": {
    exportMime: "application/pdf",
    filenameSuffix: ".pdf",
  },
  "application/vnd.google-apps.drawing": {
    exportMime: "image/png",
    filenameSuffix: ".png",
  },
};

const MAX_EMAIL_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export type DriveAttachmentContent = {
  filename: string;
  mimeType: string;
  buffer: Buffer;
  webViewLink?: string;
};

export async function downloadGoogleDriveFileForAttachment(
  workspaceOwnerId: string,
  fileId: string
): Promise<DriveAttachmentContent | null> {
  const meta = await getGoogleDriveFileMeta(workspaceOwnerId, fileId);
  if (!meta || meta.isFolder) return null;

  const accessToken = await getGoogleDriveAccessToken(workspaceOwnerId);
  if (!accessToken) return null;

  const exportSpec = GOOGLE_NATIVE_EXPORT[meta.mimeType];
  let url: string;
  let filename = meta.name;
  let mimeType: string;

  if (exportSpec) {
    const params = new URLSearchParams({
      mimeType: exportSpec.exportMime,
    });
    url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?${params.toString()}`;
    mimeType = exportSpec.exportMime;
    if (!filename.toLowerCase().endsWith(exportSpec.filenameSuffix)) {
      const base = filename.replace(/\.[^.]+$/, "");
      filename = `${base}${exportSpec.filenameSuffix}`;
    }
  } else if (meta.mimeType.startsWith("application/vnd.google-apps.")) {
    return null;
  } else {
    const params = new URLSearchParams({
      alt: "media",
      supportsAllDrives: "true",
    });
    url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?${params.toString()}`;
    mimeType = meta.mimeType || "application/octet-stream";
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    console.error("Drive download failed:", await res.text());
    return null;
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_EMAIL_ATTACHMENT_BYTES) {
    throw new Error(
      `File is too large to attach (${Math.round(buffer.length / 1024 / 1024)} MB). Use the Drive link instead.`
    );
  }

  return {
    filename,
    mimeType,
    buffer,
    webViewLink: meta.webViewLink,
  };
}
