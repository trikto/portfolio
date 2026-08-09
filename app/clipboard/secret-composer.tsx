"use client";

import { type FormEvent, useState } from "react";
import { createStoredSecret, encryptSecret, exceedsSecretLimit, isSecretTtl, MAX_SECRET_PAYLOAD_BYTES, secretLink, secretPayloadBytes, SECRET_TTLS, type SecretApiFailure, type SecretTtl } from "@/lib/secret";

const failures: Record<SecretApiFailure, string> = {
  invalid_request: "The service rejected the request. Nothing was stored, so no link exists.",
  payload_too_large: "The service rejected the encrypted payload as too large. Shorten the secret and create the link again.",
  rate_limited: "Too many links have been created from this network recently. Wait about a minute, then try again.",
  store_unavailable: "The secret store is not accepting new secrets right now. It runs on a self-hosted K3s cluster, so this usually means the store is restarting. Nothing was saved, so try again shortly.",
  not_found: "The service could not find that secret.",
  network: "The secret service could not be reached. It is self-hosted on a homelab cluster, so it may be offline, restarting, or blocked by your network. Your secret never left this browser.",
  unexpected: "The service returned a response this page could not read. Assume no link was created and try again.",
};

function expiryLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZoneName: "short" }).format(date);
}

export function SecretComposer() {
  const [secret, setSecret] = useState(""), [ttl, setTtl] = useState<SecretTtl>(86400), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [copyState, setCopyState] = useState("");
  const [created, setCreated] = useState<{ link: string; expiresAt: string } | null>(null);
  const oversized = exceedsSecretLimit(secret);
  const reset = () => { setSecret(""); setCreated(null); setError(""); setCopyState(""); };
  const copy = async () => { if (!created) return; try { await navigator.clipboard.writeText(created.link); setCopyState("Link copied"); } catch { setCopyState("Copy unavailable, select the link and copy it manually."); } window.setTimeout(() => setCopyState(""), 2400); };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!secret) { setError("Enter the secret you want to share."); return; }
    if (oversized) { setError(`This secret is too large. The encrypted payload must stay under ${Math.floor(MAX_SECRET_PAYLOAD_BYTES / 1024)} KB and this one would be about ${Math.ceil(secretPayloadBytes(secret) / 1024)} KB. Send a file through another channel instead.`); return; }
    if (!globalThis.crypto?.subtle) { setError("This browser did not expose Web Crypto, so nothing can be encrypted here. Open the page over HTTPS in a current browser."); return; }
    setBusy(true);
    try {
      const { payload, key } = await encryptSecret(secret);
      const result = await createStoredSecret(payload, ttl);
      if (!result.ok) { setError(failures[result.error]); return; }
      setCreated({ link: secretLink(window.location.origin, result.id, key), expiresAt: result.expiresAt });
      setSecret("");
    } catch { setError("Encryption failed in this browser, so nothing was sent."); } finally { setBusy(false); }
  };
  if (created) return <div className="secret-composer">
    <section className="secret-panel secret-result" aria-live="polite"><p className="eyebrow">ONE-TIME LINK</p><h2>Share this link once</h2><p className="secret-link" title="One-time secret link">{created.link}</p><div className="secret-actions"><button className="button primary" type="button" onClick={copy}>Copy link</button><button className="button ghost" type="button" onClick={reset}>Create another</button></div><p className="secret-copy-status" aria-live="polite">{copyState}</p><dl className="secret-facts"><dt>Expires</dt><dd>{expiryLabel(created.expiresAt)}</dd><dt>Reads</dt><dd>One, then the stored copy is deleted</dd></dl></section>
    <section className="secret-panel secret-caution"><p className="eyebrow">READ THIS BEFORE YOU LEAVE</p><ul><li>This link is shown once. It is not stored anywhere on this page and cannot be recovered after you navigate away.</li><li>Share the whole link, including everything after the <code>#</code>. That fragment is the decryption key and it never reaches the server, so a truncated link is permanently unreadable.</li><li>Opening the link yourself to check it will consume the single read and leave nothing for the recipient.</li></ul></section>
  </div>;
  return <form className="secret-composer" onSubmit={submit}>
    <section className="secret-panel"><label className="secret-field" htmlFor="secret-input"><span>Secret</span><textarea id="secret-input" name="secret" rows={7} spellCheck={false} autoComplete="off" placeholder="Paste the password, token, or note to share once" value={secret} onChange={(event) => setSecret(event.target.value)} aria-describedby="secret-size secret-error" aria-invalid={oversized || Boolean(error)} /></label>
      <p className="secret-size" id="secret-size">{oversized ? `Too large by about ${Math.ceil((secretPayloadBytes(secret) - MAX_SECRET_PAYLOAD_BYTES) / 1024)} KB` : `${secretPayloadBytes(secret).toLocaleString("en")} of ${MAX_SECRET_PAYLOAD_BYTES.toLocaleString("en")} encrypted bytes`}</p>
      <div className="secret-controls"><label className="secret-ttl" htmlFor="secret-ttl"><span>Expires after</span><select id="secret-ttl" value={ttl} onChange={(event) => { const value = Number(event.target.value); if (isSecretTtl(value)) setTtl(value); }}>{SECRET_TTLS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><button className="button primary" type="submit" disabled={busy}>{busy ? "Encrypting..." : "Create one-time link"}</button></div>
      {error && <p className="secret-error" id="secret-error" role="alert">{error}</p>}
      <p className="secret-note">Encryption happens in this browser. Only the ciphertext is uploaded, and the key stays in the link fragment.</p>
    </section>
  </form>;
}
