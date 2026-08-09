export const SECRET_API_BASE_URL = process.env.NEXT_PUBLIC_SECRET_API_URL || "https://api.gajan.dev";
export const SECRET_IV_BYTES = 12;
export const SECRET_TAG_BYTES = 16;
export const MAX_SECRET_PAYLOAD_BYTES = 65536;
export const SECRET_TTLS = [{ value: 3600, label: "1 hour" }, { value: 86400, label: "24 hours" }, { value: 604800, label: "7 days" }] as const;
export type SecretTtl = (typeof SECRET_TTLS)[number]["value"];
export type SecretApiFailure = "invalid_request" | "payload_too_large" | "rate_limited" | "store_unavailable" | "not_found" | "network" | "unexpected";
export type CreateSecretResult = { ok: true; id: string; expiresAt: string } | { ok: false; error: SecretApiFailure };
export type BurnSecretResult = { ok: true; payload: string } | { ok: false; error: SecretApiFailure };

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const LOOKUP = new Map([...ALPHABET].map((character, index) => [character, index] as const));

export function toBase64Url(bytes: Uint8Array): string {
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const remaining = bytes.length - index;
    const first = bytes[index];
    const second = remaining > 1 ? bytes[index + 1] : 0;
    const third = remaining > 2 ? bytes[index + 2] : 0;
    output += ALPHABET[first >> 2] + ALPHABET[((first & 3) << 4) | (second >> 4)];
    if (remaining > 1) output += ALPHABET[((second & 15) << 2) | (third >> 6)];
    if (remaining > 2) output += ALPHABET[third & 63];
  }
  return output;
}

export function fromBase64Url(value: string): Uint8Array {
  if (value.length % 4 === 1) throw new Error("Value is not valid base64url.");
  const bytes = new Uint8Array(Math.floor((value.length * 3) / 4));
  let buffer = 0, bits = 0, offset = 0;
  for (const character of value) {
    const index = LOOKUP.get(character);
    if (index === undefined) throw new Error("Value is not valid base64url.");
    buffer = (buffer << 6) | index;
    bits += 6;
    if (bits >= 8) { bits -= 8; bytes[offset++] = (buffer >> bits) & 255; }
  }
  return bytes;
}

export function isSecretTtl(value: unknown): value is SecretTtl { return typeof value === "number" && SECRET_TTLS.some((ttl) => ttl.value === value); }
export function secretTtlLabel(value: SecretTtl): string { return SECRET_TTLS.find((ttl) => ttl.value === value)?.label ?? ""; }
export function secretPayloadBytes(plaintext: string): number { return SECRET_IV_BYTES + new TextEncoder().encode(plaintext).length + SECRET_TAG_BYTES; }
export function exceedsSecretLimit(plaintext: string): boolean { return secretPayloadBytes(plaintext) > MAX_SECRET_PAYLOAD_BYTES; }
export function secretLink(origin: string, id: string, key: string): string { return `${origin.replace(/\/+$/, "")}/secret/${id}#${key}`; }

export async function encryptSecret(plaintext: string): Promise<{ payload: string; key: string }> {
  const key = await globalThis.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(SECRET_IV_BYTES));
  const ciphertext = new Uint8Array(await globalThis.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext)));
  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv);
  combined.set(ciphertext, iv.length);
  return { payload: toBase64Url(combined), key: toBase64Url(new Uint8Array(await globalThis.crypto.subtle.exportKey("raw", key))) };
}

export async function decryptSecret(payload: string, key: string): Promise<string> {
  const combined = new Uint8Array(fromBase64Url(payload));
  if (combined.length <= SECRET_IV_BYTES) throw new Error("Ciphertext is too short to decrypt.");
  const material = await globalThis.crypto.subtle.importKey("raw", new Uint8Array(fromBase64Url(key)), { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  return new TextDecoder().decode(await globalThis.crypto.subtle.decrypt({ name: "AES-GCM", iv: combined.subarray(0, SECRET_IV_BYTES) }, material, combined.subarray(SECRET_IV_BYTES)));
}

async function failureFrom(response: Response): Promise<SecretApiFailure> {
  const known: SecretApiFailure[] = ["invalid_request", "payload_too_large", "rate_limited", "store_unavailable", "not_found"];
  try {
    const body: unknown = await response.json();
    const error = typeof body === "object" && body !== null ? (body as { error?: unknown }).error : undefined;
    const match = known.find((candidate) => candidate === error);
    if (match) return match;
  } catch { /* the API may return a non-JSON body from an intermediate proxy */ }
  if (response.status === 404) return "not_found";
  if (response.status === 413) return "payload_too_large";
  if (response.status === 429) return "rate_limited";
  if (response.status === 503) return "store_unavailable";
  return "unexpected";
}

export async function createStoredSecret(payload: string, ttl: SecretTtl): Promise<CreateSecretResult> {
  let response: Response;
  try {
    response = await fetch(`${SECRET_API_BASE_URL}/api/v1/secrets`, { method: "POST", mode: "cors", credentials: "omit", cache: "no-store", headers: { "content-type": "application/json" }, body: JSON.stringify({ payload, ttl }) });
  } catch { return { ok: false, error: "network" }; }
  if (!response.ok) return { ok: false, error: await failureFrom(response) };
  try {
    const body: unknown = await response.json();
    const { id, expiresAt } = body as { id?: unknown; expiresAt?: unknown };
    if (typeof id !== "string" || !id || typeof expiresAt !== "string") return { ok: false, error: "unexpected" };
    return { ok: true, id, expiresAt };
  } catch { return { ok: false, error: "unexpected" }; }
}

export async function burnStoredSecret(id: string): Promise<BurnSecretResult> {
  let response: Response;
  try {
    response = await fetch(`${SECRET_API_BASE_URL}/api/v1/secrets/${encodeURIComponent(id)}/burn`, { method: "POST", mode: "cors", credentials: "omit", cache: "no-store" });
  } catch { return { ok: false, error: "network" }; }
  if (!response.ok) return { ok: false, error: await failureFrom(response) };
  try {
    const body: unknown = await response.json();
    const { payload } = body as { payload?: unknown };
    if (typeof payload !== "string" || !payload) return { ok: false, error: "unexpected" };
    return { ok: true, payload };
  } catch { return { ok: false, error: "unexpected" }; }
}
