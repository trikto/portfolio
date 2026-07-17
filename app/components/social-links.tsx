import { siGithub, type SimpleIcon } from "simple-icons";

function BrandIcon({ icon }: { icon: SimpleIcon }) {
  return <svg aria-hidden="true" className="social-icon" viewBox="0 0 24 24"><path d={icon.path} fill={`#${icon.hex}`} /></svg>;
}

function MailIcon() {
  return <svg aria-hidden="true" className="social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
}

function LinkedInIcon() {
  return <svg aria-hidden="true" className="social-icon" viewBox="0 0 24 24"><path fill="#0A66C2" d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.35 7.44a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.13 20.45H3.57V9h3.56v11.45Z" /></svg>;
}

export function SocialLinks({ className = "social-links" }: { className?: string }) {
  return <div className={className}><a className="contact-link social-link" href="http://www.linkedin.com/in/gajanrajah" target="_blank" rel="noreferrer"><LinkedInIcon />LinkedIn</a><a className="contact-link social-link" href="https://github.com/trikto" target="_blank" rel="noreferrer"><BrandIcon icon={siGithub} />GitHub</a><a className="contact-link social-link" href="mailto:gajanrajah@protonmail.com"><MailIcon />Contact</a></div>;
}
