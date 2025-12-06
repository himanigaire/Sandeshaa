// src/api.js
import axios from "axios";

// Adjust if your backend URL changes
const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

export async function registerUser({ username, password, identityPublicKey, prekeyPublic }) {
  const res = await api.post("/register", {
    username,
    password,
    identity_public_key: identityPublicKey,
    prekey_public: prekeyPublic,
  });
  return res.data; // { id, username }
}

export async function loginUser({ username, password }) {
  const res = await api.post("/login", {
    username,
    password,
  });
  // { access_token, token_type }
  return res.data;
}

export async function getMe(token) {
  const res = await api.get("/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data; // { id, username }
}

export async function getUserKeys(username) {
  const res = await api.get(`/users/${username}/keys`);
  // { username, identity_public_key, prekey_public }
  return res.data;
}

// File upload/download functions
export const filesAPI = {
  // Upload encrypted file
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

  // Download encrypted file
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
