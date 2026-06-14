import { createServerSideClient } from "@/lib/supabase";
import {
  getGoogleDriveRedirectUri,
  getGoogleOAuthClientId,
  getGoogleOAuthClientSecret,
  isGoogleDriveConfigured,
} from "@/lib/google/oauth-config";

export { getGoogleDriveRedirectUri, isGoogleDriveConfigured };

export const DRIVE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
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

export async function listGoogleDriveFiles(
  workspaceOwnerId: string,
  folderId?: string | null
): Promise<{ files: DriveFileItem[]; parentId: string }> {
  const accessToken = await getGoogleDriveAccessToken(workspaceOwnerId);
  if (!accessToken) {
    throw new Error("Google Drive is not connected for this workspace");
  }

  const connection = await getGoogleDriveConnection(workspaceOwnerId);
  const parentId = folderId?.trim() || connection.root_folder_id || "root";

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
