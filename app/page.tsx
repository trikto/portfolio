"use client";

import { useState } from "react";

const projects = [
  { name: "OpenShift Platform Engineering", environment: "PRODUCTION", stack: "OpenShift · Ceph · Velero · Ansible", detail: "Built resilient cluster environments, backup paths, storage, and operational guardrails for global client workloads.", signal: "Platform" },
  { name: "Homelab / gajan.dev", environment: "LAB", stack: "GKE · GitLab CI · Prometheus · Grafana", detail: "A personal learning platform for running Kubernetes workloads, observability, and cloud delivery experiments.", signal: "Observability" },
  { name: "Zelvo", environment: "LIVE", stack: "Docker · GCP · NeonDB · TypeScript", detail: "Receipt-aware expense tracking application deployed with a practical cloud delivery stack.", signal: "Product" },
];

const cases = [
  { title: "Major-version release safety", context: "Production systems required controlled major-version upgrades without losing operational confidence.", response: "Prepared impact analysis, testing steps, release procedures, and documentation before coordinating rollout work.", tools: "Release management · Linux · Documentation", outcome: "A repeatable, reviewable path for production change." },
  { title: "Automation for patching and migrations", context: "Routine maintenance work created long manual execution paths.", response: "Implemented CI/CD workflows and Ansible automation for patching and migration activities.", tools: "Ansible · CI/CD · Bash", outcome: "Execution time reduced from hours to seconds." },
  { title: "OpenShift platform delivery", context: "Internal and client environments needed practical cluster provisioning and resource planning.", response: "Delivered single-node, multi-node, on-premises, and K3s/OpenShift proof-of-concept environments.", tools: "OpenShift · Kubernetes · VMware", outcome: "Validated platform modules and modernization approaches before rollout." },
  { title: "Observability from the cluster out", context: "Teams needed quicker visibility into service and infrastructure health.", response: "Configured Prometheus, Grafana, exporters, automated health checks, log management, and image-pruning scripts.", tools: "Prometheus · Grafana · Python · Bash", outcome: "A clearer operational signal for systems and data services." },
  { title: "Backup and recovery design", context: "Cluster, namespace, and database workloads required durable recovery procedures.", response: "Automated backups and formed disaster-recovery strategies across clusters and databases.", tools: "Velero · MinIO · MySQL · YugabyteDB", outcome: "Recovery paths documented alongside day-to-day operations." },
  { title: "Network and access hardening", context: "Distributed systems and telco workloads needed secure, reliable access boundaries.", response: "Managed network policies, routes, DNS, HAProxy, and access configuration across OpenShift and product environments.", tools: "NetworkPolicy · HAProxy · DNS · RHEL", outcome: "Stronger access control and clearer service connectivity." },
];

const skills = ["Kubernetes", "OpenShift", "Docker", "GitOps", "CI/CD", "Ansible", "Prometheus", "Grafana", "AWS", "GCP", "Linux", "Python", "Bash", "Ceph", "Velero"];

function FlowField() {
  return <div className="flow-field" aria-hidden="true"><span /><span /><span /><i /><i /></div>;
}

export default function Home() {
  const [resumeMessage, setResumeMessage] = useState(false);

  return <main className="site">
    <FlowField />
    <div className="utility"><span className="pulse" /> AVAILABLE FOR DEVOPS & SYSTEMS ENGINEERING <b>·</b> REMOTE / HYBRID <b>·</b> COLOMBO / KANDY</div>
    <header className="nav">
      <nav aria-label="Primary navigation"><a href="#work">Work</a><a href="#cases">Case studies</a><a href="#about">Experience</a><a href="#writing">Writing</a></nav>
      <div className="header-actions"><a className="linkedin-link" href="http://www.linkedin.com/in/gajanrajah" target="_blank" rel="noreferrer">LinkedIn <span>↗</span></a><a className="contact-link" href="mailto:gajanrajah@protonmail.com">Contact <span>↗</span></a></div>
    </header>

    <section id="top" className="hero">
      <div className="hero-copy"><p className="eyebrow">DEVOPS / CLOUD ENGINEER <span>01—26</span></p><h1>Systems, made <em>legible.</em></h1><p className="lede">Gajan Rajah designs, automates, and operates cloud platforms—from resilient OpenShift environments to calmer, more observable delivery workflows.</p><div className="hero-actions"><a className="button primary" href="#work">Explore selected work <span>↓</span></a><button className="button ghost" onClick={() => setResumeMessage(true)}>Resume <span>↗</span></button></div>{resumeMessage && <p className="resume-note">Resume available on request. <a href="mailto:gajanrajah@protonmail.com?subject=Resume%20request">Email Gajan</a>.</p>}</div>
      <div className="hero-system"><div className="system-title"><span className="status"><i /> OPERATIONS OVERVIEW</span><span>UTC+05:30</span></div><div className="cloud-board"><div className="cloud-metric"><small>OPERATING MODE</small><strong>calm</strong><span>guardrails in place</span></div><div className="cloud-metric"><small>FOCUS</small><strong>ready</strong><span>delivery · recovery · clarity</span></div><div className="cloud-lanes"><div><i /><code>delivery-path</code><span>verified</span></div><div><i /><code>platform-state</code><span>healthy</span></div><div><i /><code>recovery-path</code><span>prepared</span></div></div></div></div>
    </section>

    <section id="work" className="section projects"><div className="section-heading"><p className="eyebrow">SELECTED DEPLOYMENTS</p><h2>Work that holds up<br />when it matters.</h2></div><div className="project-grid">{projects.map((project, index) => <article className="project-card" key={project.name}><div className="card-top"><span>{String(index + 1).padStart(2,"0")}</span><span className="status"><i /> {project.environment}</span></div><h3>{project.name}</h3><p>{project.detail}</p><footer><span>{project.signal}</span><code>{project.stack}</code></footer></article>)}</div></section>

    <section id="cases" className="section case-section"><div className="section-heading"><p className="eyebrow">PRODUCTION TROUBLESHOOTING</p><h2>Prepared beats<br />heroic.</h2></div><div className="case-panel" tabIndex={0} aria-label="Scrollable production troubleshooting case studies"><div className="case-panel-intro"><p className="eyebrow">FIELD RECORDS</p><h3>Operational decisions, captured in context.</h3><p>Scroll through CV-derived examples of reliability, recovery, automation, and platform work.</p><span className="scroll-cue">SCROLL TO EXPLORE ↓</span></div><div className="case-list">{cases.map((item, index) => <article key={item.title}><span>0{index + 1}</span><div><h3>{item.title}</h3><dl><div><dt>Context</dt><dd>{item.context}</dd></div><div><dt>Response</dt><dd>{item.response}</dd></div><div><dt>Tools</dt><dd>{item.tools}</dd></div><div><dt>Outcome</dt><dd>{item.outcome}</dd></div></dl></div></article>)}</div></div></section>

    <section id="about" className="section experience"><div><p className="eyebrow">EXPERIENCE</p><h2>Four years of<br />systems thinking.</h2></div><div className="timeline"><article><span>2026 — NOW</span><h3>DevOps / Systems Engineer</h3><p>hSenid Mobile Solutions</p></article><article><span>2024 — 2026</span><h3>Associate DevOps / Cloud Engineer</h3><p>hSenid Mobile Solutions</p></article><article><span>2021 — 2024</span><h3>DevOps & Backend Engineering</h3><p>hSenid Mobile Solutions · appiGo · IntendAble</p></article></div></section>

    <section className="section capability-grid"><article><p className="eyebrow">OPERATING STACK</p><div className="skill-cloud">{skills.map((skill) => <span key={skill}>{skill}</span>)}</div></article><article><p className="eyebrow">CERTIFICATIONS</p><ul><li>Red Hat Certified OpenShift Administrator <span>2025</span></li><li>Red Hat System Administration I <span>2025</span></li><li>Containers & Kubernetes Essentials <span>2024</span></li><li>AWS Educate: Cloud 101 <span>2023</span></li></ul></article></section>

    <section id="writing" className="section writing"><div><p className="eyebrow">TECHNICAL WRITING</p><h2>Make operations<br />repeatable.</h2></div><div className="writing-card"><span>FIELD NOTE / 001</span><h3>Operational docs that shorten the path from alert to action.</h3><p>Procedure writing, knowledge transfer, deployment notes, and impact analysis are part of the system—not an afterthought.</p><a href="mailto:gajanrajah@protonmail.com?subject=Technical%20writing">Request a writing sample →</a></div></section>

    <footer className="footer"><div><p className="eyebrow">NEXT DEPLOYMENT</p><h2>Let’s make your<br /><em>platform calmer.</em></h2></div><a className="button primary" href="mailto:gajanrajah@protonmail.com">Start a conversation <span>↗</span></a><small>© 2026 Gajan Rajah · Built as a private portfolio prototype</small></footer>
  </main>;
}
