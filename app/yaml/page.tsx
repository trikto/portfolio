import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "../components/site-header";
import { absoluteUrl, pageMetadata } from "@/lib/site";

const description = "Validate, format, and troubleshoot YAML syntax directly in your browser with clear error messages.";

export const metadata: Metadata = pageMetadata({ title: "YAML Validator & Formatter | Gajan", description, path: "/yaml" });

const structuredData = { "@context": "https://schema.org", "@type": "WebApplication", name: "YAML Validator and Formatter", url: absoluteUrl("/yaml"), description, applicationCategory: "DeveloperApplication", operatingSystem: "Any" };

export default function YamlPage() {
  return <main className="site concept-cloud tool-placeholder"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /><div className="utility"><span className="pulse" /> DEVOPS UTILITIES</div><SiteHeader /><section><p className="eyebrow">YAML SYNTAX TOOL</p><h1>YAML Validator</h1><p>Use a YAML syntax checker and YAML formatter to troubleshoot configuration, Kubernetes YAML validator inputs, and YAML parser errors.</p><Link className="button primary" href="/tools">Back to tools <span>←</span></Link></section></main>;
}
