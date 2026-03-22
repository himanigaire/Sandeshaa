// src/crypto.ts
// Sandeshaa Android – E2EE Crypto Layer
// Replaces: expo-random → react-native-get-random-values
// Replaces: expo-secure-store → react-native-keychain

import 'react-native-get-random-values';
import nacl from 'tweetnacl';
import {decodeBase64, encodeBase64} from 'tweetnacl-util';
import * as Keychain from 'react-native-keychain';

// ---- Keys stored in Keychain ----
const ID_PUB_SERVICE = 'sandeshaa_identity_pub';
const ID_SEC_SERVICE = 'sandeshaa_identity_sec';

export type IdentityKeypair = {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
};

// ---- Keychain helpers ----
async function getKeychainItem(service: string): Promise<string | null> {
  try {
    const result = await Keychain.getGenericPassword({service});
    if (result && result.password) {
      return result.password;
    }
    return null;
  } catch {
    return null;
  }
}

async function setKeychainItem(
  service: string,
  value: string,
): Promise<void> {
  await Keychain.setGenericPassword(service, value, {service});
}

async function deleteKeychainItem(service: string): Promise<void> {
  await Keychain.resetGenericPassword({service});
}

// ---- Identity Keypair Management ----

export async function ensureIdentityKeypair(): Promise<IdentityKeypair> {
  const pub = await getKeychainItem(ID_PUB_SERVICE);
  const sec = await getKeychainItem(ID_SEC_SERVICE);

  if (pub && sec) {
    return {
      publicKey: decodeBase64(pub),
      secretKey: decodeBase64(sec),
    };
  }

  // Generate new keypair using tweetnacl
  // react-native-get-random-values polyfills crypto.getRandomValues
  // which tweetnacl uses automatically
  const kp = nacl.box.keyPair();

  await setKeychainItem(ID_PUB_SERVICE, encodeBase64(kp.publicKey));
  await setKeychainItem(ID_SEC_SERVICE, encodeBase64(kp.secretKey));

  console.log('🆕 Identity keypair generated');
  return kp;
}

export async function getIdentityPublicKeyB64(): Promise<string> {
  await ensureIdentityKeypair();
  const pub = await getKeychainItem(ID_PUB_SERVICE);
  return pub || '';
}

export async function getIdentityKeypair(): Promise<IdentityKeypair> {
  return ensureIdentityKeypair();
}

// ---- E2EE Types ----
export type EncryptedPayloadV1 = {
  v: 1;
  nonce: string;
  box: string;
  from_pub: string;
};

// ---- Encrypt / Decrypt Messages ----

export async function encryptForRecipient(
  plaintext: string,
  recipientPubB64: string,
): Promise<string> {
  const {secretKey, publicKey} = await ensureIdentityKeypair();
  const recipientPub = decodeBase64(recipientPubB64);

  console.log('🔒 Encrypting message...');

  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const msgBytes = new TextEncoder().encode(plaintext);
  const boxed = nacl.box(msgBytes, nonce, recipientPub, secretKey);

  const payload: EncryptedPayloadV1 = {
    v: 1,
    nonce: encodeBase64(nonce),
    box: encodeBase64(boxed),
    from_pub: encodeBase64(publicKey),
  };

  console.log('✅ Encryption complete');
  return JSON.stringify(payload);
}

export async function decryptFromSender(ciphertext: string): Promise<string> {
  const {secretKey, publicKey} = await ensureIdentityKeypair();

  console.log('🔐 Decrypting message...');

  let obj: EncryptedPayloadV1;
  try {
    obj = JSON.parse(ciphertext) as EncryptedPayloadV1;
    if (!obj || obj.v !== 1) {
      throw new Error('Unsupported ciphertext format');
    }
  } catch {
    throw new Error('Legacy message format - decryption not supported');
  }

  const nonce = decodeBase64(obj.nonce);
  const boxed = decodeBase64(obj.box);
  const senderPub = decodeBase64(obj.from_pub);

  const opened = nacl.box.open(boxed, nonce, senderPub, secretKey);
  if (!opened) {
    console.error('❌ nacl.box.open returned null - decryption failed');
    throw new Error('Decryption failed');
  }

  console.log('✅ Decryption successful!');
  return new TextDecoder().decode(opened);
}

// ---- File Encryption / Decryption ----

export async function encryptFileForRecipient(
  fileData: Uint8Array,
  recipientPubB64: string,
): Promise<string> {
  const {secretKey, publicKey} = await ensureIdentityKeypair();
  const recipientPub = decodeBase64(recipientPubB64);

  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const boxed = nacl.box(fileData, nonce, recipientPub, secretKey);

  const payload: EncryptedPayloadV1 = {
    v: 1,
    nonce: encodeBase64(nonce),
    box: encodeBase64(boxed),
    from_pub: encodeBase64(publicKey),
  };

  return JSON.stringify(payload);
}

export async function decryptFileFromSender(
  ciphertext: string,
): Promise<Uint8Array> {
  const {secretKey} = await ensureIdentityKeypair();

  const obj = JSON.parse(ciphertext) as EncryptedPayloadV1;
  if (!obj || obj.v !== 1) {
    throw new Error('Unsupported ciphertext format');
  }

  const nonce = decodeBase64(obj.nonce);
  const boxed = decodeBase64(obj.box);
  const senderPub = decodeBase64(obj.from_pub);

  const opened = nacl.box.open(boxed, nonce, senderPub, secretKey);
  if (!opened) {
    throw new Error('Decryption failed');
  }

  return opened;
}

// ---- Logout: clear keys ----
export async function clearIdentityKeys(): Promise<void> {
  await deleteKeychainItem(ID_PUB_SERVICE);
  await deleteKeychainItem(ID_SEC_SERVICE);
  console.log('🗑️ Identity keys cleared');
}
