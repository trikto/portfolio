import Link from "next/link";
import { SocialLinks } from "./social-links";

export function SiteFooter() {
  return <footer className="footer"><div><p className="eyebrow">NEXT DEPLOYMENT</p><h2>Let&apos;s make your<br /><em>platform calmer.</em></h2></div><a className="button primary" href="mailto:gajanrajah@protonmail.com">Start a conversation <span aria-hidden="true">&#8599;</span></a><SocialLinks className="footer-social-links" /><small>&copy; 2026 Gajan Rajah <span aria-hidden="true">&middot;</span> <Link href="/workouts">Workout Schedule</Link></small></footer>;
}
