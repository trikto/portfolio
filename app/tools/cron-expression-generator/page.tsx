import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "../../components/site-header";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({ title: "Cron Expression Generator | Gajan.dev", description: "Cron expression generator in development from Gajan.dev.", path: "/tools/cron-expression-generator", keywords: ["cron expression generator", "cron schedule", "automation tools"], noIndex: true });

export default function CronExpressionGeneratorPage() {
  return <main className="site concept-cloud tool-placeholder"><div className="utility"><span className="pulse" /> DEVOPS UTILITIES</div><SiteHeader /><section><p className="eyebrow">CRON EXPRESSION GENERATOR</p><h1>Coming soon.</h1><p>The generator is being prepared. Return to the tools directory to explore available utilities.</p><Link className="button primary" href="/tools">Back to tools <span>←</span></Link></section></main>;
}
