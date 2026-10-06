import { webcrypto } from "node:crypto";

const cryptoApi = globalThis.crypto ?? webcrypto;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function bytesToBase64Url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

export function base64UrlToBytes(value) {
  return new Uint8Array(Buffer.from(value, "base64url"));
}

export async function createPkcePair() {
  const verifier = bytesToBase64Url(cryptoApi.getRandomValues(new Uint8Array(32)));
  const digest = await cryptoApi.subtle.digest("SHA-256", encoder.encode(verifier));
  return { verifier, challenge: bytesToBase64Url(new Uint8Array(digest)) };
}

async function encryptionKey(secret) {
  if (!secret || secret.length < 24) throw new Error("encryption_secret_too_short");
  const digest = await cryptoApi.subtle.digest("SHA-256", encoder.encode(secret));
  return cryptoApi.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptCredential(secret, credential) {
  const iv = cryptoApi.getRandomValues(new Uint8Array(12));
  const encrypted = await cryptoApi.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(secret),
    encoder.encode(JSON.stringify(credential)),
  );
  return `v1.${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(encrypted))}`;
}

export async function decryptCredential(secret, value) {
  const [version, ivValue, encryptedValue] = String(value).split(".");
  if (version !== "v1" || !ivValue || !encryptedValue) throw new Error("invalid_ciphertext");
  const decrypted = await cryptoApi.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlToBytes(ivValue) },
    await encryptionKey(secret),
    base64UrlToBytes(encryptedValue),
  );
  return JSON.parse(decoder.decode(decrypted));
}

