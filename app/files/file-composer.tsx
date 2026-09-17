"use client";

import { type DragEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { chargeForFile, createStoredFile, encryptFile, exceedsFileLimit, fetchFilePaywall, fileShareLink, formatFileBytes, MAX_FILE_BYTES, MAX_STORED_PAYLOAD_BYTES, type FilePaywall, type FileShareFailure } from "@/lib/file-share";

const failures: Record<FileShareFailure, string> = {
  invalid_request: "The service rejected the request. Nothing was stored, so no link exists.",
  payload_too_large: "The service rejected the encrypted file as too large. Choose a smaller file.",
  rate_limited: "Too many files have been created from this network recently. Wait about an hour, then try again.",
  store_unavailable: "The file store is not accepting new files right now. Nothing was saved, so try again shortly.",
  not_found: "The service could not find that file.",
  network: "The file service could not be reached. It is self-hosted on a homelab cluster, so it may be offline, restarting, or blocked by your network. Your file never left this browser.",
  unexpected: "The service returned a response this page could not read. Assume no link was created and try again.",
  payment_required: "This upload is not paid for yet. Charge the mobile account first, then create the link.",
  insufficient_funds: "The mobile account does not have enough balance for this charge. Nothing was stored.",
  payment_declined: "The charge was declined. Nothing was stored.",
  payment_failed: "The mobile charge could not be completed. Nothing was stored.",
};

export function FileComposer() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copyState, setCopyState] = useState("");
  const [msisdn, setMsisdn] = useState("");
  const [consent, setConsent] = useState(false);
  const [paywall, setPaywall] = useState<FilePaywall>({ enabled: false, amount: "", currency: "LKR" });
  const [created, setCreated] = useState<{ link: string; name: string; size: number } | null>(null);
  const oversized = file !== null && exceedsFileLimit(file.size);

  useEffect(() => {
    void fetchFilePaywall().then(setPaywall);
  }, []);

  const choose = (next: File | null) => {
    setError("");
    setFile(next);
  };

  const reset = () => {
    setFile(null);
    setCreated(null);
    setError("");
    setCopyState("");
    setDragging(false);
    setConsent(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.link);
      setCopyState("Link copied");
    } catch {
      setCopyState("Copy unavailable, select the link and copy it manually.");
    }
    window.setTimeout(() => setCopyState(""), 2400);
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    choose(event.dataTransfer.files[0] ?? null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!file) { setError("Choose a file to encrypt and share."); return; }
    if (oversized) { setError(`This file is ${formatFileBytes(file.size)}. The limit is ${formatFileBytes(MAX_FILE_BYTES)}. Choose a smaller file.`); return; }
    if (paywall.enabled && !msisdn.trim()) { setError("Enter the Dialog, Hutch, or Airtel number that will pay for this upload."); return; }
    if (paywall.enabled && !consent) { setError("Confirm the one-time mobile charge before creating the link."); return; }
    if (!globalThis.crypto?.subtle) { setError("This browser did not expose Web Crypto, so nothing can be encrypted here. Open the page over HTTPS in a current browser."); return; }
    setBusy(true);
    try {
      let grant: string | undefined;
      if (paywall.enabled) {
        const charged = await chargeForFile(msisdn.trim());
        if (!charged.ok) { setError(charged.detail ? `${failures[charged.error]} ${charged.detail}` : failures[charged.error]); return; }
        grant = charged.grant;
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { payload, key } = await encryptFile({ name: file.name, type: file.type, bytes });
      if (payload.length > MAX_STORED_PAYLOAD_BYTES) { setError("The encrypted file is larger than the store will accept. Choose a smaller file."); return; }
      const result = await createStoredFile(payload, grant);
      if (!result.ok) { setError(failures[result.error]); return; }
      setCreated({ link: fileShareLink(window.location.origin, result.id, key), name: file.name, size: file.size });
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      setError("Encryption failed in this browser, so nothing was sent.");
    } finally {
      setBusy(false);
    }
  };

  if (created) return <div className="secret-composer">
    <section className="secret-panel secret-result" aria-live="polite">
      <p className="eyebrow">SHARE LINK</p>
      <h2>Share this download link</h2>
      <p className="secret-link" title="Encrypted file link">{created.link}</p>
      <div className="secret-actions">
        <button className="button primary" type="button" onClick={copy}>Copy link</button>
        <button className="button ghost" type="button" onClick={reset}>Share another file</button>
      </div>
      <p className="secret-copy-status" aria-live="polite">{copyState}</p>
      <dl className="secret-facts">
        <dt>File</dt><dd>{created.name}</dd>
        <dt>Size</dt><dd>{formatFileBytes(created.size)}</dd>
        <dt>Reads</dt><dd>Reusable. Anyone with the full link can download it until a later retention policy removes the stored ciphertext.</dd>
      </dl>
    </section>
    <section className="secret-panel secret-caution">
      <p className="eyebrow">READ THIS BEFORE YOU LEAVE</p>
      <ul>
        <li>This link is shown once on this page. Copy it now. The decryption key sits after the <code>#</code> and is not stored with the ciphertext.</li>
        <li>Share the whole link, including everything after the <code>#</code>. A truncated link is permanently unreadable.</li>
        <li>Opening the link yourself does not destroy the file. Anyone who later holds the complete URL can download it.</li>
      </ul>
    </section>
  </div>;

  return <form className="secret-composer" onSubmit={submit}>
    <section className="secret-panel">
      <label
        className={`file-dropzone${dragging ? " is-dragging" : ""}${oversized ? " is-invalid" : ""}`}
        htmlFor="file-input"
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={(event) => { event.preventDefault(); if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
        onDrop={onDrop}
      >
        <span>File</span>
        <strong>{file ? file.name : "Drop a file here or choose one"}</strong>
        <small>{file ? `${formatFileBytes(file.size)} · ${file.type || "unknown type"}` : `One file, up to ${formatFileBytes(MAX_FILE_BYTES)}`}</small>
        <input ref={inputRef} id="file-input" name="file" type="file" onChange={(event) => choose(event.target.files?.[0] ?? null)} aria-describedby="file-size file-error" aria-invalid={oversized || Boolean(error)} />
      </label>
      <p className="secret-size" id="file-size">{oversized ? `Too large by ${formatFileBytes(file.size - MAX_FILE_BYTES)}` : file ? `${formatFileBytes(file.size)} of ${formatFileBytes(MAX_FILE_BYTES)}` : `Ready for a file up to ${formatFileBytes(MAX_FILE_BYTES)}`}</p>
      {paywall.enabled && <>
        <label className="secret-field file-msisdn-field" htmlFor="file-msisdn">
          <span>Paying mobile number</span>
          <input id="file-msisdn" name="msisdn" inputMode="tel" autoComplete="tel" value={msisdn} onChange={(event) => setMsisdn(event.target.value)} placeholder="0771234567" />
        </label>
        <label className="file-consent" htmlFor="file-consent">
          <input id="file-consent" name="consent" type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          <span>I agree to a one-time charge of {paywall.amount} {paywall.currency} on this Dialog, Hutch, or Airtel account to create the encrypted share link. Downloads stay free for anyone with the full URL.</span>
        </label>
      </>}
      <div className="secret-controls">
        <button className="button primary" type="submit" disabled={busy}>{busy ? (paywall.enabled ? "Charging and encrypting..." : "Encrypting...") : "Create share link"}</button>
      </div>
      {error && <p className="secret-error" id="file-error" role="alert">{error}</p>}
      <p className="secret-note">Encryption happens in this browser. Only ciphertext is uploaded, and the key stays in the link fragment.{paywall.enabled ? " The sender pays through Ideamart CaaS on the Contabo API; this page never sees the charging password." : ""}</p>
    </section>
  </form>;
}
