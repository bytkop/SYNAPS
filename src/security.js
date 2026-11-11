const ITERATIONS = 310_000;
const encoder = new TextEncoder();
const bytesToHex = bytes => [...bytes].map(value => value.toString(16).padStart(2, "0")).join("");
const hexToBytes = value => Uint8Array.from(String(value).match(/.{1,2}/g) || [], pair => Number.parseInt(pair, 16));

function cryptoApi() {
  const api = globalThis.crypto;
  if (!api?.subtle || !api?.getRandomValues) throw new Error("Secure WebCrypto is unavailable; password lock cannot be enabled safely.");
  return api;
}

async function derive(password, salt) {
  const api = cryptoApi();
  const material = await api.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await api.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(salt), iterations: ITERATIONS }, material, 256);
  return bytesToHex(new Uint8Array(bits));
}

function equalDigest(left, right) {
  const a = encoder.encode(String(left));
  const b = encoder.encode(String(right));
  let mismatch = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index++) mismatch |= (a[index] || 0) ^ (b[index] || 0);
  return mismatch === 0;
}

export function createRecoveryCode() {
  const bytes = cryptoApi().getRandomValues(new Uint8Array(16));
  const hex = bytesToHex(bytes).toUpperCase();
  return hex.match(/.{1,4}/g).join("-");
}

export async function createPasswordRecord(password, recoveryCode) {
  if (typeof password !== "string" || password.length < 10) throw new Error("Use a password with at least 10 characters.");
  if (typeof recoveryCode !== "string" || recoveryCode.replaceAll("-", "").length < 24) throw new Error("A valid recovery code is required.");
  const api = cryptoApi();
  const salt = bytesToHex(api.getRandomValues(new Uint8Array(16)));
  const recoverySalt = bytesToHex(api.getRandomValues(new Uint8Array(16)));
  return { version: 1, algorithm: "PBKDF2-SHA256", iterations: ITERATIONS, salt, hash: await derive(password, salt), recoverySalt, recoveryHash: await derive(recoveryCode.replaceAll("-", "").toUpperCase(), recoverySalt), createdAt: new Date().toISOString() };
}

export async function verifyPassword(record, password) {
  if (!record?.salt || !record?.hash || typeof password !== "string") return false;
  return equalDigest(await derive(password, record.salt), record.hash);
}

export async function verifyRecoveryCode(record, code) {
  if (!record?.recoverySalt || !record?.recoveryHash || typeof code !== "string") return false;
  return equalDigest(await derive(code.replaceAll("-", "").toUpperCase(), record.recoverySalt), record.recoveryHash);
}
