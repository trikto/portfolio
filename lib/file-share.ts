import { SECRET_API_BASE_URL, fromBase64Url, toBase64Url } from "./secret.ts";

export const FILE_IV_BYTES = 12;
export const FILE_TAG_BYTES = 16;
export const FILE_API_BASE_URL = process.env.NEXT_PUBLIC_FILE_API_URL || SECRET_API_BASE_URL;
export const MAX_FILE_BYTES = 100 * 1024 * 1024;
export const MAX_FILE_NAME_BYTES = 255;
export const MAX_FILE_TYPE_BYTES = 127;
export const MAX_STORED_PAYLOAD_BYTES = MAX_FILE_BYTES + FILE_IV_BYTES + FILE_TAG_BYTES + 4 + MAX_FILE_NAME_BYTES + MAX_FILE_TYPE_BYTES;

export type FileShareFailure = "invalid_request" | "payload_too_large" | "rate_limited" | "store_unavailable" | "not_found" | "network" | "unexpected" | "payment_required" | "insufficient_funds" | "payment_declined" | "payment_failed";
export type CreateStoredFileResult = { ok: true; id: string } | { ok: false; error: FileShareFailure };
export type FetchStoredFileResult = { ok: true; payload: Uint8Array } | { ok: false; error: FileShareFailure };
export type FilePaywall = { enabled: boolean; amount: string; currency: string };
export type ChargeFileResult = { ok: true; grant: string; status: string } | { ok: false; error: FileShareFailure };
export type SharedFile = { name: string; type: string; bytes: Uint8Array };

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function asCryptoBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

function writeUint16(target: Uint8Array, offset: number, value: number) {
  target[offset] = (value >> 8) & 255;
  target[offset + 1] = value & 255;
}

function readUint16(source: Uint8Array, offset: number) {
  return (source[offset] << 8) | source[offset + 1];
}

export function exceedsFileLimit(size: number): boolean {
  return !Number.isInteger(size) || size < 0 || size > MAX_FILE_BYTES;
}

export function formatFileBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(size < 10 * 1024 ? 1 : 0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(size < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

export function fileShareLink(origin: string, id: string, key: string): string {
  return `${origin.replace(/\/+$/, "")}/files/${id}#${key}`;
}

export function placeholderFileId(): string {
  return toBase64Url(globalThis.crypto.getRandomValues(new Uint8Array(9)));
}

async function failureFrom(response: Response): Promise<FileShareFailure> {
  const known: FileShareFailure[] = ["invalid_request", "payload_too_large", "rate_limited", "store_unavailable", "not_found", "payment_required", "insufficient_funds", "payment_declined", "payment_failed"];
  try {
    const body: unknown = await response.json();
    const error = typeof body === "object" && body !== null ? (body as { error?: unknown }).error : undefined;
    const match = known.find((candidate) => candidate === error);
    if (match) return match;
  } catch { /* the API may return a non-JSON body from an intermediate proxy */ }
  if (response.status === 402) return "payment_required";
  if (response.status === 404) return "not_found";
  if (response.status === 413) return "payload_too_large";
  if (response.status === 429) return "rate_limited";
  if (response.status === 503) return "store_unavailable";
  return "unexpected";
}

function encodeEnvelope({ name, type, bytes }: SharedFile): Uint8Array {
  const nameBytes = textEncoder.encode(name);
  const typeBytes = textEncoder.encode(type);
  if (nameBytes.length === 0) throw new Error("A file name is required.");
  if (nameBytes.length > MAX_FILE_NAME_BYTES) throw new Error("The file name is too long to encrypt.");
  if (typeBytes.length > MAX_FILE_TYPE_BYTES) throw new Error("The file type is too long to encrypt.");
  const envelope = new Uint8Array(4 + nameBytes.length + typeBytes.length + bytes.length);
  writeUint16(envelope, 0, nameBytes.length);
  envelope.set(nameBytes, 2);
  writeUint16(envelope, 2 + nameBytes.length, typeBytes.length);
  envelope.set(typeBytes, 4 + nameBytes.length);
  envelope.set(bytes, 4 + nameBytes.length + typeBytes.length);
  return envelope;
}

function decodeEnvelope(envelope: Uint8Array): SharedFile {
  if (envelope.length < 4) throw new Error("Encrypted file envelope is too short.");
  const nameLength = readUint16(envelope, 0);
  const nameStart = 2;
  const nameEnd = nameStart + nameLength;
  const typeLengthOffset = nameEnd;
  if (typeLengthOffset + 2 > envelope.length) throw new Error("Encrypted file envelope is truncated.");
  const typeLength = readUint16(envelope, typeLengthOffset);
  const typeStart = typeLengthOffset + 2;
  const typeEnd = typeStart + typeLength;
  if (typeEnd > envelope.length) throw new Error("Encrypted file envelope is truncated.");
  const name = textDecoder.decode(envelope.subarray(nameStart, nameEnd));
  const type = textDecoder.decode(envelope.subarray(typeStart, typeEnd));
  if (!name) throw new Error("Encrypted file envelope is missing a name.");
  return { name, type, bytes: envelope.subarray(typeEnd) };
}

export async function encryptFile(file: SharedFile): Promise<{ payload: Uint8Array; key: string }> {
  if (exceedsFileLimit(file.bytes.length)) throw new Error("File is larger than 100 MB.");
  const key = await globalThis.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(FILE_IV_BYTES));
  const ciphertext = new Uint8Array(await globalThis.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, asCryptoBytes(encodeEnvelope(file))));
  const payload = new Uint8Array(iv.length + ciphertext.length);
  payload.set(iv);
  payload.set(ciphertext, iv.length);
  return { payload, key: toBase64Url(new Uint8Array(await globalThis.crypto.subtle.exportKey("raw", key))) };
}

export async function decryptFile(payload: Uint8Array, key: string): Promise<SharedFile> {
  if (payload.length <= FILE_IV_BYTES + FILE_TAG_BYTES) throw new Error("Ciphertext is too short to decrypt.");
  const material = await globalThis.crypto.subtle.importKey("raw", asCryptoBytes(fromBase64Url(key)), { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const envelope = new Uint8Array(await globalThis.crypto.subtle.decrypt({ name: "AES-GCM", iv: asCryptoBytes(payload.subarray(0, FILE_IV_BYTES)) }, material, asCryptoBytes(payload.subarray(FILE_IV_BYTES))));
  return decodeEnvelope(envelope);
}

export async function fetchFilePaywall(): Promise<FilePaywall> {
  try {
    const response = await fetch(`${FILE_API_BASE_URL}/api/v1/files/paywall`, { method: "GET", mode: "cors", credentials: "omit", cache: "no-store" });
    if (!response.ok) return { enabled: false, amount: "", currency: "LKR" };
    const body: unknown = await response.json();
    const enabled = typeof body === "object" && body !== null && (body as { enabled?: unknown }).enabled === true;
    const amount = typeof body === "object" && body !== null && typeof (body as { amount?: unknown }).amount === "string" ? (body as { amount: string }).amount : "";
    const currency = typeof body === "object" && body !== null && typeof (body as { currency?: unknown }).currency === "string" ? (body as { currency: string }).currency : "LKR";
    return { enabled, amount, currency };
  } catch {
    return { enabled: false, amount: "", currency: "LKR" };
  }
}

export async function chargeForFile(subscriberId: string): Promise<ChargeFileResult> {
  let response: Response;
  try {
    response = await fetch(`${FILE_API_BASE_URL}/api/v1/files/charge`, { method: "POST", mode: "cors", credentials: "omit", cache: "no-store", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscriberId, consent: true }) });
  } catch { return { ok: false, error: "network" }; }
  if (response.status === 202) {
    try {
      const body: unknown = await response.json();
      const grant = typeof body === "object" && body !== null ? (body as { grant?: unknown }).grant : undefined;
      if (typeof grant !== "string" || !grant) return { ok: false, error: "payment_failed" };
      const charged = await waitForGrant(grant);
      if (!charged) return { ok: false, error: "payment_failed" };
      return { ok: true, grant, status: "CHARGED" };
    } catch { return { ok: false, error: "unexpected" }; }
  }
  if (!response.ok) return { ok: false, error: await failureFrom(response) };
  try {
    const body: unknown = await response.json();
    const { grant, status } = body as { grant?: unknown; status?: unknown };
    if (typeof grant !== "string" || !grant) return { ok: false, error: "unexpected" };
    return { ok: true, grant, status: typeof status === "string" ? status : "CHARGED" };
  } catch { return { ok: false, error: "unexpected" }; }
}

async function waitForGrant(grant: string): Promise<boolean> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(`${FILE_API_BASE_URL}/api/v1/files/grants/${encodeURIComponent(grant)}`, { method: "GET", mode: "cors", credentials: "omit", cache: "no-store" });
      if (response.ok) {
        const body: unknown = await response.json();
        if (typeof body === "object" && body !== null && (body as { charged?: unknown }).charged === true) return true;
      }
    } catch { /* keep polling */ }
    await new Promise((resolve) => window.setTimeout(resolve, 3000));
  }
  return false;
}

export async function createStoredFile(payload: Uint8Array, grant?: string): Promise<CreateStoredFileResult> {
  const headers: Record<string, string> = { "content-type": "application/octet-stream" };
  if (grant) headers["X-Upload-Grant"] = grant;
  let response: Response;
  try {
    response = await fetch(`${FILE_API_BASE_URL}/api/v1/files`, { method: "POST", mode: "cors", credentials: "omit", cache: "no-store", headers, body: asCryptoBytes(payload) });
  } catch { return { ok: false, error: "network" }; }
  if (!response.ok) return { ok: false, error: await failureFrom(response) };
  try {
    const body: unknown = await response.json();
    const { id } = body as { id?: unknown };
    if (typeof id !== "string" || !id) return { ok: false, error: "unexpected" };
    return { ok: true, id };
  } catch { return { ok: false, error: "unexpected" }; }
}

export async function fetchStoredFile(id: string): Promise<FetchStoredFileResult> {
  let response: Response;
  try {
    response = await fetch(`${FILE_API_BASE_URL}/api/v1/files/${encodeURIComponent(id)}`, { method: "POST", mode: "cors", credentials: "omit", cache: "no-store" });
  } catch { return { ok: false, error: "network" }; }
  if (!response.ok) return { ok: false, error: await failureFrom(response) };
  try {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) return { ok: false, error: "unexpected" };
    return { ok: true, payload: new Uint8Array(buffer) };
  } catch { return { ok: false, error: "unexpected" }; }
}
