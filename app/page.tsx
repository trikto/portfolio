"use client";

import { useState } from "react";

const projects = [
  { name: "OpenShift Platform Engineering", environment: "PRODUCTION", stack: "OpenShift · Ceph · Velero · Ansible", detail: "Built resilient cluster environments, backup paths, storage, and operational guardrails for global client workloads.", signal: "Platform" },
  { name: "Homelab / gajan.dev", environment: "LAB", stack: "GKE · GitLab CI · Prometheus · Grafana", detail: "A personal learning platform for running Kubernetes workloads, observability, and cloud delivery experiments.", signal: "Observability" },
  { name: "Zelvo", environment: "LIVE", stack: "Docker · GCP · NeonDB · TypeScript", detail: "Receipt-aware expense tracking application deployed with a practical cloud delivery stack.", signal: "Product" },
];

const cases = [
  ["Release safety", "Coordinated production releases and major-version upgrades with test plans, impact analysis, and documented rollback thinking."],
  ["Fast recovery", "Automated patching and migration work with CI/CD and Ansible, reducing manual execution from hours to seconds."],
  ["Reliable platforms", "Implemented monitoring, health checks, backups, and disaster-recovery approaches across clusters and databases."],
];

const skills = ["Kubernetes", "OpenShift", "Docker", "GitOps", "CI/CD", "Ansible", "Prometheus", "Grafana", "AWS", "GCP", "Linux", "Python", "Bash", "Ceph", "Velero"];

function Topology() {
  return (
    <svg className="topology" viewBox="0 0 680 300" role="img" aria-label="Abstract infrastructure topology with healthy services">
      <path className="topology-line line-one" d="M90 154 C180 70 255 227 340 150 S488 58 588 132" />
      <path className="topology-line line-two" d="M92 155 C195 257 268 84 340 150 S481 248 590 132" />
      <path className="topology-line line-three" d="M340 150 L340 52 M340 150 L340 250" />
      <path className="topology-line line-four" d="M340 150 C390 170 390 230 340 250" />
      {[[90,154,"edge"],[340,52,"ci"],[340,150,"app"],[340,250,"data"],[590,132,"operations"]].map(([x,y,name]) => (
        <g className="topology-node" key={String(name)} transform={`translate(${x} ${y})`}>
          <circle r="17" /><circle className="node-core" r="6" /><text y="37">{name}</text>
        </g>
      ))}
      <circle className="topology-packet packet-one" r="5"><animateMotion dur="5s" repeatCount="indefinite" path="M90 154 C180 70 255 227 340 150" /></circle>
      <circle className="topology-packet packet-two" r="4"><animateMotion dur="7s" repeatCount="indefinite" path="M340 150 C268 84 195 257 92 155" /></circle>
      <circle className="topology-packet packet-ci" r="5"><animateMotion dur="5s" repeatCount="indefinite" path="M340 52 L340 150" /></circle>
      <circle className="topology-packet packet-amber" r="5"><animateMotion dur="2s" begin="-1.5s" repeatCount="indefinite" path="M340 250 C390 230 390 170 340 150" /></circle>
      <circle className="topology-packet packet-amber" r="5"><animateMotion dur="2s" begin="-0.5s" repeatCount="indefinite" path="M340 150 C390 170 390 230 340 250" /></circle>
    </svg>
  );
}

export default function Home() {
  const [resumeMessage, setResumeMessage] = useState(false);

  return (
    <main className="site concept-cloud">
      <div className="utility"><span className="pulse" /> AVAILABLE FOR PLATFORM & RELIABILITY WORK <span> · </span> COLOMBO, LK</div>
      <header className="nav">
        <nav aria-label="Primary navigation"><a href="#work">Work</a><a href="#cases">Case studies</a><a href="#about">Experience</a><a href="#writing">Writing</a></nav>
        <a className="contact-link" href="mailto:gajanrajah@protonmail.com">Contact <span>↗</span></a>
      </header>

      <section id="top" className="hero">
        <div className="hero-copy">
          <p className="eyebrow">DEVOPS / CLOUD ENGINEER <span>01—26</span></p>
          <h1>Systems, made <em>legible.</em></h1>
          <p className="lede">Gajan Rajah designs, automates, and operates cloud platforms—from resilient OpenShift environments to calmer, more observable delivery workflows.</p>
          <div className="hero-actions">
            <a className="button primary" href="#work">Explore selected work <span>↓</span></a>
            <button className="button ghost" onClick={() => setResumeMessage(true)}>Resume <span>↗</span></button>
          </div>
          {resumeMessage && <p className="resume-note">Resume available on request. <a href="mailto:gajanrajah@protonmail.com?subject=Resume%20request">Email Gajan</a>.</p>}
        </div>

        <HeroSystem />
      </section>

      <section id="work" className="section projects"><div className="section-heading"><p className="eyebrow">SELECTED DEPLOYMENTS</p><h2>Work that holds up<br />when it matters.</h2></div><div className="project-grid">{projects.map((project, index) => <article className="project-card" key={project.name}><div className="card-top"><span>{String(index + 1).padStart(2,"0")}</span><span className="status"><i /> {project.environment}</span></div><h3>{project.name}</h3><p>{project.detail}</p><footer><span>{project.signal}</span><code>{project.stack}</code></footer></article>)}</div></section>

      <section id="cases" className="section case-section"><div className="section-heading"><p className="eyebrow">PRODUCTION TROUBLESHOOTING</p><h2>Prepared beats<br />heroic.</h2></div><div className="case-list">{cases.map(([title, text], index) => <article key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div><b>↗</b></article>)}</div></section>

      <section id="about" className="section experience"><div><p className="eyebrow">EXPERIENCE</p><h2>Four years of<br />systems thinking.</h2></div><div className="timeline"><article><span>2026 — NOW</span><h3>DevOps / Systems Engineer</h3><p>hSenid Mobile Solutions</p></article><article><span>2024 — 2026</span><h3>Associate DevOps / Cloud Engineer</h3><p>hSenid Mobile Solutions</p></article><article><span>2021 — 2024</span><h3>DevOps & Backend Engineering</h3><p>hSenid Mobile Solutions · appiGo · IntendAble</p></article></div></section>

      <section className="section capability-grid"><article><p className="eyebrow">OPERATING STACK</p><div className="skill-cloud">{skills.map((skill) => <span key={skill}>{skill}</span>)}</div></article><article><p className="eyebrow">CERTIFICATIONS</p><ul><li>Red Hat Certified OpenShift Administrator <span>2025</span></li><li>Red Hat System Administration I <span>2025</span></li><li>Containers & Kubernetes Essentials <span>2024</span></li><li>AWS Educate: Cloud 101 <span>2023</span></li></ul></article></section>

      <section id="writing" className="section writing"><div><p className="eyebrow">TECHNICAL WRITING</p><h2>Make operations<br />repeatable.</h2></div><div className="writing-card"><span>FIELD NOTE / 001</span><h3>Operational docs that shorten the path from alert to action.</h3><p>Procedure writing, knowledge transfer, deployment notes, and impact analysis are part of the system—not an afterthought.</p><a href="mailto:gajanrajah@protonmail.com?subject=Technical%20writing">Request a writing sample →</a></div></section>

      <footer className="footer"><div><p className="eyebrow">NEXT DEPLOYMENT</p><h2>Let’s make your<br /><em>platform calmer.</em></h2></div><a className="button primary" href="mailto:gajanrajah@protonmail.com">Start a conversation <span>↗</span></a><small>© 2026 Gajan Rajah · Built as a private portfolio prototype</small></footer>
    </main>
  );
}

function HeroSystem() {
  return <div className="hero-system"><div className="system-title"><span className="status"><i /> ALL SERVICES NOMINAL</span><span>UTC+05:30</span></div><Topology /></div>;
}
