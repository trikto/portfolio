import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "../../components/site-header";
import { pageMetadata } from "@/lib/site";
import { FileDownload } from "./file-download";

export const metadata: Metadata = pageMetadata({ title: "Download with EncryFy", description: "Open an EncryFy encrypted file link. The file is decrypted in your browser using the key in the URL fragment.", path: "/files", noIndex: true });

export default async function FileDownloadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main id="site-top" className="site concept-cloud secret-page">
      <div className="utility"><span className="pulse" /> DEVOPS UTILITIES</div>
      <SiteHeader />
      <section className="secret-hero" aria-labelledby="file-download-title">
        <p className="eyebrow">DEVOPS UTILITIES / <Link href="/files">ENCRYFY</Link></p>
        <img className="encryfy-logo encryfy-logo-compact" src="/files/encryfy.png" alt="EncryFy" width={240} height={240} />
        <h1 id="file-download-title">Download File</h1>
        <p>This link points to an encrypted file. Nothing is retrieved until you ask for it. The stored copy is not deleted on download.</p>
      </section>

      <FileDownload id={id} />

      <footer className="secret-footer">Reusable encrypted download · <Link href="/files">Share a file</Link></footer>
    </main>
  );
}
