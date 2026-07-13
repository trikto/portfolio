import type { Metadata } from "next";
import { SiteHeader } from "../components/site-header";
import { absoluteUrl, pageMetadata } from "@/lib/site";
import { CronEditor } from "./cron-editor";

const description = "Create, validate, and explain Linux cron expressions. Preview upcoming execution times and learn cron syntax directly in your browser.";
export const metadata: Metadata = pageMetadata({ title: "Cron Expression Editor and Validator | gajan.dev", description, path: "/cron" });
const structuredData = { "@context": "https://schema.org", "@type": "WebApplication", name: "Cron Expression Editor and Validator", url: absoluteUrl("/cron"), description, applicationCategory: "DeveloperApplication", operatingSystem: "Any" };

export default function CronPage() { return <main className="site concept-cloud cron-page"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /><div className="utility"><span className="pulse" /> DEVOPS UTILITIES</div><SiteHeader /><section className="cron-hero"><p className="eyebrow">DEVOPS UTILITIES / <a href="/tools">ALL TOOLS</a></p><h1>Cron Expression Editor</h1><p>Build, validate, and understand Linux cron schedules directly in your browser.</p></section><CronEditor /><footer className="cron-footer">Built for browser-only schedule checks · <a href="/tools">More DevOps tools</a></footer></main>; }
