import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "../components/site-header";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Free DevOps Tools for Kubernetes and Automation | Gajan.dev",
  description: "Use free browser-based DevOps tools including a cron expression generator, a Kubernetes YAML validator, and one-time encrypted secret sharing. No account required.",
  path: "/tools",
});

const tools = [
  { title: "Cron Editor & Crontab Generator", description: "Build and validate cron expressions with human-readable explanations and upcoming run previews.", action: "Cron Editor & Crontab Generator", href: "/cron", icon: "◷" },
  { title: "YAML Validator and Formatter", description: "Validate, format, and troubleshoot YAML syntax directly in the browser.", action: "YAML Validator and Formatter", href: "/yaml", icon: "✓" },
  { title: "One-Time Secret Sharing", description: "Share a password or token as a self-destructing link. Encrypted in your browser, readable exactly once.", action: "One-Time Secret Sharing", href: "/secret", icon: "⊘" },
];

export default function ToolsPage() {
  return <main className="site concept-cloud tools-page"><div className="utility"><span className="pulse" /> AVAILABLE FOR DEVOPS & SYSTEM ENGINEERING</div><SiteHeader /><section className="tools-hero" aria-labelledby="tools-title"><p className="eyebrow">DEVOPS UTILITIES</p><h1 id="tools-title">Free DevOps Tools</h1><p>Practical browser-based tools for Kubernetes, automation and infrastructure work. Nothing here requires an account.</p></section><section className="tools-grid" aria-label="Available tools">{tools.map((tool) => <Link className="tool-card" href={tool.href} key={tool.href}><span className="tool-icon" aria-hidden="true">{tool.icon}</span><h2>{tool.title}</h2><p>{tool.description}</p><span className="tool-action">{tool.action} <b aria-hidden="true">→</b></span></Link>)}</section><p className="privacy-note">The cron editor and YAML validator run entirely in your browser and upload nothing. One-time secret sharing is the exception: it encrypts your text in the browser and uploads only the ciphertext, and the decryption key stays in the link fragment rather than being sent to the server.</p></main>;
}
