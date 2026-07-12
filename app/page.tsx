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

function ArchitectureBackground() {
  return <div className="architecture-background" aria-hidden="true">
    <svg className="architecture-map architecture-desktop" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
      <g className="architecture-zone"><rect x="70" y="135" width="375" height="280" rx="18" /><text x="98" y="172">DELIVERY LAYER</text></g>
      <g className="architecture-zone"><rect x="505" y="135" width="550" height="280" rx="18" /><text x="533" y="172">COMPUTE LAYER</text></g>
      <g className="architecture-zone"><rect x="1100" y="135" width="410" height="280" rx="18" /><text x="1128" y="172">DATA LAYER</text></g>
      <g className="architecture-zone operations"><rect x="680" y="550" width="630" height="190" rx="18" /><text x="708" y="587">OPERATIONS LAYER</text></g>
      <g className="architecture-links"><path d="M245 280H325M410 280H555M680 280H760M680 280H870M680 280H980M815 330V468H1190M925 330V468H1320M1035 330V468H1435M1190 468V610M1320 468V610M1435 468V610" /><path className="recovery" d="M1435 330V500H1320V610" /><path className="metrics" d="M815 330V610M925 330V610M1035 330V610" /></g>
      <g className="architecture-node"><rect x="125" y="245" width="120" height="70" rx="8" /><text x="185" y="274">GIT +</text><text x="185" y="293">CI/CD</text></g>
      <g className="architecture-node"><rect x="325" y="245" width="120" height="70" rx="8" /><text x="385" y="274">DEPLOY</text><text x="385" y="293">CONTROL</text></g>
      <g className="architecture-node edge"><rect x="555" y="245" width="125" height="70" rx="8" /><text x="617" y="274">EDGE /</text><text x="617" y="293">INGRESS</text></g>
      <g className="architecture-node"><rect x="760" y="245" width="110" height="70" rx="8" /><text x="815" y="283">APP A</text></g>
      <g className="architecture-node"><rect x="870" y="245" width="110" height="70" rx="8" /><text x="925" y="283">APP B</text></g>
      <g className="architecture-node"><rect x="980" y="245" width="110" height="70" rx="8" /><text x="1035" y="274">ASYNC</text><text x="1035" y="293">WORKER</text></g>
      <g className="architecture-node data"><rect x="1130" y="245" width="120" height="70" rx="8" /><text x="1190" y="283">POSTGRES</text></g>
      <g className="architecture-node data"><rect x="1260" y="245" width="120" height="70" rx="8" /><text x="1320" y="283">MONGODB</text></g>
      <g className="architecture-node recovery-node"><rect x="1380" y="245" width="110" height="70" rx="8" /><text x="1435" y="274">BACKUP</text><text x="1435" y="293">STORE</text></g>
      <g className="architecture-node ops"><rect x="760" y="610" width="110" height="62" rx="8" /><text x="815" y="647">METRICS</text></g><g className="architecture-node ops"><rect x="870" y="610" width="110" height="62" rx="8" /><text x="925" y="647">LOGS</text></g><g className="architecture-node ops"><rect x="980" y="610" width="110" height="62" rx="8" /><text x="1035" y="647">ALERTS</text></g><g className="architecture-node ops"><rect x="1135" y="610" width="110" height="62" rx="8" /><text x="1190" y="647">RECOVERY</text></g><g className="architecture-node ops"><rect x="1265" y="610" width="110" height="62" rx="8" /><text x="1320" y="647">ARCHIVE</text></g>
      <circle className="flow-pulse delivery-pulse" r="5"><animateMotion dur="6s" repeatCount="indefinite" path="M185 280H385H617" /></circle><circle className="flow-pulse request-pulse" r="5"><animateMotion dur="7s" begin="-2s" repeatCount="indefinite" path="M617 280H815H925H1035" /></circle><circle className="flow-pulse recovery-pulse" r="5"><animateMotion dur="8s" begin="-4s" repeatCount="indefinite" path="M1435 280V500H1320V640" /></circle>
    </svg>
    <svg className="architecture-map architecture-mobile" viewBox="0 0 390 920" preserveAspectRatio="xMidYMid slice">
      <g className="architecture-zone"><rect x="45" y="40" width="300" height="190" rx="16" /><text x="68" y="68">DELIVERY</text></g><g className="architecture-zone"><rect x="45" y="280" width="300" height="260" rx="16" /><text x="68" y="308">COMPUTE</text></g><g className="architecture-zone"><rect x="45" y="590" width="300" height="230" rx="16" /><text x="68" y="618">DATA + OPS</text></g>
      <g className="architecture-links"><path d="M195 130V175M195 175V340M115 390H195M195 390H275M115 440V655M195 440V655M275 440V655M115 705H195M195 705H275" /><path className="recovery" d="M275 440V735H195" /></g>
      <g className="architecture-node"><rect x="135" y="95" width="120" height="58" rx="8" /><text x="195" y="130">GIT + CI/CD</text></g><g className="architecture-node edge"><rect x="135" y="175" width="120" height="58" rx="8" /><text x="195" y="210">EDGE</text></g><g className="architecture-node"><rect x="60" y="360" width="110" height="58" rx="8" /><text x="115" y="395">APP A</text></g><g className="architecture-node"><rect x="140" y="360" width="110" height="58" rx="8" /><text x="195" y="395">APP B</text></g><g className="architecture-node"><rect x="220" y="360" width="110" height="58" rx="8" /><text x="275" y="395">WORKER</text></g><g className="architecture-node data"><rect x="60" y="675" width="110" height="58" rx="8" /><text x="115" y="710">POSTGRES</text></g><g className="architecture-node data"><rect x="140" y="675" width="110" height="58" rx="8" /><text x="195" y="710">MONGODB</text></g><g className="architecture-node recovery-node"><rect x="220" y="675" width="110" height="58" rx="8" /><text x="275" y="710">BACKUP</text></g><g className="architecture-node ops"><rect x="135" y="760" width="120" height="58" rx="8" /><text x="195" y="795">OBSERVABILITY</text></g>
      <circle className="flow-pulse delivery-pulse" r="4"><animateMotion dur="6s" repeatCount="indefinite" path="M195 124V204" /></circle><circle className="flow-pulse request-pulse" r="4"><animateMotion dur="7s" begin="-2s" repeatCount="indefinite" path="M195 204V390H275" /></circle><circle className="flow-pulse recovery-pulse" r="4"><animateMotion dur="8s" begin="-4s" repeatCount="indefinite" path="M275 390V704H195" /></circle>
    </svg>
  </div>;
}

export default function Home() {
  const [resumeMessage, setResumeMessage] = useState(false);

  return <main className="site">
    <ArchitectureBackground />
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
