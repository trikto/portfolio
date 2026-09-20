import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "../components/site-header";
import { absoluteUrl, pageMetadata } from "@/lib/site";
import { SecretComposer } from "./secret-composer";

const title = "One-Time Secret Sharing – Encrypted Self-Destructing Links";
const description = "Share a password, token, or private note through a self-destructing link. Your browser encrypts the secret with AES-GCM before anything is uploaded, the decryption key stays in the URL fragment, and the link can be opened exactly once.";

export const metadata: Metadata = pageMetadata({ title, description, path: "/clipboard" });

const exposure = [
  ["The plaintext secret", "Never", "It is encrypted in this browser before any request is made."],
  ["The encryption key", "Never", "It is placed after the # in the link, and browsers do not send fragments to servers."],
  ["The ciphertext", "Yes", "Stored as opaque bytes the service has no way to read."],
  ["The chosen lifetime", "Yes", "Needed so the record can expire on its own."],
  ["The secret identifier", "Yes", "A random handle used to look the record up once."],
];

const faqs = [
  {
    question: "What is a one-time secret link?",
    answer: "It is a URL that reveals a secret to the first person who opens it and then destroys the stored copy. It suits credentials that must reach one person and should not sit in a chat history or inbox afterwards.",
  },
  {
    question: "Can the server read my secret?",
    answer: "No. The secret is encrypted in your browser with AES-GCM before the request is sent, and the key is never transmitted. The service holds ciphertext it has no key for.",
  },
  {
    question: "Why is the decryption key after the # in the link?",
    answer: "Everything after the # is the URL fragment. Browsers keep fragments local and never place them in the HTTP request, so the key can travel inside the link without ever reaching the service that stores the ciphertext.",
  },
  {
    question: "What happens if two people open the same link?",
    answer: "Only the first reader gets the secret. Retrieval and deletion happen as one atomic operation, so exactly one request can win; everyone after that sees the same not-found response as an expired or never-existing link.",
  },
  {
    question: "How long does a secret last if nobody opens it?",
    answer: "You choose 1 hour, 24 hours, or 7 days. When that time passes the record is removed whether or not it was read, so an unopened link simply stops working.",
  },
  {
    question: "Why did my link stop working before the recipient opened it?",
    answer: "Something opened it first. Link previews, mail security scanners, and archiving tools all follow URLs. The reveal page never retrieves a secret automatically, so merely loading the link does not consume it, but any tool that goes on to perform the reveal request would.",
  },
  {
    question: "What happens if the link is truncated when it is pasted?",
    answer: "The fragment is the key, so a link cut short after the # is unrecoverable. There is no copy of the key anywhere else. Create a new secret and send the complete link.",
  },
  {
    question: "Where is the ciphertext stored?",
    answer: "On a Contabo VPS running a self-hosted K3s cluster at api.gajan.dev, with Cloudflare DNS and proxy in front and TLS terminated at Traefik via cert-manager. Ciphertext sits in a memory-only Valkey store, is never written to disk, and disappears on read, on expiry, or if the store restarts.",
  },
  {
    question: "Is this a replacement for a password manager?",
    answer: "No. It is a transport for handing a credential to one person once. Long-lived credentials belong in a password manager or a secrets manager, and anything shared this way should still be rotated afterwards.",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "One-Time Secret Sharing",
      description,
      applicationCategory: "SecurityApplication",
      operatingSystem: "Any",
      url: absoluteUrl("/clipboard"),
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

export default function SecretPage() {
  return (
    <main id="site-top" className="site concept-cloud secret-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }} />
      <SiteHeader />
      <section className="secret-hero" aria-labelledby="secret-title">
        <p className="eyebrow">DEVOPS UTILITIES / <Link href="/tools">ALL TOOLS</Link></p>
        <h1 id="secret-title">One-Time Secret Sharing</h1>
        <p>Send a password, API token, or private note as a self-destructing link. The secret is encrypted in your browser, only the ciphertext is uploaded, and the link works exactly once before the stored copy is deleted.</p>
      </section>

      <SecretComposer />

      <div className="secret-guide">
        <section className="secret-section" aria-labelledby="how-it-works">
          <p className="eyebrow">ZERO-KNOWLEDGE DESIGN</p>
          <h2 id="how-it-works">How the Encryption Works</h2>
          <p>When you create a link, this page generates a fresh 256-bit AES-GCM key and a random 12-byte initialization vector, encrypts your text with the Web Crypto API, and joins the initialization vector and ciphertext into one base64url string. That string is the only thing uploaded. The key is exported separately and appended to the link after a <code>#</code>, so the finished URL carries the key while the request that created it did not.</p>
          <p>Nothing is reused between secrets. Every link has its own key and its own initialization vector, so recovering one secret tells an attacker nothing about any other.</p>
        </section>

        <section className="secret-section" aria-labelledby="what-the-server-sees">
          <p className="eyebrow">DATA BOUNDARY</p>
          <h2 id="what-the-server-sees">What the Service Receives</h2>
          <p>The distinction that matters is not a promise about behaviour, it is what the service is structurally capable of holding. Without the key, the stored bytes are not decryptable by the operator, by anyone who compromises the store, or by anyone served a subpoena for it.</p>
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
            <p>Everything after the <code>#</code> in a URL is the fragment. It is a client-side addressing feature, and browsers strip it before building the HTTP request, so it never appears in a request line, a proxy log, an access log, or a referrer header. Putting the key there is what makes the key travel with the link while staying invisible to the server.</p>
            <p>It is also the reason a truncated link is fatal. If a chat client, mail scanner, or copy-and-paste drops the part after the <code>#</code>, the ciphertext still exists but no key does, and no one can recover it.</p>
          </section>

          <section className="secret-section" aria-labelledby="where-it-runs">
            <p className="eyebrow">SELF-HOSTED BACKEND</p>
            <h2 id="where-it-runs">Where the Ciphertext Lives</h2>
            <p>The storage service runs on Contabo K3s rather than a managed provider. DNS for <code>api.gajan.dev</code> is proxied through Cloudflare, TLS terminates at Traefik with cert-manager, and records live in memory-only Valkey. Ciphertext is never written to disk, so there is no file, snapshot, or backup to recover it from later.</p>
            <p>That is a deliberate trade. It means an unread secret does not survive a restart of the store, and it means occasional downtime on self-hosted hardware is normal. When the service is unreachable, nothing is lost that was ever readable.</p>
          </section>
        </div>

        <section className="secret-section" aria-labelledby="single-read">
          <p className="eyebrow">EXACTLY ONCE</p>
          <h2 id="single-read">One Reader Wins, Every Time</h2>
          <p>Retrieval is a single atomic operation: the record is fetched and removed together, not read first and deleted afterwards. If two requests arrive at the same instant, one of them returns the ciphertext and the other returns the same not-found response as a link that never existed.</p>
          <p>Not-found is deliberately indistinguishable across three cases: the secret never existed, it was already opened, or it expired. Distinguishing them would let someone probe which identifiers were real.</p>
          <p>This page also never fetches a secret on load. The reveal page requires an explicit click, so a link preview, a security scanner, or a browser prefetching the URL cannot consume the secret before the recipient reads it.</p>
        </section>

        <section className="secret-section" aria-labelledby="expiry">
          <p className="eyebrow">LIFETIME</p>
          <h2 id="expiry">Expiry Behaviour</h2>
          <p>Every secret carries a lifetime chosen at creation: 1 hour, 24 hours, or 7 days. The record is removed when that lifetime elapses even if nobody opened it, so an abandoned link becomes a dead link rather than a credential sitting in a queue indefinitely.</p>
          <p>Choose the shortest window the recipient can realistically work with. A one-hour link that is resent is safer than a seven-day link that sits unopened in an inbox over a weekend.</p>
        </section>

        <section className="secret-section" aria-labelledby="limits">
          <p className="eyebrow">HONEST LIMITS</p>
          <h2 id="limits">What This Does Not Protect Against</h2>
          <p>Encryption in the browser removes one specific risk, which is the storage service reading your secret. It does not remove the rest:</p>
          <ul className="secret-guide-list">
            <li><strong>A compromised endpoint.</strong> If either machine has malware, a keylogger, or a hostile browser extension, the plaintext is readable at the moment it is typed or revealed. Client-side encryption cannot help there.</li>
            <li><strong>Whoever holds the link holds the secret.</strong> There is no identity check. The link is the credential, so anyone who obtains it before the intended recipient can open it, and you will only discover this because the recipient reports a dead link.</li>
            <li><strong>The recipient after they read it.</strong> They can screenshot it, paste it somewhere permanent, or leave it on screen. Destroying the stored copy does nothing about copies made afterwards.</li>
            <li><strong>Shoulder surfing and casual exposure.</strong> A revealed secret sits in a browser window like any other text, and a link on a shared screen or over someone&apos;s shoulder is enough.</li>
            <li><strong>The channel you use to send the link.</strong> Sending it over the same compromised channel you were trying to avoid gains you very little.</li>
            <li><strong>Availability.</strong> This is homelab infrastructure. Treat it as a convenience, not as something to depend on during an incident.</li>
          </ul>
          <p>Used well, this is a way to hand one credential to one person and have the copy disappear afterwards. Rotate anything you share this way once it has served its purpose.</p>
        </section>

        <section className="secret-section" aria-labelledby="secret-faq">
          <p className="eyebrow">FREQUENTLY ASKED QUESTIONS</p>
          <h2 id="secret-faq">One-Time Secret FAQ</h2>
          <div className="secret-faq-list">
            {faqs.map(({ question, answer }) => <article key={question}><h3>{question}</h3><p>{answer}</p></article>)}
          </div>
        </section>
      </div>

      <footer className="secret-footer">Encrypted in your browser, stored as ciphertext, deleted on first read · <Link href="/tools">More DevOps tools</Link></footer>
    </main>
  );
}
