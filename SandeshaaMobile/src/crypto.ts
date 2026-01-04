// src/crypto.ts
import { getRandomBytes } from 'expo-random';
import * as SecureStore from 'expo-secure-store';
import nacl from 'tweetnacl';
import { decodeBase64, encodeBase64 } from 'tweetnacl-util';

// ---- Make tweetnacl work in Expo (fix: "no PRNG") ----
nacl.setPRNG((x, n) => {
  const b = getRandomBytes(n);
  for (let i = 0; i < n; i++) x[i] = b[i];
});

// ---- Keys stored in SecureStore ----
const ID_PUB_KEY = 'identity_public_key_b64';
const ID_SEC_KEY = 'identity_secret_key_b64';

export type IdentityKeypair = {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
};

// Create once, reuse later
export async function ensureIdentityKeypair(): Promise<IdentityKeypair> {
  const pub = await SecureStore.getItemAsync(ID_PUB_KEY);
  const sec = await SecureStore.getItemAsync(ID_SEC_KEY);

  if (pub && sec) {
    return {
      publicKey: decodeBase64(pub),
      secretKey: decodeBase64(sec),
    };
  }

  const kp = nacl.box.keyPair();

  await SecureStore.setItemAsync(ID_PUB_KEY, encodeBase64(kp.publicKey));
  await SecureStore.setItemAsync(ID_SEC_KEY, encodeBase64(kp.secretKey));

  console.log('🆕 Identity keypair generated');
  return kp;
}

export async function getIdentityPublicKeyB64(): Promise<string> {
  await ensureIdentityKeypair();
  const pub = await SecureStore.getItemAsync(ID_PUB_KEY);
  return pub || '';
}

export async function getIdentityKeypair(): Promise<IdentityKeypair> {
  return ensureIdentityKeypair();
}

// ---- E2EE helpers ----
// Format we store in DB (ciphertext string)
export type EncryptedPayloadV1 = {
  v: 1;
  nonce: string;     // base64
  box: string;       // base64
  from_pub: string;  // base64 (sender public key)
};

export async function encryptForRecipient(plaintext: string, recipientPubB64: string) {
  const { secretKey, publicKey } = await ensureIdentityKeypair();
  const recipientPub = decodeBase64(recipientPubB64);

  console.log('🔒 Encrypting message...');
  console.log('   My public key (from_pub):', encodeBase64(publicKey).substring(0, 20) + '...');
  console.log('   Recipient public key:', recipientPubB64.substring(0, 20) + '...');

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

export async function decryptFromSender(ciphertext: string) {
  const { secretKey, publicKey } = await ensureIdentityKeypair();

  console.log('🔐 Decrypting message...');
  console.log('   My public key:', encodeBase64(publicKey).substring(0, 20) + '...');

  const obj = JSON.parse(ciphertext) as EncryptedPayloadV1;

  if (!obj || obj.v !== 1) throw new Error('Unsupported ciphertext format');

  console.log('   Sender public key (from_pub):', obj.from_pub.substring(0, 20) + '...');

  const nonce = decodeBase64(obj.nonce);
  const boxed = decodeBase64(obj.box);
  const senderPub = decodeBase64(obj.from_pub);

  const opened = nacl.box.open(boxed, nonce, senderPub, secretKey);
  if (!opened) {
    console.error('❌ nacl.box.open returned null - decryption failed');
    console.error('   This usually means the message was encrypted for a different public key');
    throw new Error('Decryption failed');
  }

  console.log('✅ Decryption successful!');
  return new TextDecoder().decode(opened);
}

// ---- File Encryption/Decryption ----

export async function encryptFileForRecipient(
  fileData: Uint8Array,
  recipientPubB64: string
): Promise<string> {
  const { secretKey, publicKey } = await ensureIdentityKeypair();
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

export async function decryptFileFromSender(ciphertext: string): Promise<Uint8Array> {
  const { secretKey } = await ensureIdentityKeypair();

  const obj = JSON.parse(ciphertext) as EncryptedPayloadV1;

  if (!obj || obj.v !== 1) throw new Error('Unsupported ciphertext format');

  const nonce = decodeBase64(obj.nonce);
  const boxed = decodeBase64(obj.box);
  const senderPub = decodeBase64(obj.from_pub);

  const opened = nacl.box.open(boxed, nonce, senderPub, secretKey);
  if (!opened) throw new Error('Decryption failed');

  return opened;
}
