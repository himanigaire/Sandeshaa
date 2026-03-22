// src/api.ts
// Sandeshaa Android – API Layer
// Replaces: expo-secure-store token access → src/storage.ts
// Uses axios for robust HTTP with timeouts and retry logic

import axios, {AxiosInstance} from 'axios';
import {API_BASE_URL} from './config';
import {getToken} from './storage';

// ---- Axios client with timeout & interceptors ----
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15s timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach auth token automatically to every request
apiClient.interceptors.request.use(async config => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Retry logic for network errors
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config;
    if (
      !config._retry &&
      error.code === 'ECONNABORTED' &&
      config.method === 'get'
    ) {
      config._retry = true;
      return apiClient(config);
    }
    return Promise.reject(error);
  },
);

// ---- API Methods ----

export async function apiGet(path: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await apiClient.get(path, token ? {headers} : undefined);
  return res.data;
}

export async function apiPost(path: string, body: any, token?: string) {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await apiClient.post(path, body, token ? {headers} : undefined);
  return res.data;
}

export async function apiPut(path: string, body: any, token?: string) {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await apiClient.put(path, body, token ? {headers} : undefined);
  return res.data;
}

export async function apiDelete(path: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await apiClient.delete(path, token ? {headers} : undefined);
  return res.data;
}

export async function apiGetAuth(path: string, token: string) {
  const res = await apiClient.get(path, {
    headers: {Authorization: `Bearer ${token}`},
  });
  return res.data;
}

// ---- File Upload ----
export async function uploadFile(
  fileUri: string,
  fileName: string,
  toUsername: string,
  token: string,
) {
  const formData = new FormData();

  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: 'application/octet-stream',
  } as any);
  formData.append('to_username', toUsername);

  const res = await apiClient.post('/upload-file', formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000, // 60s for file uploads
  });

  return res.data;
}

// ---- File Download ----
export async function downloadFile(
  fileId: string,
  token: string,
): Promise<string> {
  const res = await apiClient.get(`/download-file/${fileId}`, {
    headers: {Authorization: `Bearer ${token}`},
    responseType: 'text',
    timeout: 60000,
  });

  return res.data;
}

export default apiClient;
