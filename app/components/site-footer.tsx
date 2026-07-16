import Link from "next/link";

export function SiteFooter() {
  return <footer className="footer"><div><p className="eyebrow">NEXT DEPLOYMENT</p><h2>Let’s make your<br /><em>platform calmer.</em></h2></div><a className="button primary" href="mailto:gajanrajah@protonmail.com">Start a conversation <span>↗</span></a><small>© 2026 Gajan Rajah <span aria-hidden="true">·</span> <Link href="/workouts">Workout Schedule</Link></small></footer>;
}
