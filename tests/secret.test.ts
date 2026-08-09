import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  createStoredSecret,
  burnStoredSecret,
  decryptSecret,
  encryptSecret,
  exceedsSecretLimit,
  fromBase64Url,
  isSecretTtl,
  MAX_SECRET_PAYLOAD_BYTES,
  secretLink,
  SECRET_IV_BYTES,
  toBase64Url,
} from "../lib/secret.ts";

const sweep = Uint8Array.from({ length: 256 }, (_, index) => index);
const readSource = (...segments: string[]) => readFile(path.join(process.cwd(), ...segments), "utf8");

test("base64url round-trips every byte value and both padding remainders", () => {
  const cases = [new Uint8Array(0), Uint8Array.from([0]), Uint8Array.from([255]), Uint8Array.from([0, 255]), Uint8Array.from([0, 255, 127]), Uint8Array.from([1, 2, 3, 4]), Uint8Array.from([1, 2, 3, 4, 5]), sweep];
  for (const bytes of cases) {
    const encoded = toBase64Url(bytes);
    assert.equal(encoded, Buffer.from(bytes).toString("base64url"), `alphabet mismatch for ${bytes.length} bytes`);
    assert.deepEqual([...fromBase64Url(encoded)], [...bytes], `round trip failed for ${bytes.length} bytes`);
  }
  assert.equal(toBase64Url(Uint8Array.from([1, 2])).length % 4, 3, "two bytes need one padding character in standard base64");
  assert.equal(toBase64Url(Uint8Array.from([1])).length % 4, 2, "one byte needs two padding characters in standard base64");
  assert.equal(toBase64Url(new Uint8Array(0)), "");
});

test("base64url encoding never emits padding or standard base64 characters", () => {
  assert.doesNotMatch(toBase64Url(sweep), /[+/=]/);
});

test("base64url decoding rejects invalid characters and standard base64 input", () => {
  for (const value of ["a+bc", "a/bc", "abc=", "ab==", "a b", "abc!", "abcé"]) assert.throws(() => fromBase64Url(value), /base64url/, value);
  assert.throws(() => fromBase64Url("abcde"), /base64url/, "a length remainder of one cannot be valid");
});

test("encrypting then decrypting returns the original text including multi-byte characters", async () => {
  for (const plaintext of ["hunter2", "", "café crème naïve", "配置は正しい", "one-time secret 🔥🔐", "line one\nline two\ttabbed", "x".repeat(4096)]) {
    const { payload, key } = await encryptSecret(plaintext);
    assert.equal(await decryptSecret(payload, key), plaintext);
  }
});

test("each secret uses a fresh key and initialization vector", async () => {
  const first = await encryptSecret("same text");
  const second = await encryptSecret("same text");
  assert.notEqual(first.key, second.key);
  assert.notEqual(first.payload, second.payload);
  assert.equal(fromBase64Url(first.key).length, 32);
  assert.ok(fromBase64Url(first.payload).length > SECRET_IV_BYTES);
});

test("decryption fails with a different key", async () => {
  const { payload } = await encryptSecret("hunter2");
  const { key } = await encryptSecret("unrelated");
  await assert.rejects(decryptSecret(payload, key));
});

test("decryption fails when the ciphertext is tampered with", async () => {
  const { payload, key } = await encryptSecret("hunter2");
  const bytes = fromBase64Url(payload);
  bytes[bytes.length - 1] ^= 1;
  await assert.rejects(decryptSecret(toBase64Url(bytes), key));
  const shifted = fromBase64Url(payload);
  shifted[0] ^= 1;
  await assert.rejects(decryptSecret(toBase64Url(shifted), key), "flipping an initialization vector byte must also fail");
  await assert.rejects(decryptSecret(toBase64Url(fromBase64Url(payload).subarray(0, SECRET_IV_BYTES)), key));
});

test("the lifetime validator accepts only the three published values", () => {
  for (const value of [3600, 86400, 604800]) assert.equal(isSecretTtl(value), true, String(value));
  for (const value of [0, -3600, 60, 3599, 3601, 86399, 604801, 1209600, 1.5, Number.NaN, "3600", null, undefined, {}]) assert.equal(isSecretTtl(value), false, String(value));
});

test("the client size limit matches the ciphertext limit the service enforces", () => {
  const headroom = MAX_SECRET_PAYLOAD_BYTES - SECRET_IV_BYTES - 16;
  assert.equal(exceedsSecretLimit("a".repeat(headroom)), false);
  assert.equal(exceedsSecretLimit("a".repeat(headroom + 1)), true);
  assert.equal(exceedsSecretLimit("é".repeat(headroom)), true, "multi-byte characters must count as their encoded length");
});

test("the shared link carries the key in the fragment and nowhere else", () => {
  const link = secretLink("https://gajan.dev", "abc123", "SGVsbG8");
  assert.equal(link, "https://gajan.dev/secret/abc123#SGVsbG8");
  assert.equal(new URL(link).search, "");
  assert.equal(secretLink("https://gajan.dev/", "abc123", "SGVsbG8"), link);
});

test("the create request sends only the ciphertext and lifetime", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return new Response(JSON.stringify({ id: "abc123", expiresAt: "2026-08-09T12:00:00Z" }), { status: 201, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const { payload, key } = await encryptSecret("hunter2");
    const result = await createStoredSecret(payload, 3600);
    assert.ok(result.ok);
    assert.equal(result.id, "abc123");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.gajan.dev/api/v1/secrets");
    assert.equal(calls[0].init.credentials, "omit");
    assert.deepEqual(JSON.parse(String(calls[0].init.body)), { payload, ttl: 3600 });
    assert.equal(JSON.stringify(calls).includes(key), false, "the key must never appear in a request");
    assert.equal(JSON.stringify(calls).includes("hunter2"), false, "the plaintext must never appear in a request");
  } finally { globalThis.fetch = original; }
});

test("service failures map to distinct, recoverable outcomes", async () => {
  const responses: { status: number; body: string }[] = [{ status: 404, body: JSON.stringify({ error: "not_found", message: "gone" }) }, { status: 503, body: JSON.stringify({ error: "store_unavailable", message: "restarting" }) }, { status: 502, body: "<html>bad gateway</html>" }];
  const expected = ["not_found", "store_unavailable", "unexpected"];
  const original = globalThis.fetch;
  try {
    for (const [index, response] of responses.entries()) {
      globalThis.fetch = (async () => new Response(response.body, { status: response.status })) as typeof fetch;
      const result = await burnStoredSecret("abc123");
      assert.equal(result.ok, false);
      assert.equal(result.ok === false && result.error, expected[index]);
    }
    globalThis.fetch = (async () => { throw new TypeError("Failed to fetch"); }) as typeof fetch;
    const offline = await burnStoredSecret("abc123");
    assert.equal(offline.ok === false && offline.error, "network");
  } finally { globalThis.fetch = original; }
});

test("the reveal page never retrieves a secret on mount", async () => {
  const source = await readSource("app", "secret", "[id]", "secret-reveal.tsx");
  assert.doesNotMatch(source, /useEffect\(/, "startup must not use an effect that could grow into an automatic burn");
  assert.match(source, /useSyncExternalStore\(subscribeHash, readHashKey/);
  assert.match(source, /window\.location\.hash/);
  const helpers = source.match(/function subscribeHash[\s\S]*?^function readHashKey[\s\S]*?^\}/m);
  assert.ok(helpers, "hash helpers must stay small and easy to audit");
  assert.doesNotMatch(helpers[0], /burnStoredSecret|fetch\(/, "retrieval must never run while reading the fragment, or unfurlers and prefetch would burn the secret");
  assert.match(source, /burnStoredSecret\(id\)/);
  assert.match(source, /onClick=\{reveal\}/);
  assert.doesNotMatch(source, /window\.location\.search|useSearchParams/, "the key must be read from the fragment only");
});

test("the key and the plaintext are never persisted or logged", async () => {
  for (const file of [["lib", "secret.ts"], ["app", "secret", "secret-composer.tsx"], ["app", "secret", "[id]", "secret-reveal.tsx"]]) {
    const source = await readSource(...file);
    assert.doesNotMatch(source, /localStorage|sessionStorage|document\.cookie|console\./, file.join("/"));
  }
  const secretModule = await readSource("lib", "secret.ts");
  assert.match(secretModule, /body: JSON\.stringify\(\{ payload, ttl \}\)/);
  assert.doesNotMatch(secretModule, /atob|btoa|Buffer/);
});
