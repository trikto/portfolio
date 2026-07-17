"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { BackToTop } from "./components/back-to-top";
import { SocialLinks } from "./components/social-links";
import {
  siAnsible,
  siArgo,
  siCeph,
  siCloudflare,
  siDocker,
  siExpress,
  siGnubash,
  siGooglecloud,
  siGrafana,
  siGithubactions,
  siHelm,
  siKalilinux,
  siKubernetes,
  siLinux,
  siMinio,
  siMongodb,
  siMongoose,
  siMysql,
  siNodedotjs,
  siOwasp,
  siPrometheus,
  siPython,
  siRedhat,
  siRedhatopenshift,
  siRook,
  siVmware,
  type SimpleIcon,
} from "simple-icons";
import { SiteFooter } from "./components/site-footer";

const HERO_WORDS = ["reliable", "observable", "resilient", "repeatable"];

function HeroWord() {
  const [wordIndex, setWordIndex] = useState(0);
  const [visibleLength, setVisibleLength] = useState(HERO_WORDS[0].length);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const word = HERO_WORDS[wordIndex];

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReduceMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    const isPaused = !isDeleting && visibleLength === word.length;
    const timeout = window.setTimeout(() => {
      if (isDeleting) {
        if (visibleLength > 0) {
          setVisibleLength((length) => length - 1);
        } else {
          setIsDeleting(false);
          setWordIndex((index) => (index + 1) % HERO_WORDS.length);
        }
      } else if (visibleLength < word.length) {
        setVisibleLength((length) => length + 1);
      } else {
        setIsDeleting(true);
      }
    }, isPaused ? 1500 : isDeleting ? 55 : 85);

    return () => window.clearTimeout(timeout);
  }, [isDeleting, reduceMotion, visibleLength, word]);

  const displayedWord = reduceMotion ? word : word.slice(0, visibleLength);
  return <span className="hero-word" aria-label={word}>{displayedWord}<span className="hero-word-cursor" aria-hidden="true" /></span>;
}

const projects = [
  { name: "OpenShift Platform Engineering", environment: "PRODUCTION", stack: "OpenShift · Ceph · Velero · Ansible", detail: "Built resilient cluster environments, backup paths, storage, and operational guardrails for global client workloads.", signal: "Platform" },
  { name: "Homelab / gajan.dev", environment: "LAB", stack: "GKE · GitLab CI · Prometheus · Grafana", detail: "A personal learning platform for running Kubernetes workloads, observability, and cloud delivery experiments.", signal: "Observability" },
  { name: "Zelvo", environment: "LIVE", stack: "Docker · GCP · NeonDB · TypeScript", detail: "Receipt-aware expense tracking application deployed with a practical cloud delivery stack.", signal: "Product" },
  { name: "NuBred", environment: "CLIENT", stack: "React · Node.js · Docker · NeonDB · Hetzner", detail: "Agriculture and plant variety management system delivered with a modern web and cloud stack.", signal: "Delivery" },
  { name: "NoteMate", environment: "BUILD", stack: "React Native · Spring Boot · AWS · Kubernetes", detail: "AI-powered note taking platform combining voice processing, cloud services, CI/CD, and observability.", signal: "Systems" },
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

type Skill = { name: string; icon?: SimpleIcon; logo?: string };

const skills: Skill[] = [
  { name: "Bash", icon: siGnubash },
  { name: "Linux", icon: siLinux },
  { name: "RHEL", icon: siRedhat },
  { name: "MongoDB", icon: siMongodb },
  { name: "Python", icon: siPython },
  { name: "MySQL", icon: siMysql },
  { name: "OpenShift Virtualization", icon: siRedhatopenshift },
  { name: "VMware", icon: siVmware },
  { name: "Kubernetes", icon: siKubernetes },
  { name: "Docker", icon: siDocker },
  { name: "CI/CD Pipelines", icon: siGithubactions },
  { name: "AWS", logo: "/stack-icons/aws.svg" },
  { name: "GCP", icon: siGooglecloud },
  { name: "Rook", icon: siRook },
  { name: "Ceph", icon: siCeph },
  { name: "Ansible", icon: siAnsible },
  { name: "Prometheus", icon: siPrometheus },
  { name: "Grafana", icon: siGrafana },
  { name: "Cloudflare", icon: siCloudflare },
  { name: "Helm", icon: siHelm },
  { name: "Velero", logo: "/stack-icons/velero.svg" },
  { name: "MinIO", icon: siMinio },
  { name: "GitOps", icon: siArgo },
  { name: "Web App Security", icon: siOwasp },
  { name: "OSINT", icon: siKalilinux },
  { name: "Node.js", icon: siNodedotjs },
  { name: "Express", icon: siExpress },
  { name: "Mongoose", icon: siMongoose },
];

type ExperienceRole = { title: string; period: string; points: string[] };
type Experience = { period: string; title: string; company: string; roles: ExperienceRole[] };

const experiences: Experience[] = [
  {
    period: "2026 - NOW",
    title: "DevOps / Systems Engineer",
    company: "hSenid Mobile Solutions",
    roles: [{ title: "DevOps / Systems Engineer", period: "April 2026 - Present", points: [
      "Ensured the proper functioning of systems, including telco CPaaS products.",
      "Resolved incidents and troubleshot issues to maintain high availability.",
      "Updated release files and managed deployments for low-downtime feature rollouts.",
      "Collaborated on architectural improvements and security hardening for distributed systems and cloud services.",
      "Maintained system documentation for collaboration.",
      "Implemented major production version upgrades with testing, procedure documentation, and impact analysis.",
      "Managed network policies in telco products and OpenShift environments for secure access.",
    ] }],
  },
  {
    period: "2024 - 2026",
    title: "Associate DevOps / Cloud Engineer",
    company: "hSenid Mobile Solutions",
    roles: [
      { title: "Associate DevOps / Cloud Engineer", period: "November 2024 - March 2026", points: [
        "Managed production releases and resolved critical issues through coordinated UAT and troubleshooting.",
        "Architected internal OpenShift cloud environments for VM provisioning, resource management, and resilience.",
        "Implemented CI/CD pipelines and Ansible automation, reducing patching and migration work from hours to seconds.",
        "Deployed resilient infrastructure with Ceph storage, multi-level backups, and network bonding.",
        "Executed OpenShift cluster deployments, POCs, and R&D for global-client modules including PostgreSQL and Elasticsearch.",
        "Led feasibility studies and technical demos, turning requirements into actionable effort estimates.",
      ] },
      { title: "Trainee DevOps / Cloud Engineer", period: "February 2024 - October 2024", points: [
        "Provisioned single-node, multi-node, on-premises, and K3s OpenShift environments for R&D and client deployments.",
        "Ran POCs and client discussions on provisioning, resource allocation, modernization, VMware migrations, networking, and storage.",
        "Implemented Prometheus and Grafana observability, automated health checks, log management, and image pruning scripts.",
        "Automated cluster, database, and namespace backups with Velero and MinIO, and formulated disaster-recovery strategies.",
        "Configured HAProxy, MITM servers, routes, and DNS entries for cluster performance and access.",
        "Worked with Red Hat support on troubleshooting, performance optimization, and highly available pre-production environments.",
        "Documented procedures, maintained version control, ran knowledge-transfer sessions, and managed task estimates.",
      ] },
    ],
  },
  {
    period: "2021 - 2024",
    title: "DevOps & Backend Engineering",
    company: "hSenid Mobile Solutions · appiGo · IntendAble",
    roles: [
      { title: "Back End Developer, IntendAble (Freelance)", period: "December 2023 - February 2024", points: [
        "Built Python and Selenium automation scripts for task automation and data scraping.",
        "Built JavaScript scripts to upload local data automatically to a cloud location.",
        "Provisioned EC2, RDS, VPC, ACL, and security-rule configurations for developer requirements.",
      ] },
      { title: "Trainee DevOps Engineer, appiGo (Remote)", period: "April 2022 - October 2022", points: [
        "Monitored EC2 instances and applied releases with Xshell and Postman.",
        "Managed MySQL, PostgreSQL, and MongoDB databases for consistency and reduced redundancy.",
        "Managed e-commerce web-store configurations through the admin panel.",
        "Updated configuration, troubleshooting, and debugging documentation.",
      ] },
      { title: "Trainee DevOps Engineer, hSenid Mobile Solutions (Internship)", period: "June 2021 - April 2022", points: [
        "Monitored EC2 instances and applied releases with Xshell and Postman.",
        "Managed MySQL, PostgreSQL, and MongoDB databases for consistency and reduced redundancy.",
        "Automated MongoDB message-store cleanup when storage thresholds were reached.",
        "Automated EC2 compliance audits against company standards.",
        "Conducted implementation audits for EC2 configuration standards and requirements.",
        "Managed e-commerce web-store configurations through the admin panel.",
        "Worked with and monitored highly available RHEL pcs clusters.",
        "Conducted knowledge-transfer sessions for team members.",
      ] },
    ],
  },
];

function SkillLogo({ skill }: { skill: Skill }) {
  if (skill.icon) {
    return <span className="skill-logo" aria-hidden="true"><svg viewBox="0 0 24 24" style={{ color: `#${skill.icon.hex}` }}><path d={skill.icon.path} fill="currentColor" /></svg></span>;
  }
  if (skill.logo) {
    return <span className="skill-logo" aria-hidden="true"><Image alt="" height={18} loading="eager" src={skill.logo} width={18} /></span>;
  }
  return null;
}

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
      {[[90,154,"Edge"],[340,52,"CI"],[340,150,"App Layer"],[340,250,"Database Layer"],[590,132,"Monitoring"]].map(([x,y,name]) => (
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

function Gauge({ label, value, progress, tone = "good" }: { label: string; value: string; progress: number; tone?: string }) {
  return <article className="dashboard-gauge"><div className="dashboard-gauge-head"><span>{label}</span><b>i</b></div><svg viewBox="0 0 160 92" aria-hidden="true"><path className="gauge-track" d="M18 78 A62 62 0 0 1 142 78" /><path className={`gauge-fill ${tone}`} d="M18 78 A62 62 0 0 1 142 78" pathLength="100" style={{ strokeDasharray: `${progress} 100` }} /></svg><strong>{value}</strong></article>;
}

type ChartSeries = { tone: string; label: string; values: number[] };
const chartTimes = ["12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "now"];

function DashboardChart({ title, unit, series, min = 0, max = 100 }: { title: string; unit: string; series: ChartSeries[]; min?: number; max?: number }) {
  const [hidden, setHidden] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const width = 520;
  const height = 150;
  const xFor = (index: number) => (index / (chartTimes.length - 1)) * width;
  const yFor = (value: number) => height - 10 - ((value - min) / (max - min)) * (height - 20);
  const nearestIndex = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(chartTimes.length - 1, Math.round(((event.clientX - rect.left) / rect.width) * (chartTimes.length - 1))));
  };
  const toggle = (tone: string) => setHidden(current => current.includes(tone) ? current.filter(item => item !== tone) : [...current, tone]);
  const visible = series.filter(item => !hidden.includes(item.tone));
  const activeX = activeIndex === null ? 0 : xFor(activeIndex);
  return <article className="dashboard-chart"><div className="dashboard-chart-head"><span>{title}</span><small>{unit}</small></div><div className="chart-plot"><svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="group" aria-label={`${title} interactive illustrative chart`} onPointerMove={event => setActiveIndex(nearestIndex(event))} onPointerDown={event => { setActiveIndex(nearestIndex(event)); if (event.pointerType === "touch") setLocked(true); }} onPointerLeave={() => { if (!locked) setActiveIndex(null); }} onDoubleClick={() => setLocked(false)}><title>{title} local illustrative series. Hover or tap for details.</title><path className="chart-grid" d="M0 20H520 M0 60H520 M0 100H520 M0 140H520 M0 0V150 M130 0V150 M260 0V150 M390 0V150 M520 0V150" />{visible.map(item => <polyline className={`chart-line ${item.tone}`} points={item.values.map((value, index) => `${xFor(index)},${yFor(value)}`).join(" ")} key={item.tone} />)}{activeIndex !== null && <line className="chart-crosshair" x1={activeX} x2={activeX} y1="0" y2={height} />}{visible.flatMap(item => item.values.map((value, index) => <circle className={`chart-point ${item.tone} ${activeIndex === index ? "active" : ""}`} cx={xFor(index)} cy={yFor(value)} r={activeIndex === index ? 4 : 2} tabIndex={0} role="button" aria-label={`${item.label}, ${chartTimes[index]}, ${value} ${unit}`} onFocus={() => setActiveIndex(index)} onKeyDown={event => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); setActiveIndex(Math.max(0, Math.min(chartTimes.length - 1, index + (event.key === "ArrowRight" ? 1 : -1)))); } }} key={`${item.tone}-${index}`} />))}</svg>{activeIndex !== null && <div className="chart-tooltip" style={{ left: `${Math.min(84, Math.max(16, (activeX / width) * 100))}%` }}><button type="button" aria-label="Close chart detail" onClick={() => { setActiveIndex(null); setLocked(false); }}>×</button><strong>{chartTimes[activeIndex]}</strong>{visible.map(item => <span key={item.tone}><i className={item.tone} />{item.label}: <b>{item.values[activeIndex]} {unit}</b></span>)}</div>}</div><div className="chart-scale"><span>12:00</span><span>14:00</span><span>16:00</span><span>18:00</span><span>now</span></div><div className="chart-legend">{series.map(item => <button type="button" className={hidden.includes(item.tone) ? "is-hidden" : ""} onClick={() => toggle(item.tone)} aria-pressed={!hidden.includes(item.tone)} key={item.label}><i className={item.tone} />{item.label}</button>)}</div></article>;
}

function ObservabilityDashboard() {
  const [range, setRange] = useState<"1h" | "6h" | "24h">("6h");
  const [host, setHost] = useState("platform-01");
  const [job, setJob] = useState("node");
  const profile = { "1h": [3.1, 0.31, 45.4, 2.0, 59.2], "6h": [2.6, 0.42, 48.1, 4.0, 61.0], "24h": [5.8, 0.76, 52.4, 7.0, 64.8] }[range];
  const hostOffset = host === "platform-01" ? 0 : host === "worker-02" ? 1.2 : 2.4;
  const gauges: Array<[string, string, number, string?]> = [["CPU Busy", `${(profile[0] + hostOffset).toFixed(1)}%`, profile[0] + hostOffset], ["Sys Load", `${(profile[1] + hostOffset / 10).toFixed(2)}`, (profile[1] + hostOffset / 10) * 15], ["RAM Used", `${(profile[2] + hostOffset).toFixed(1)}%`, profile[2] + hostOffset], ["SWAP Used", `${profile[3].toFixed(1)}%`, profile[3], "amber"], ["Root FS Used", `${(profile[4] + hostOffset).toFixed(1)}%`, profile[4] + hostOffset, "amber"], ["CPU Cores", host === "db-01" ? "2" : "4", host === "db-01" ? 14 : 25], ["Uptime", host === "platform-01" ? "18d 06h" : host === "worker-02" ? "11d 19h" : "3d 08h", host === "db-01" ? 18 : 44]];
  const statuses = [["Pressure", "Normal"], ["API", "Healthy"], ["App", "4 / 4"], ["Database", "Ready"], ["Backups", "Verified"]];
  return <section className="section observability-section" aria-labelledby="observability-title">
    <div className="section-heading"><div><p className="eyebrow">OBSERVABILITY</p><h2 id="observability-title">Signals before<br />surprises.</h2></div></div>
    <div className="dashboard-shell node-dashboard">
      <div className="dashboard-head"><div className="dashboard-controls"><label>env <select aria-label="Environment"><option>portfolio</option></select></label><label>job <select value={job} onChange={event => setJob(event.target.value)} aria-label="Metric job"><option value="node">node</option><option value="kubernetes-node">kubernetes-node</option></select></label><label>host <select value={host} onChange={event => setHost(event.target.value)} aria-label="Metric host"><option value="platform-01">platform-01</option><option value="worker-02">worker-02</option><option value="db-01">db-01</option></select></label><div className="range-control" aria-label="Time range">{(["1h", "6h", "24h"] as const).map(option => <button type="button" className={range === option ? "active" : ""} onClick={() => setRange(option)} key={option}>{option}</button>)}</div></div></div>
      <div className="dashboard-status-grid">{statuses.map(([label, value]) => <div className="dashboard-status" key={label}><span>{label}</span><strong>{value}</strong><i /></div>)}</div>
      <div className="dashboard-gauge-grid">{gauges.map(([label, value, progress, tone]) => <Gauge key={label} label={label} value={value} progress={progress} tone={tone} />)}</div>
      <div className="dashboard-chart-grid"><DashboardChart title="CPU Basic" unit="%" min={0} max={100} series={[{ tone:"good", label:"idle", values:[92,88,91,86,90,84,88,82,86] }, { tone:"amber", label:"busy system", values:[2,4,3,6,4,7,5,8,6] }]} /><DashboardChart title="Memory Basic" unit="GiB" min={0} max={16} series={[{ tone:"blue", label:"RAM total", values:[16,16,16,16,16,16,16,16,16] }, { tone:"amber", label:"RAM used", values:[7.1,7.4,7.6,7.7,7.8,8.0,8.1,8.0,8.2] }]} /><DashboardChart title="Network Traffic Basic" unit="kb/s" min={-100} max={100} series={[{ tone:"good", label:"receive", values:[20,34,18,42,27,38,22,45,30] }, { tone:"violet", label:"transmit", values:[-18,-28,-14,-34,-22,-31,-19,-37,-24] }]} /><DashboardChart title="Disk Space Used Basic" unit="%" min={0} max={100} series={[{ tone:"alert", label:"root filesystem", values:[58,58,59,59,60,60,60,61,61] }, { tone:"teal", label:"application volume", values:[32,33,33,34,35,35,36,37,37] }]} /></div>
    </div>
  </section>;
}

export function HomeClient({ latestArticles }: { latestArticles: ReactNode }) {
  const [resumeMessage, setResumeMessage] = useState(false);
  const [activeExperience, setActiveExperience] = useState<Experience | null>(null);
  const experienceDialogRef = useRef<HTMLDialogElement>(null);
  const experienceTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeExperience) {
      experienceDialogRef.current?.showModal();
    }
  }, [activeExperience]);

  const closeExperience = () => experienceDialogRef.current?.close();

  return (
    <main id="site-top" className="site concept-cloud">
      <div className="utility"><span className="pulse" /> AVAILABLE FOR PLATFORM & RELIABILITY WORK <span> · </span> COLOMBO, LK</div>
      <header id="site-nav" className="nav">
        <nav aria-label="Primary navigation"><a href="#top">Home</a><a href="#about">Experience</a><a href="#work">Projects</a><Link href="/blog">Articles</Link><a href="/tools">Tools</a><a href="mailto:gajanrajah@protonmail.com">Contact</a></nav>
        <div className="nav-actions"><a className="contact-link" href="http://www.linkedin.com/in/gajanrajah" target="_blank" rel="noreferrer">LinkedIn <span>↗</span></a><a className="contact-link" href="https://github.com/trikto" target="_blank" rel="noreferrer">GitHub <span>↗</span></a><a className="contact-link" href="mailto:gajanrajah@protonmail.com">Contact <span>↗</span></a></div>
        <SocialLinks className="nav-actions" />
      </header>

      <section id="top" className="hero">
        <div className="hero-copy">
          <p className="eyebrow hero-eyebrow" aria-hidden="true" />
          <h1>Systems made <em><HeroWord /></em></h1>
          <p className="lede">I design, automate, and operate cloud platforms from resilient OpenShift environments to calmer, more observable delivery workflows.</p>
          <div className="hero-actions">
            <a className="button primary" href="#work">Explore selected work <span>↓</span></a>
            <a className="button ghost" href="/tools">Explore DevOps tools <span>→</span></a>
            <button className="button ghost" onClick={() => setResumeMessage(true)}>Resume <span>↗</span></button>
          </div>
          {resumeMessage && <p className="resume-note">Resume available on request. <a href="mailto:gajanrajah@protonmail.com?subject=Resume%20request">Email Gajan</a>.</p>}
        </div>

        <HeroSystem />
      </section>

      <ObservabilityDashboard />
      <section id="work" className="section projects"><div className="section-heading"><p className="eyebrow">SELECTED DEPLOYMENTS</p><h2>Work that holds up<br />when it matters.</h2></div><div className="project-grid">{projects.map((project, index) => <article className="project-card" key={project.name}><div className="card-top"><span>{String(index + 1).padStart(2,"0")}</span><span className="status"><i /> {project.environment}</span></div><h3>{project.name}</h3><p>{project.detail}</p><footer><span>{project.signal}</span><code>{project.stack}</code></footer></article>)}</div></section>

      {latestArticles}

      <section id="cases" className="section case-section"><div className="section-heading"><p className="eyebrow">PRODUCTION TROUBLESHOOTING</p><h2>Prepared beats<br />heroic.</h2></div><div className="case-list">{cases.map(([title, text], index) => <article key={title}><span>{String(index + 1).padStart(2,"0")}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>

      <section id="about" className="section experience"><div><p className="eyebrow">EXPERIENCE</p><h2>Four years of<br />systems thinking.</h2></div><div className="timeline">{experiences.map((experience) => <button className="experience-trigger" type="button" key={experience.period} onClick={(event) => { experienceTriggerRef.current = event.currentTarget; setActiveExperience(experience); }}><span>{experience.period}</span><h3>{experience.title}</h3><p>{experience.company}</p><small>View experience <b aria-hidden="true">→</b></small></button>)}</div></section>

      <dialog ref={experienceDialogRef} className="experience-dialog" aria-labelledby="experience-dialog-title" onClose={() => { setActiveExperience(null); experienceTriggerRef.current?.focus(); }} onMouseDown={(event) => { if (event.target === event.currentTarget) closeExperience(); }}>{activeExperience && <div className="experience-dialog-content"><div className="experience-dialog-head"><div><p className="eyebrow">EXPERIENCE</p><h2 id="experience-dialog-title">{activeExperience.title}</h2><p>{activeExperience.company} · {activeExperience.period}</p></div><button type="button" aria-label="Close experience details" onClick={closeExperience}>×</button></div>{activeExperience.roles.map((role) => <section className="experience-role" key={role.title}><h3>{role.title}</h3><p>{role.period}</p><ul>{role.points.map((point) => <li key={point}>{point}</li>)}</ul></section>)}</div>}</dialog>

      <section className="section capability-grid"><article><p className="eyebrow">OPERATING STACK</p><div className="skill-cloud">{skills.map((skill) => <span key={skill.name}><SkillLogo skill={skill} />{skill.name}</span>)}</div></article><article className="certification-card"><p className="eyebrow">CERTIFICATIONS</p><ul className="certification-list">{certifications.map(([name, issuer, year]) => <li key={name}><span>{name}</span><small>{issuer} · {year}</small></li>)}</ul></article></section>

      <section id="writing" className="section writing"><div><p className="eyebrow">TECHNICAL WRITING</p><h2>Make operations<br />repeatable.</h2></div><div className="writing-card"><span>FIELD NOTE / 001</span><h3>Operational docs that shorten the path from alert to action.</h3><p>Procedure writing, knowledge transfer, deployment notes, and impact analysis are part of the system, not an afterthought.</p><a href="mailto:gajanrajah@protonmail.com?subject=Technical%20writing">Request a writing sample →</a></div></section>

      <SiteFooter />
      <BackToTop />
    </main>
  );
}

function HeroSystem() {
  return <div className="hero-system"><div className="system-title"><span className="status"><i /> ALL SERVICES NORMAL</span><span>UTC+05:30</span></div><Topology /></div>;
}
