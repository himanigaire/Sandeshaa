import { API_BASE_URL } from "./config";

export async function apiGet(path: string) {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function apiPost(path: string, body: any) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function apiPut(path: string, body: any) {
  const SecureStore = require('expo-secure-store');
  const token = await SecureStore.getItemAsync('access_token');
  
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: { 
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
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
    headers: { Authorization: `Bearer ${token}` },
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
