import { API_BASE_URL } from "./config";
import * as SecureStore from 'expo-secure-store';

// Helper to get stored token
async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync('access_token');
  } catch (e) {
    console.warn('Failed to get token from SecureStore:', e);
    return null;
  }
}

// Helper to build auth headers
function buildAuthHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiGet(path: string, token?: string) {
  const finalToken = token || await getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: buildAuthHeaders(finalToken || undefined),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function apiPost(path: string, body: any, token?: string) {
  const finalToken = token || await getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: buildAuthHeaders(finalToken || undefined),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function apiPut(path: string, body: any, token?: string) {
  const finalToken = token || await getToken();
  
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: buildAuthHeaders(finalToken || undefined),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PUT ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function apiGetAuth(path: string, token: string) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: buildAuthHeaders(token),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET(AUTH) ${path} failed: ${res.status} ${text}`);
  }

  return res.json();
}

// File upload
export async function uploadFile(
  fileUri: string,
  fileName: string,
  toUsername: string,
  token: string
) {
  const formData = new FormData();
  
  // @ts-ignore - FormData in React Native accepts uri, name, type
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: 'application/octet-stream',
  });
  formData.append('to_username', toUsername);

  const res = await fetch(`${API_BASE_URL}/upload-file`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // Don't set Content-Type - let fetch set it automatically with boundary
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed: ${res.status} ${text}`);
  }

  return res.json();
}

// File download - returns the encrypted content as text
export async function downloadFile(fileId: string, token: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/download-file/${fileId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Download failed: ${res.status} ${text}`);
  }

  // Return as text since the encrypted content is stored as text
  return res.text();
}
