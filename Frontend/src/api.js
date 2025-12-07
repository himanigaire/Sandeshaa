// src/api.js
import axios from "axios";

// Adjust if your backend URL changes
const apiClient = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

export async function registerUser({ username, password, identityPublicKey, prekeyPublic }) {
  const res = await apiClient.post("/register", {
    username,
    password,
    identity_public_key: identityPublicKey,
    prekey_public: prekeyPublic,
  });
  return res.data;
}

export async function loginUser({ username, password }) {
  const res = await apiClient.post("/login", {
    username,
    password,
  });
  return res.data;
}

export async function getMe(token) {
  const res = await apiClient.get("/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
}

export async function getUserKeys(username) {
  const res = await apiClient.get(`/users/${username}/keys`);
  return res.data;
}

// File upload/download functions
export const filesAPI = {
  uploadFile: async (file, toUsername, token) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('to_username', toUsername);
    
    const response = await apiClient.post('/upload-file', formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  downloadFile: async (fileId, token) => {
    const response = await apiClient.get(`/download-file/${fileId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      responseType: 'blob',
    });
    return response.data;
  },
};

export default apiClient;