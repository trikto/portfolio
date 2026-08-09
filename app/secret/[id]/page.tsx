import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "../../components/site-header";
import { pageMetadata } from "@/lib/site";
import { SecretReveal } from "./secret-reveal";

export const metadata: Metadata = pageMetadata({ title: "Reveal a One-Time Secret", description: "Open a one-time encrypted secret link. The stored copy is deleted the moment it is read.", path: "/secret", noIndex: true });

export default async function SecretRevealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main id="site-top" className="site concept-cloud secret-page">
      <div className="utility"><span className="pulse" /> DEVOPS UTILITIES</div>
      <SiteHeader />
      <section className="secret-hero" aria-labelledby="secret-reveal-title">
        <p className="eyebrow">DEVOPS UTILITIES / <Link href="/secret">ONE-TIME SECRETS</Link></p>
        <h1 id="secret-reveal-title">Reveal Secret</h1>
        <p>This link points to a single encrypted secret. Nothing is retrieved until you ask for it, and the stored copy is deleted as it is handed over.</p>
      </section>

      <SecretReveal id={id} />

      <footer className="secret-footer">One read, then the stored copy is gone · <Link href="/secret">Create your own one-time secret</Link></footer>
    </main>
  );
}
