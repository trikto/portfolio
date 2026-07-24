"use client";

import { useEffect, useRef, useState } from "react";

const QUOTES = [
  "It worked in staging; staging has been promoted to folklore.",
  "My deployment plan has one step: refresh and hope.",
  "The logs know everything, but refuse to explain themselves.",
  "Uptime is just downtime with better marketing.",
  "Nothing is more permanent than a temporary firewall rule.",
  "I trust automation until it names the server final-final-v2.",
  "The incident began when someone said tiny change.",
  "Every dashboard is green until you look closely.",
  "A clean rollback is just a deployment admitting defeat politely.",
  "The cache is innocent until proven stale.",
  "If it needs a runbook, it will happen at 2 a.m.",
  "The bug is not intermittent; it is simply shy.",
  "Production is where assumptions go for cardio.",
  "A missing semicolon is small until it joins a deployment.",
  "The server was fine until it met real users.",
  "Monitoring is adult supervision for infrastructure.",
  "There is no cloud, only someone else's pager.",
  "The database remembers everything, especially embarrassment.",
  "A fast fix becomes technical debt before lunch.",
  "Every TODO is a future incident wearing a sticky note.",
  "The pipeline passed, which is suspiciously optimistic.",
  "One more retry is how distributed systems write poetry.",
  "The feature flag is off, but emotionally it is still on.",
  "A timeout is the system's way of changing the subject.",
  "Nobody owns the legacy service; it owns us.",
  "The root cause is always one level deeper than your coffee.",
  "A healthy cluster is a group project that has not started arguing.",
  "The dashboard has twelve charts and one unanswered question.",
  "If it is undocumented, it is apparently load-bearing.",
  "The best alert is the one that lets you keep sleeping.",
  "Kubernetes is simple until the YAML becomes interpretive dance.",
  "Every outage starts as a harmless configuration improvement.",
  "The CPU is calm; the humans are not.",
  "A 200 response can still be emotionally unavailable.",
  "The backup exists. Restoring it is tomorrow's plot twist.",
  "Permissions are least privilege until Friday afternoon.",
  "The container is immutable; the incident timeline is not.",
  "A manual fix is automation's awkward cousin.",
  "The service is stateless, unlike the on-call engineer.",
  "DNS is not broken; it is merely pursuing mystery.",
  "The metric moved. We have not agreed whether that is good.",
  "Scale is easy when nobody asks about the bill.",
  "One node is a server. Two nodes are a philosophy.",
  "The alert says critical; the graph says artistic.",
  "An empty queue is just potential stress waiting quietly.",
  "The hotfix was hot because it skipped every safety rail.",
  "I renamed the variable; now the bug has a better cover identity.",
  "The system is eventually consistent, unlike panic.",
  "If the test is flaky enough, it becomes a weather report.",
  "A green build is a promise, not a character reference.",
  "The README is accurate for a previous civilization.",
  "Every service is micro until it needs debugging.",
  "The request was valid; reality was not.",
  "A load balancer is diplomacy for confused servers.",
  "The server has plenty of memory; it is saving it for later.",
  "Monitoring found the problem right after the customer did.",
  "The config is correct in spirit, if not in syntax.",
  "A successful curl command is not a production strategy.",
  "The cluster is self-healing, but nobody mentioned the healing process.",
  "A scheduled job is just a surprise with a calendar.",
  "The error budget is where optimism meets arithmetic.",
  "Our incident channel has excellent typing indicators.",
  "The feature works perfectly in the browser it was born in.",
  "If it only fails under load, the load is now a stakeholder.",
  "The dependency was tiny, until it brought seventeen friends.",
  "A patch Tuesday can become a patch week with confidence.",
  "The graph is flat because the collector stopped collecting.",
  "A secret is safe until it appears in a screenshot.",
  "The dashboard needs dark mode because the outage is nocturnal.",
  "The deploy was zero-downtime for the servers.",
  "The API is RESTful; the team is not.",
  "A race condition is teamwork without coordination.",
  "The CI queue is where urgency goes to meditate.",
  "This service has one responsibility: surprise us.",
  "The logs are structured, unlike the troubleshooting call.",
  "Every clean architecture diagram omits the emergency shell session.",
  "The cache hit rate is excellent at avoiding responsibility.",
  "The staging data is realistic enough to cause real fear.",
  "A dependency upgrade is a treasure hunt with fewer treasures.",
  "If the pager is quiet, check whether it is plugged in.",
  "The system is resilient because it has seen our deploys.",
  "An idempotent endpoint is one that has learned forgiveness.",
  "The infrastructure is declarative; the outage is very expressive.",
  "A rollback is simply version control applauding politely.",
  "The release notes said minor improvements.",
  "Nothing tests observability like losing observability.",
  "The endpoint is healthy according to its own testimony.",
  "A message queue is a waiting room with better branding.",
  "The bug cannot reproduce because it values privacy.",
  "A clean terminal is evidence of selective memory.",
  "The alert threshold is perfect until traffic happens.",
  "The migration ran fast because it skipped the scary part.",
  "Every cron job is punctual until it becomes important.",
  "The dashboard is real-time, eventually.",
  "A maintenance window is an outage with RSVP.",
  "The incident commander is powered by caffeine and timestamps.",
  "We did not remove the bottleneck; we gave it more RAM.",
  "The error message is technically correct and emotionally useless.",
  "The system passed the smoke test; the smoke came later.",
  "Production teaches humility at cloud scale.",
] as const;

function nextQuoteIndex(previous: number) {
  const index = Math.floor(Math.random() * (QUOTES.length - 1));
  return index >= previous ? index + 1 : index;
}

function ReadingProgress({ articleOnly = false }: { articleOnly?: boolean }) {
  const [progress, setProgress] = useState(0);
  const [quote, setQuote] = useState<{ text: string; key: number } | null>(null);
  const [isPulsing, setIsPulsing] = useState(false);
  const lastQuote = useRef(-1);
  const quoteTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const prose = document.querySelector(".article-prose");
      const footer = document.querySelector(".article-footer");
      if (articleOnly && (!prose || !footer)) return;
      const start = articleOnly ? prose!.getBoundingClientRect().top + window.scrollY : 0;
      const end = articleOnly ? footer!.getBoundingClientRect().bottom + window.scrollY : document.documentElement.scrollHeight - window.innerHeight;
      const next = Math.round(Math.min(100, Math.max(0, end ? ((window.scrollY - start) / (end - start)) * 100 : 100)));
      setProgress((current) => current === next ? current : next);
    };
    const scheduleUpdate = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => () => clearTimeout(quoteTimeout.current), []);

  const showQuote = () => {
    const index = nextQuoteIndex(lastQuote.current);
    lastQuote.current = index;
    setQuote({ text: QUOTES[index], key: Date.now() });
    setIsPulsing(false);
    requestAnimationFrame(() => setIsPulsing(true));
    clearTimeout(quoteTimeout.current);
    quoteTimeout.current = setTimeout(() => setQuote(null), 5000);
  };

  return <div className="article-reading-progress"><div className="article-reading-progress-track" aria-hidden="true"><span className="article-reading-progress-fill" style={{ transform: `scaleX(${progress / 100})` }} /></div><div className="article-reading-progress-control"><button className={`article-reading-progress-label${isPulsing ? " is-pulsing" : ""}`} type="button" onClick={showQuote} aria-label="Show a DevOps quote">{progress}%</button>{quote ? <span className="article-reading-progress-quote" role="status" key={quote.key}>{quote.text}</span> : null}</div></div>;
}

export function ArticleReadingProgress() {
  return <ReadingProgress articleOnly />;
}

export function PageReadingProgress() {
  return <ReadingProgress />;
}
