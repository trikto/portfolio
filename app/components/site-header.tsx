"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/#about", label: "Experience" },
  { href: "/#work", label: "Projects" },
  { href: "/tools", label: "Tools" },
  { href: "mailto:gajanrajah@protonmail.com", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  return <header className="nav"><Link className="wordmark" href="/" aria-label="Gajan.dev home">gajan<span>.dev</span></Link><nav aria-label="Primary navigation">{links.map((link) => <Link aria-current={link.href === "/tools" && pathname === "/tools" ? "page" : undefined} className={link.href === "/tools" && pathname === "/tools" ? "active" : undefined} href={link.href} key={link.href}>{link.label}</Link>)}</nav></header>;
}
