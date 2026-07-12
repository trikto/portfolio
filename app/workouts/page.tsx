import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "../components/site-header";
import { pageMetadata } from "@/lib/site";

const scheduleUrl = "https://docs.google.com/spreadsheets/d/10q8vRpSrqYr7Rvx2kRfwmF9hYMBTWow8cd2c_xWUFRw";

export const metadata: Metadata = pageMetadata({
  title: "Workout Schedule | Gajan.dev",
  description: "View Gajan's current personal workout and training schedule.",
  path: "/workouts",
});

export default function WorkoutsPage() {
  return <main className="site concept-cloud tools-page"><div className="utility"><span className="pulse" /> AVAILABLE FOR DEVOPS & SYSTEM ENGINEERING</div><SiteHeader /><div className="tool-placeholder"><section aria-labelledby="workouts-title"><p className="eyebrow">PERSONAL SCHEDULE</p><h1 id="workouts-title">Workout Schedule</h1><p>This page links to Gajan&apos;s current personal workout and training schedule.</p><div className="hero-actions"><a className="button primary" href={scheduleUrl} target="_blank" rel="noopener noreferrer">Open Workout Schedule <span aria-hidden="true">↗</span></a><Link className="button ghost" href="/">Back to portfolio <span aria-hidden="true">←</span></Link></div></section></div></main>;
}
