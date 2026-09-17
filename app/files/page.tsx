import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "../components/site-header";
import { absoluteUrl, pageMetadata } from "@/lib/site";
import { FileComposer } from "./file-composer";

const title = "EncryFy – Encrypted File Sharing";
const description = "Share a file of up to 100 MB through an encrypted link. Your browser encrypts the file with AES-GCM before anything is uploaded, the decryption key stays in the URL fragment, and anyone with the full link can download it.";

export const metadata: Metadata = pageMetadata({ title, description, path: "/files" });

const exposure = [
  ["The file bytes and name", "Never", "They are encrypted in this browser before any request is made."],
  ["The encryption key", "Never", "It is placed after the # in the link, and browsers do not send fragments to servers."],
  ["The ciphertext", "Yes", "Stored as opaque bytes on a volume-mounted path the service has no key for."],
  ["The file identifier", "Yes", "A random handle used to look the record up."],
];

const faqs = [
  {
    question: "What is an encrypted file link?",
    answer: "It is a URL that lets the holder download a file that was encrypted in the sender's browser. The stored copy is ciphertext only. The decryption key sits after the # and never reaches the storage service.",
  },
  {
    question: "Can the server read my file?",
    answer: "No. The file name and bytes are encrypted in your browser with AES-GCM before upload, and the key is never transmitted. The service holds ciphertext it has no key for.",
  },
  {
    question: "Why is the decryption key after the # in the link?",
    answer: "Everything after the # is the URL fragment. Browsers keep fragments local and never place them in the HTTP request, so the key can travel inside the link without ever reaching the service that stores the ciphertext.",
  },
  {
    question: "Is this a one-time download?",
    answer: "No. Unlike one-time secret sharing, this link is reusable. Anyone who has the complete URL can download the file until a later retention policy removes it.",
  },
  {
    question: "Who pays to share a file?",
    answer: "The sender pays a one-time Dialog, Hutch, or Airtel mobile charge through Ideamart CaaS before the ciphertext is stored. The charge runs on the Contabo API, not in this browser. Anyone with the full link can still download for free.",
  },
  {
    question: "How large can the file be?",
    answer: "One file of up to 100 MB. Larger files are rejected in the browser before encryption starts.",
  },
  {
    question: "Where will the ciphertext live?",
    answer: "On a volume-mounted path inside the file-sharing container on Contabo K3s, as opaque encrypted bytes. The operator cannot read filenames or contents without the key in the URL fragment.",
  },
  {
    question: "What happens if the link is truncated when it is pasted?",
    answer: "The fragment is the key, so a link cut short after the # is unrecoverable. There is no copy of the key anywhere else. Create a new share and send the complete link.",
  },
  {
    question: "Is this a replacement for a file host or backup?",
    answer: "No. It is a way to hand one encrypted file to people who have the link. It is not a drive, a sync client, or an archive.",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "EncryFy",
      description,
      applicationCategory: "SecurityApplication",
      operatingSystem: "Any",
      url: absoluteUrl("/files"),
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    },
  ],
};

export default function FilesPage() {
  return (
    <main id="site-top" className="site concept-cloud secret-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }} />
      <div className="utility"><span className="pulse" /> DEVOPS UTILITIES</div>
      <SiteHeader />
      <section className="secret-hero" aria-labelledby="files-title">
        <p className="eyebrow">DEVOPS UTILITIES / <Link href="/tools">ALL TOOLS</Link></p>
        <img className="encryfy-logo" src="/files/encryfy.png" alt="EncryFy" width={320} height={320} />
        <h1 id="files-title">EncryFy</h1>
        <p>Send a file of up to 100 MB as an encrypted link. The file is encrypted in your browser, only ciphertext is stored, and the decryption key stays in the URL fragment.</p>
      </section>

      <FileComposer />

      <div className="secret-guide">
        <section className="secret-section" aria-labelledby="how-it-works">
          <p className="eyebrow">ZERO-KNOWLEDGE DESIGN</p>
          <h2 id="how-it-works">How the Encryption Works</h2>
          <p>When you create a link, this page generates a fresh 256-bit AES-GCM key and a random 12-byte initialization vector, packs the file name and bytes into a binary envelope, and encrypts that envelope with the Web Crypto API. The key is exported separately and appended to the link after a <code>#</code>, so the finished URL carries the key while the request that stores the ciphertext does not.</p>
          <p>Nothing is reused between files. Every link has its own key and its own initialization vector, so recovering one file tells an attacker nothing about any other.</p>
        </section>

        <section className="secret-section" aria-labelledby="what-the-server-sees">
          <p className="eyebrow">DATA BOUNDARY</p>
          <h2 id="what-the-server-sees">What the Service Receives</h2>
          <p>Without the key, stored bytes are not decryptable by the operator, by anyone who compromises the volume, or by anyone served a copy of the ciphertext.</p>
          <div className="secret-table-wrap">
            <table>
              <caption>What leaves the browser and what does not</caption>
              <thead><tr><th scope="col">Value</th><th scope="col">Sent to the service</th><th scope="col">Reason</th></tr></thead>
              <tbody>{exposure.map(([value, sent, reason]) => <tr key={value}><th scope="row">{value}</th><td>{sent}</td><td>{reason}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <div className="secret-guide-columns">
          <section className="secret-section" aria-labelledby="url-fragment">
            <p className="eyebrow">WHY THE HASH MATTERS</p>
            <h2 id="url-fragment">Why the Key Sits After the #</h2>
            <p>Everything after the <code>#</code> in a URL is the fragment. It is a client-side addressing feature, and browsers strip it before building the HTTP request, so it never appears in a request line, a proxy log, an access log, or a referrer header.</p>
            <p>If a chat client or copy-and-paste drops the part after the <code>#</code>, the ciphertext may still exist later but no key does, and no one can recover the file.</p>
          </section>

          <section className="secret-section" aria-labelledby="where-it-runs">
            <p className="eyebrow">INTENDED STORAGE</p>
            <h2 id="where-it-runs">Where Ciphertext Will Live</h2>
            <p>Encrypted files sit on a local-path volume mounted into the file-sharing container on Contabo K3s at <code>api.gajan.dev</code>. That is a durable store for opaque bytes, not a place the operator can read filenames or contents.</p>
            <p>There is no expiry yet. An abandoned link keeps working until the ciphertext is deleted from the volume by hand.</p>
          </section>
        </div>

        <section className="secret-section" aria-labelledby="limits">
          <p className="eyebrow">SIZE AND HONEST LIMITS</p>
          <h2 id="limits">What This Does Not Protect Against</h2>
          <p>The maximum file size is 100 MB. Encryption in the browser removes one specific risk, which is the storage service reading your file. It does not remove the rest:</p>
          <ul className="secret-guide-list">
            <li><strong>A compromised endpoint.</strong> If either machine has malware or a hostile browser extension, the plaintext is readable at the moment it is chosen or downloaded.</li>
            <li><strong>Whoever holds the link holds the file.</strong> There is no identity check. The link is the credential.</li>
            <li><strong>The recipient after they download it.</strong> They can copy, forward, or keep the decrypted file. Reusable links do not expire on first download.</li>
            <li><strong>The channel you use to send the link.</strong> Sending it over the same compromised channel you were trying to avoid gains you very little.</li>
            <li><strong>Availability.</strong> This is homelab infrastructure. Treat it as a convenience, not as something to depend on during an incident.</li>
          </ul>
        </section>

        <section className="secret-section" aria-labelledby="files-faq">
          <p className="eyebrow">FREQUENTLY ASKED QUESTIONS</p>
          <h2 id="files-faq">EncryFy FAQ</h2>
          <div className="secret-faq-list">
            {faqs.map(({ question, answer }) => <article key={question}><h3>{question}</h3><p>{answer}</p></article>)}
          </div>
        </section>
      </div>

      <footer className="secret-footer">Encrypted in your browser, stored as ciphertext, key in the fragment · <Link href="/tools">More DevOps tools</Link></footer>
    </main>
  );
}
