"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SocialLinks } from "./social-links";
import { useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/#work", label: "Projects" },
  { href: "/#about", label: "Experience" },
  { href: "/blog", label: "Articles" },
  { href: "/tools", label: "Tools" },
  { href: "mailto:gajanrajah@protonmail.com", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <header className="nav"><Link className="wordmark" href="/" aria-label="Gajan.dev home">gajan<span>.dev</span></Link><button className="nav-toggle" type="button" aria-expanded={open} aria-controls="primary-navigation" aria-label="Toggle navigation" onClick={() => setOpen(!open)}>Menu</button><nav id="primary-navigation" className={open ? "open" : undefined} aria-label="Primary navigation">{links.map((link) => { const active = link.href === pathname; return <Link aria-current={active ? "page" : undefined} className={active ? "active" : undefined} href={link.href} key={link.href} onClick={() => setOpen(false)}>{link.label}</Link>; })}</nav><SocialLinks className="nav-actions" /></header>;
}
