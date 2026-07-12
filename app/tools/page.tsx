import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "../components/site-header";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Free DevOps Tools for Kubernetes and Automation | Gajan.dev",
  description: "Use free browser-based DevOps tools including a cron expression generator and Kubernetes YAML validator. No uploads or account required.",
  path: "/tools",
  keywords: ["free developer tools", "browser-based developer tools", "Kubernetes YAML validator", "cron expression generator", "developer utilities"],
});

const tools = [
  { title: "Cron Expression Generator", description: "Create cron expressions, understand existing schedules and preview upcoming execution times.", action: "Open Cron Generator", href: "/tools/cron-expression-generator", icon: "◷" },
  { title: "Kubernetes YAML Validator", description: "Validate Kubernetes manifests, detect configuration problems and review reliability and security warnings.", action: "Open YAML Validator", href: "/tools/kubernetes-yaml-validator", icon: "✓" },
];

export default function ToolsPage() {
  return <main className="site concept-cloud tools-page"><div className="utility"><span className="pulse" /> AVAILABLE FOR DEVOPS & SYSTEM ENGINEERING</div><SiteHeader /><section className="tools-hero" aria-labelledby="tools-title"><p className="eyebrow">DEVOPS UTILITIES</p><h1 id="tools-title">Free DevOps Tools</h1><p>Practical browser-based tools for Kubernetes, automation and infrastructure work. All processing happens locally in your browser.</p></section><section className="tools-grid" aria-label="Available tools">{tools.map((tool) => <Link className="tool-card" href={tool.href} key={tool.href}><span className="tool-icon" aria-hidden="true">{tool.icon}</span><h2>{tool.title}</h2><p>{tool.description}</p><span className="tool-action">{tool.action} <b aria-hidden="true">→</b></span></Link>)}</section><p className="privacy-note">Your data stays in your browser. These tools do not upload or store your input.</p></main>;
}
