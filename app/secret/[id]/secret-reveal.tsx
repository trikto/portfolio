"use client";

import { useState, useSyncExternalStore } from "react";
import { burnStoredSecret, decryptSecret, type SecretApiFailure } from "@/lib/secret";

const failures: Record<SecretApiFailure, string> = {
  invalid_request: "The service rejected this request, so nothing was read or deleted.",
  payload_too_large: "The service rejected this request, so nothing was read or deleted.",
  rate_limited: "Too many attempts have come from this network recently. Wait about a minute and try again. Nothing was read or deleted.",
  store_unavailable: "The secret store is unavailable right now. It is self-hosted on a K3s cluster, so this is usually a restart rather than a lost secret. Nothing was read or deleted, so this link should still work once the store is back.",
  not_found: "This secret is gone. A one-time link opens exactly once, and stored secrets are also removed when their expiry passes, so either it has already been opened or it has expired. Ask the sender for a new link.",
  network: "The secret service could not be reached. It is self-hosted on a homelab cluster, so it may be offline, restarting, or blocked by your network. Nothing was read or deleted.",
  unexpected: "The service returned a response this page could not read. Nothing usable was recovered.",
};

function subscribeHash(onStoreChange: () => void) {
  window.addEventListener("hashchange", onStoreChange);
  return () => window.removeEventListener("hashchange", onStoreChange);
}

function readHashKey() {
  return window.location.hash.replace(/^#/, "") || null;
}

export function SecretReveal({ id }: { id: string }) {
  const key = useSyncExternalStore(subscribeHash, readHashKey, () => null);
  const [busy, setBusy] = useState(false);
  const [plaintext, setPlaintext] = useState<string | null>(null), [error, setError] = useState(""), [copyState, setCopyState] = useState("");
  const copy = async () => { if (plaintext === null) return; try { await navigator.clipboard.writeText(plaintext); setCopyState("Secret copied"); } catch { setCopyState("Copy unavailable, select the secret and copy it manually."); } window.setTimeout(() => setCopyState(""), 2400); };
  const reveal = async () => {
    setError("");
    if (!key) { setError("This link has no decryption key after the #. It was almost certainly truncated in transit, which happens when links are pasted through chat clients, rewritten by mail security products, or copied from a preview. The stored secret was not touched, so ask the sender to resend the complete link."); return; }
    if (!globalThis.crypto?.subtle) { setError("This browser did not expose Web Crypto, so nothing can be decrypted here. Open the link over HTTPS in a current browser."); return; }
    setBusy(true);
    try {
      const result = await burnStoredSecret(id);
      if (!result.ok) { setError(failures[result.error]); return; }
      try { setPlaintext(await decryptSecret(result.payload, key)); } catch { setError("The stored copy was retrieved and deleted, but it could not be decrypted. The key in this link does not match this secret, or the ciphertext was altered. Ask the sender for a new link."); }
    } finally { setBusy(false); }
  };
  if (plaintext !== null) return <div className="secret-composer">
    <section className="secret-panel secret-result" aria-live="polite"><p className="eyebrow">REVEALED ONCE</p><h2>Here is the secret</h2><pre className="secret-plaintext">{plaintext}</pre><div className="secret-actions"><button className="button primary" type="button" onClick={copy}>Copy secret</button></div><p className="secret-copy-status" aria-live="polite">{copyState}</p><p className="secret-good">The stored copy has been deleted. This page is now the only copy, and reloading it will not bring the secret back.</p></section>
  </div>;
  return <div className="secret-composer">
    <section className="secret-panel"><p className="eyebrow">ONE-TIME SECRET</p><h2>Someone shared a secret with you</h2><p className="secret-warn">Revealing it destroys it. The stored copy is deleted the moment it is read, so nobody else can open this link afterwards and you cannot open it twice yourself.</p><div className="secret-actions"><button className="button primary" type="button" disabled={busy} onClick={reveal}>{busy ? "Retrieving..." : "Reveal secret"}</button></div>{error && <p className="secret-error" role="alert">{error}</p>}<p className="secret-note">Nothing is requested until you press the button. Decryption uses the key in this link&apos;s fragment, which never leaves your browser.</p></section>
  </div>;
}
