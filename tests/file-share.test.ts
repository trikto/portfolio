import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  createStoredFile,
  decryptFile,
  encryptFile,
  exceedsFileLimit,
  fetchStoredFile,
  FILE_IV_BYTES,
  fileShareLink,
  MAX_FILE_BYTES,
} from "../lib/file-share.ts";
import { fromBase64Url } from "../lib/secret.ts";

const readSource = (...segments: string[]) => readFile(path.join(process.cwd(), ...segments), "utf8");

test("the client size limit is 100 MB inclusive", () => {
  assert.equal(exceedsFileLimit(0), false);
  assert.equal(exceedsFileLimit(MAX_FILE_BYTES), false);
  assert.equal(exceedsFileLimit(MAX_FILE_BYTES + 1), true);
  assert.equal(exceedsFileLimit(-1), true);
  assert.equal(exceedsFileLimit(1.5), true);
  assert.equal(MAX_FILE_BYTES, 104857600);
});

test("the shared link carries the key in the fragment and nowhere else", () => {
  const link = fileShareLink("https://gajan.dev", "abc123", "SGVsbG8");
  assert.equal(link, "https://gajan.dev/files/abc123#SGVsbG8");
  assert.equal(new URL(link).search, "");
  assert.equal(fileShareLink("https://gajan.dev/", "abc123", "SGVsbG8"), link);
});

test("encrypting then decrypting returns the original name, type, and bytes", async () => {
  const cases: Array<{ name: string; type: string; bytes: Uint8Array }> = [
    { name: "notes.txt", type: "text/plain", bytes: new TextEncoder().encode("hello file") },
    { name: "café.bin", type: "application/octet-stream", bytes: Uint8Array.from([0, 255, 127]) },
    { name: "empty.dat", type: "", bytes: new Uint8Array(0) },
    { name: "配置は正しい.png", type: "image/png", bytes: new TextEncoder().encode("png-bytes") },
  ];
  for (const file of cases) {
    const { payload, key } = await encryptFile(file);
    const recovered = await decryptFile(payload, key);
    assert.equal(recovered.name, file.name);
    assert.equal(recovered.type, file.type);
    assert.deepEqual([...recovered.bytes], [...file.bytes]);
  }
});

test("each file uses a fresh key and initialization vector", async () => {
  const file = { name: "same.bin", type: "application/octet-stream", bytes: new TextEncoder().encode("same bytes") };
  const first = await encryptFile(file);
  const second = await encryptFile(file);
  assert.notEqual(first.key, second.key);
  assert.notDeepEqual([...first.payload], [...second.payload]);
  assert.equal(fromBase64Url(first.key).length, 32);
  assert.ok(first.payload.length > FILE_IV_BYTES);
});

test("decryption fails with a different key or tampered ciphertext", async () => {
  const genuine = await encryptFile({ name: "secret.bin", type: "application/octet-stream", bytes: new TextEncoder().encode("payload") });
  const other = await encryptFile({ name: "other.bin", type: "application/octet-stream", bytes: new TextEncoder().encode("other") });
  await assert.rejects(decryptFile(genuine.payload, other.key));
  const tampered = genuine.payload.slice();
  tampered[tampered.length - 1] ^= 1;
  await assert.rejects(decryptFile(tampered, genuine.key));
  const flippedIv = genuine.payload.slice();
  flippedIv[0] ^= 1;
  await assert.rejects(decryptFile(flippedIv, genuine.key));
  await assert.rejects(decryptFile(genuine.payload.subarray(0, FILE_IV_BYTES), genuine.key));
});

test("storage helpers POST ciphertext and never send the key", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    if (String(input).endsWith("/api/v1/files")) return new Response(JSON.stringify({ id: "abc123def456ghi789jk" }), { status: 201, headers: { "content-type": "application/json" } });
    return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "application/octet-stream" } });
  }) as typeof fetch;
  try {
    const { payload, key } = await encryptFile({ name: "notes.txt", type: "text/plain", bytes: new TextEncoder().encode("hello file") });
    const created = await createStoredFile(payload);
    assert.ok(created.ok);
    assert.equal(created.ok && created.id, "abc123def456ghi789jk");
    assert.equal(calls[0].url, "https://api.gajan.dev/api/v1/files");
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.credentials, "omit");
    assert.equal((calls[0].init.headers as { "content-type": string })["content-type"], "application/octet-stream");
    assert.equal(JSON.stringify(calls).includes(key), false, "the key must never appear in a request");
    const fetched = await fetchStoredFile("abc123def456ghi789jk");
    assert.ok(fetched.ok);
    assert.deepEqual([...(fetched.ok ? fetched.payload : [])], [1, 2, 3]);
    assert.equal(calls[1].init.method, "POST");
  } finally { globalThis.fetch = original; }
});

test("service failures map to distinct, recoverable outcomes", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = (async () => new Response(JSON.stringify({ error: "not_found" }), { status: 404 })) as typeof fetch;
    const missing = await fetchStoredFile("abc123");
    assert.equal(missing.ok === false && missing.error, "not_found");
    globalThis.fetch = (async () => { throw new TypeError("Failed to fetch"); }) as typeof fetch;
    const offline = await createStoredFile(new Uint8Array([1, 2, 3]));
    assert.equal(offline.ok === false && offline.error, "network");
  } finally { globalThis.fetch = original; }
});

test("the download page never retrieves a file on mount", async () => {
  const source = await readSource("app", "files", "[id]", "file-download.tsx");
  assert.doesNotMatch(source, /useEffect\(/, "startup must not use an effect that could grow into an automatic fetch");
  assert.match(source, /useSyncExternalStore\(subscribeHash, readHashKey/);
  assert.match(source, /window\.location\.hash/);
  const helpers = source.match(/function subscribeHash[\s\S]*?^function readHashKey[\s\S]*?^\}/m);
  assert.ok(helpers, "hash helpers must stay small and easy to audit");
  assert.doesNotMatch(helpers[0], /fetchStoredFile|fetch\(/, "retrieval must never run while reading the fragment");
  assert.match(source, /fetchStoredFile\(id\)/);
  assert.match(source, /onClick=\{download\}/);
  assert.doesNotMatch(source, /window\.location\.search|useSearchParams/, "the key must be read from the fragment only");
});

test("the key and the file bytes are never persisted or logged", async () => {
  for (const file of [["lib", "file-share.ts"], ["app", "files", "file-composer.tsx"], ["app", "files", "[id]", "file-download.tsx"]]) {
    const source = await readSource(...file);
    assert.doesNotMatch(source, /localStorage|sessionStorage|document\.cookie|console\./, file.join("/"));
  }
});
