"use client";

import { useState } from "react";

const projects = [
  { name: "OpenShift Platform Engineering", environment: "PRODUCTION", stack: "OpenShift · Ceph · Velero · Ansible", detail: "Built resilient cluster environments, backup paths, storage, and operational guardrails for global client workloads.", signal: "Platform" },
  { name: "Homelab / gajan.dev", environment: "LAB", stack: "GKE · GitLab CI · Prometheus · Grafana", detail: "A personal learning platform for running Kubernetes workloads, observability, and cloud delivery experiments.", signal: "Observability" },
  { name: "Zelvo", environment: "LIVE", stack: "Docker · GCP · NeonDB · TypeScript", detail: "Receipt-aware expense tracking application deployed with a practical cloud delivery stack.", signal: "Product" },
  { name: "NuBred", environment: "CLIENT", stack: "React · Node.js · Docker · NeonDB · Hetzner", detail: "Agriculture and plant variety management system delivered with a modern web and cloud stack.", signal: "Delivery" },
  { name: "NoteMate", environment: "BUILD", stack: "React Native · Spring Boot · AWS · Kubernetes", detail: "AI-powered note taking platform combining voice processing, cloud services, CI/CD, and observability.", signal: "Systems" },
  { name: "Accommodate", environment: "BUILD", stack: "HTML · CSS · JavaScript · PHP · MySQL", detail: "Accommodation discovery platform with payments and mapping integrations for students and professionals.", signal: "Web platform" },
];

const cases = [
  ["Release safety", "Coordinated production releases and major-version upgrades with test plans, impact analysis, and documented rollback thinking."],
  ["Fast recovery", "Automated patching and migration work with CI/CD and Ansible, reducing manual execution from hours to seconds."],
  ["Reliable platforms", "Implemented monitoring, health checks, backups, and disaster-recovery approaches across clusters and databases."],
  ["Cluster delivery", "Provisioned single-node, multi-node, on-premises, and K3s OpenShift environments for research, demonstrations, and client deployments."],
  ["Storage and migration", "Managed VMware cold and warm migrations, LVM, local storage, Ceph, Rook, NFS, PVC mapping, and network bonding."],
  ["Observability and health", "Built Prometheus and Grafana monitoring with Node, MySQL, and YugabyteDB exporters, automated health checks, log management, and image pruning."],
  ["Backup and recovery", "Automated cluster, database, and namespace backups with Velero and MinIO, then shaped disaster recovery procedures around those paths."],
  ["Security hardening", "Configured network policies, HAProxy, MITM servers, routes, DNS entries, ACLs, and security rules for safer platform access."],
];

const skills = ["Bash", "Linux", "RHEL", "MongoDB", "Python", "MySQL", "OpenShift Virtualization", "VMware", "Kubernetes", "Docker", "CI/CD Pipelines", "AWS", "GCP", "Rook", "Ceph", "Ansible", "Prometheus", "Grafana", "Cloudflare", "Helm", "Velero", "MinIO", "GitOps", "Web App Security", "OSINT", "Node.js", "Express", "Mongoose"];

const certifications = [
  ["Advent of Cyber 2025", "TryHackMe", "2025"],
  ["Red Hat System Administration I (RH124), Version 10.0", "Red Hat", "2025"],
  ["Red Hat Certified OpenShift Administrator", "Red Hat", "2025"],
  ["Back End Development and APIs", "freeCodeCamp", "2024"],
  ["Containers & Kubernetes Essentials", "IBM", "2024"],
  ["Advent of Cyber 2023", "TryHackMe", "2023"],
  ["SQL (Intermediate)", "HackerRank", "2023"],
  ["Python (Basic)", "HackerRank", "2023"],
  ["AWS Educate Introduction to Cloud 101", "AWS", "2023"],
  ["The Complete Web Developer", "Zero to Mastery Academy", "2021"],
  ["JavaScript Algorithms and Data Structures", "freeCodeCamp", "2020"],
  ["Responsive Web Design", "freeCodeCamp", "2020"],
  ["Diploma in Web Development", "ESOFT Metro Campus", "2019"],
  ["Diploma in Information Technology", "ESOFT Metro Campus", "2018"],
];

function Topology() {
  return (
    <svg className="topology" viewBox="0 0 680 300" role="img" aria-label="Abstract infrastructure topology with healthy services">
      <path className="topology-line line-one" d="M90 154 C180 70 255 227 340 150 S488 58 588 132" />
      <path className="topology-line line-two" d="M92 155 C195 257 268 84 340 150" />
      <path className="topology-line line-three" d="M340 150 L340 52 M340 150 L340 250" />
      <path className="topology-line line-four" d="M340 150 C390 170 390 230 340 250" />
      <path className="topology-line line-five" d="M340 250 C430 250 510 188 590 132" />
      {[[90,154,"Edge"],[340,52,"ci"],[340,150,"App Layer"],[340,250,"Database Layer"],[590,132,"Monitoring"]].map(([x,y,name]) => (
        <g className="topology-node" key={String(name)} transform={`translate(${x} ${y})`}>
          <circle r="17" /><circle className="node-core" r="6" /><text y="37">{name}</text>
        </g>
      ))}
      <circle className="topology-packet packet-one" r="5"><animateMotion dur="5s" repeatCount="indefinite" path="M90 154 C180 70 255 227 340 150" /></circle>
      <circle className="topology-packet packet-two" r="4"><animateMotion dur="7s" repeatCount="indefinite" path="M340 150 C268 84 195 257 92 155" /></circle>
      <circle className="topology-packet packet-ci" r="5"><animateMotion dur="5s" repeatCount="indefinite" path="M340 52 L340 150" /></circle>
      <circle className="topology-packet packet-amber" r="5"><animateMotion dur="2s" begin="-1.5s" repeatCount="indefinite" path="M340 250 C390 230 390 170 340 150" /></circle>
      <circle className="topology-packet packet-amber" r="5"><animateMotion dur="2s" begin="-0.5s" repeatCount="indefinite" path="M340 150 L340 250" /></circle>
      <circle className="topology-packet packet-amber" r="5"><animateMotion dur="2s" begin="-1s" repeatCount="indefinite" path="M340 150 C425 73 488 58 588 132" /></circle>
      <circle className="topology-packet packet-amber" r="5"><animateMotion dur="2s" begin="-1.5s" repeatCount="indefinite" path="M340 250 C430 250 510 188 590 132" /></circle>
    </svg>
  );
}

export default function Home() {
  const [resumeMessage, setResumeMessage] = useState(false);

  return (
    <main className="site concept-cloud">
      <div className="utility"><span className="pulse" /> AVAILABLE FOR PLATFORM & RELIABILITY WORK <span> · </span> COLOMBO, LK</div>
      <header className="nav">
        <nav aria-label="Primary navigation"><a href="#work">Work</a><a href="#cases">Case studies</a><a href="#about">Experience</a><a href="#writing">Writing</a><a href="https://docs.google.com/spreadsheets/d/10q8vRpSrqYr7Rvx2kRfwmF9hYMBTWow8cd2c_xWUFRw" target="_blank" rel="noreferrer">Workouts</a></nav>
        <div className="nav-actions"><a className="contact-link" href="http://www.linkedin.com/in/gajanrajah" target="_blank" rel="noreferrer">LinkedIn <span>↗</span></a><a className="contact-link" href="mailto:gajanrajah@protonmail.com">Contact <span>↗</span></a></div>
      </header>

      <section id="top" className="hero">
        <div className="hero-copy">
          <p className="eyebrow hero-eyebrow" aria-hidden="true" />
          <h1>Systems, made <em>reliable.</em></h1>
          <p className="lede">Gajan Rajah designs, automates, and operates cloud platforms from resilient OpenShift environments to calmer, more observable delivery workflows.</p>
          <div className="hero-actions">
            <a className="button primary" href="#work">Explore selected work <span>↓</span></a>
            <button className="button ghost" onClick={() => setResumeMessage(true)}>Resume <span>↗</span></button>
          </div>
          {resumeMessage && <p className="resume-note">Resume available on request. <a href="mailto:gajanrajah@protonmail.com?subject=Resume%20request">Email Gajan</a>.</p>}
        </div>

        <HeroSystem />
      </section>

      <section id="work" className="section projects"><div className="section-heading"><p className="eyebrow">SELECTED DEPLOYMENTS</p><h2>Work that holds up<br />when it matters.</h2></div><div className="project-grid">{projects.map((project, index) => <article className="project-card" key={project.name}><div className="card-top"><span>{String(index + 1).padStart(2,"0")}</span><span className="status"><i /> {project.environment}</span></div><h3>{project.name}</h3><p>{project.detail}</p><footer><span>{project.signal}</span><code>{project.stack}</code></footer></article>)}</div></section>

      <section id="cases" className="section case-section"><div className="section-heading"><p className="eyebrow">PRODUCTION TROUBLESHOOTING</p><h2>Prepared beats<br />heroic.</h2></div><div className="case-list">{cases.map(([title, text], index) => <article key={title}><span>{String(index + 1).padStart(2,"0")}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>

      <section id="about" className="section experience"><div><p className="eyebrow">EXPERIENCE</p><h2>Four years of<br />systems thinking.</h2></div><div className="timeline"><article><span>2026 - NOW</span><h3>DevOps / Systems Engineer</h3><p>hSenid Mobile Solutions</p></article><article><span>2024 - 2026</span><h3>Associate DevOps / Cloud Engineer</h3><p>hSenid Mobile Solutions</p></article><article><span>2021 - 2024</span><h3>DevOps & Backend Engineering</h3><p>hSenid Mobile Solutions · appiGo · IntendAble</p></article></div></section>

      <section className="section capability-grid"><article><p className="eyebrow">OPERATING STACK</p><div className="skill-cloud">{skills.map((skill) => <span key={skill}>{skill}</span>)}</div></article><article className="certification-card"><p className="eyebrow">CERTIFICATIONS</p><ul className="certification-list">{certifications.map(([name, issuer, year]) => <li key={name}><span>{name}</span><small>{issuer} · {year}</small></li>)}</ul></article></section>

      <section id="writing" className="section writing"><div><p className="eyebrow">TECHNICAL WRITING</p><h2>Make operations<br />repeatable.</h2></div><div className="writing-card"><span>FIELD NOTE / 001</span><h3>Operational docs that shorten the path from alert to action.</h3><p>Procedure writing, knowledge transfer, deployment notes, and impact analysis are part of the system, not an afterthought.</p><a href="mailto:gajanrajah@protonmail.com?subject=Technical%20writing">Request a writing sample →</a></div></section>

      <footer className="footer"><div><p className="eyebrow">NEXT DEPLOYMENT</p><h2>Let’s make your<br /><em>platform calmer.</em></h2></div><a className="button primary" href="mailto:gajanrajah@protonmail.com">Start a conversation <span>↗</span></a><small>© 2026 Gajan Rajah</small></footer>
    </main>
  );
}

function HeroSystem() {
  return <div className="hero-system"><div className="system-title"><span className="status"><i /> ALL SERVICES NORMAL</span><span>UTC+05:30</span></div><Topology /></div>;
}
