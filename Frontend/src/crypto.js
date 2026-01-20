// src/crypto.js
import nacl from "tweetnacl";
import { encodeBase64, decodeBase64 } from "tweetnacl-util";

const KEY_STORAGE_KEY = "sandeshaa_identity_keys";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Generate a long-term identity key pair (public/secret).
 * We use NaCl box keys (Curve25519).
 */
export function generateIdentityKeyPair() {
  const keyPair = nacl.box.keyPair();
  return {
    publicKeyBase64: encodeBase64(keyPair.publicKey),
    privateKeyBase64: encodeBase64(keyPair.secretKey),
  };
}

export function saveIdentityKeysToStorage(keys) {
  localStorage.setItem(KEY_STORAGE_KEY, JSON.stringify(keys));
}

export function loadIdentityKeysFromStorage() {
  const raw = localStorage.getItem(KEY_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.publicKeyBase64 && parsed.privateKeyBase64) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get existing keys or create new ones if none found.
 * This runs only in the browser.
 */
export function getOrCreateIdentityKeys() {
  const existing = loadIdentityKeysFromStorage();
  if (existing) return existing;

  const keys = generateIdentityKeyPair();
  saveIdentityKeysToStorage(keys);
  return keys;
}

/**
 * Compute shared secret for a chat:
 * - otherPublicKeyBase64: other user's identity public key (base64)
 * - myPrivateKeyBase64: my identity private key (base64)
 */

export function computeSharedSecret(otherPublicKeyBase64, myPrivateKeyBase64) {
  try {
    // 1. Clean the strings
    const cleanOtherKey = otherPublicKeyBase64.trim();
    const cleanMyKey = myPrivateKeyBase64.trim();
    
    // 2. Decode base64
    const otherPublicKey = decodeBase64(cleanOtherKey);
    const myPrivateKey = decodeBase64(cleanMyKey);
    
    // 3. Validate key lengths
    if (otherPublicKey.length !== 32) {
      throw new Error(`Invalid public key length: ${otherPublicKey.length} (expected 32)`);
    }
    if (myPrivateKey.length !== 32) {
      throw new Error(`Invalid private key length: ${myPrivateKey.length} (expected 32)`);
    }
    
    // 4. Compute shared secret
    const shared = nacl.box.before(otherPublicKey, myPrivateKey);
    return shared;
  } catch (error) {
    // 5. Better error messages
    console.error("Error computing shared secret:", error);
    console.error("Other public key:", otherPublicKeyBase64);
    console.error("My private key (first 20 chars):", myPrivateKeyBase64.substring(0, 20) + "...");
    throw new Error(`Failed to compute shared secret: ${error.message}`);
  }
}

export function encryptMessage(plaintext, sharedSecret, myPublicKeyBase64) {
  const nonce = nacl.randomBytes(24);
  const messageBytes = encoder.encode(plaintext);
  const box = nacl.box.after(messageBytes, nonce, sharedSecret);

  // Use JSON format matching mobile app
  return JSON.stringify({
    v: 1,
    nonce: encodeBase64(nonce),
    box: encodeBase64(box),
    from_pub: myPublicKeyBase64
  });
}

/**
 * Decrypt a message using sharedSecret.
 * Handles both new JSON format and old base64 format.
 * Returns plaintext string.
 */
export function decryptMessage(ciphertextBase64, sharedSecret) {
  let nonce, box;
  
  // Try to parse as JSON (new format)
  try {
    const obj = JSON.parse(ciphertextBase64);
    if (obj && obj.v === 1) {
      nonce = decodeBase64(obj.nonce);
      box = decodeBase64(obj.box);
    } else {
      throw new Error('Not valid JSON format');
    }
  } catch (e) {
    // Fall back to old format (nonce + ciphertext concatenated)
    const full = decodeBase64(ciphertextBase64);
    nonce = full.slice(0, 24);
    box = full.slice(24);
  }

  const messageBytes = nacl.box.open.after(box, nonce, sharedSecret);
  if (!messageBytes) {
    throw new Error("Decryption failed (wrong key or corrupted ciphertext)");
  }

  return decoder.decode(messageBytes);
}

// Encrypt file - uses JSON format matching mobile app
export async function encryptFile(file, sharedSecret, myPublicKeyBase64) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Encrypt the file bytes
        const nonce = nacl.randomBytes(24);
        const encrypted = nacl.box.after(uint8Array, nonce, sharedSecret);
        
        // Use JSON format matching mobile app
        const payload = JSON.stringify({
          v: 1,
          nonce: encodeBase64(nonce),
          box: encodeBase64(encrypted),
          from_pub: myPublicKeyBase64
        });
        
        // Convert to blob
        const encryptedBlob = new Blob([payload], { type: 'application/octet-stream' });
        resolve(encryptedBlob);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Decrypt file - handles JSON format matching mobile app
export async function decryptFile(encryptedBlob, sharedSecret) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        
        // Parse JSON format
        const obj = JSON.parse(text);
        if (!obj || obj.v !== 1) {
          throw new Error('Unsupported file format');
        }
        
        const nonce = decodeBase64(obj.nonce);
        const ciphertext = decodeBase64(obj.box);
        
        // Decrypt using the pre-computed shared secret
        const decrypted = nacl.box.open.after(ciphertext, nonce, sharedSecret);
        
        if (!decrypted) {
          throw new Error('Decryption failed');
        }
        
        resolve(decrypted);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = reject;
    reader.readAsText(encryptedBlob);
  });
}