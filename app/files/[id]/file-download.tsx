"use client";

import { useState, useSyncExternalStore } from "react";
import { decryptFile, fetchStoredFile, formatFileBytes, type FileShareFailure } from "@/lib/file-share";

const failures: Record<FileShareFailure, string> = {
  invalid_request: "The service rejected this request, so nothing was downloaded.",
  payload_too_large: "The service rejected this request, so nothing was downloaded.",
  rate_limited: "Too many attempts have come from this network recently. Wait about an hour and try again. Nothing was downloaded.",
  store_unavailable: "The file store is unavailable right now. Nothing was downloaded, so this link should still work once the store is back.",
  not_found: "This file could not be found. The identifier may be wrong, or the stored copy may have been removed.",
  network: "The file service could not be reached. It is self-hosted on a homelab cluster, so it may be offline, restarting, or blocked by your network. Nothing was downloaded.",
  unexpected: "The service returned a response this page could not read. Nothing usable was recovered.",
  payment_required: "This download does not need a payment. If you see this, retry from the share link.",
  insufficient_funds: "This download does not need a payment. If you see this, retry from the share link.",
  payment_declined: "This download does not need a payment. If you see this, retry from the share link.",
  payment_failed: "This download does not need a payment. If you see this, retry from the share link.",
};

function subscribeHash(onStoreChange: () => void) {
  window.addEventListener("hashchange", onStoreChange);
  return () => window.removeEventListener("hashchange", onStoreChange);
}

function readHashKey() {
  return window.location.hash.replace(/^#/, "") || null;
}

export function FileDownload({ id }: { id: string }) {
  const key = useSyncExternalStore(subscribeHash, readHashKey, () => null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [downloaded, setDownloaded] = useState<{ name: string; size: number } | null>(null);

  const download = async () => {
    setError("");
    if (!key) { setError("This link has no decryption key after the #. It was almost certainly truncated in transit. The stored file was not touched, so ask the sender to resend the complete link."); return; }
    if (!globalThis.crypto?.subtle) { setError("This browser did not expose Web Crypto, so nothing can be decrypted here. Open the link over HTTPS in a current browser."); return; }
    setBusy(true);
    try {
      const result = await fetchStoredFile(id);
      if (!result.ok) { setError(failures[result.error]); return; }
      try {
        const file = await decryptFile(result.payload, key);
        const blob = new Blob([new Uint8Array(file.bytes)], { type: file.type || "application/octet-stream" });
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = file.name;
        anchor.click();
        URL.revokeObjectURL(objectUrl);
        setDownloaded({ name: file.name, size: file.bytes.length });
      } catch {
        setError("The stored copy was retrieved, but it could not be decrypted. The key in this link does not match this file, or the ciphertext was altered. Ask the sender for a new link.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (downloaded) return <div className="secret-composer">
    <section className="secret-panel secret-result" aria-live="polite">
      <p className="eyebrow">DOWNLOADED</p>
      <h2>The file is on this device</h2>
      <p className="secret-good">{downloaded.name} ({formatFileBytes(downloaded.size)}) was decrypted in this browser. The stored copy was not deleted, so this link can be used again.</p>
    </section>
  </div>;

  return <div className="secret-composer">
    <section className="secret-panel">
      <p className="eyebrow">ENCRYPTED FILE</p>
      <h2>Someone shared a file with you</h2>
      <p className="secret-warn">Downloading decrypts the file in this browser. The link is reusable: opening it does not destroy the stored copy.</p>
      <div className="secret-actions">
        <button className="button primary" type="button" disabled={busy} onClick={download}>{busy ? "Retrieving..." : "Download file"}</button>
      </div>
      {error && <p className="secret-error" role="alert">{error}</p>}
      <p className="secret-note">Nothing is requested until you press the button. Decryption uses the key in this link&apos;s fragment, which never leaves your browser.</p>
    </section>
  </div>;
}
