import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "../components/site-header";
import { absoluteUrl, pageMetadata } from "@/lib/site";
import { CronEditor } from "./cron-editor";

const title = "Cron Editor – Crontab Generator, Validator & Run Preview";
const description = "Free online cron editor and crontab generator. Build and validate Linux cron expressions, get plain-English explanations, and preview upcoming run times by timezone.";

export const metadata: Metadata = pageMetadata({ title, description, path: "/cron" });

const fields = [
  ["Minute", "0–59", "The minute within the hour"],
  ["Hour", "0–23", "The hour in 24-hour time"],
  ["Day of month", "1–31", "The calendar day"],
  ["Month", "1–12", "The numeric month"],
  ["Day of week", "0–7", "Sunday is 0 or 7; Monday is 1"],
];

const examples = [
  ["* * * * *", "Every minute", "Frequent polling or lightweight health checks"],
  ["0 * * * *", "At the start of every hour", "Hourly aggregation or synchronization"],
  ["0 9 * * 1-5", "At 09:00 Monday through Friday", "Weekday reports or business-day tasks"],
  ["0 0 * * 0", "At midnight every Sunday", "Weekly maintenance or backups"],
  ["0 0 1 * *", "At midnight on the first day of every month", "Monthly billing or archival tasks"],
  ["*/15 * * * *", "Every 15 minutes", "Queue polling or periodic cache refreshes"],
  ["30 2 * * *", "At 02:30 every day", "Nightly backups or batch processing"],
];

const faqs = [
  {
    question: "What is a cron editor?",
    answer: "A cron editor helps you construct, validate, understand, and test a cron expression before adding it to a Linux crontab or another compatible scheduler.",
  },
  {
    question: "How do I validate a cron expression?",
    answer: "Enter exactly five space-separated fields. This tool reports invalid syntax, explains valid schedules, and previews the next five run times in the selected timezone.",
  },
  {
    question: "What does * * * * * mean?",
    answer: "It matches every minute of every hour, day, month, and weekday, so the command is scheduled once per minute.",
  },
  {
    question: "How do I run a cron job every five minutes?",
    answer: "Use */5 * * * *. The step value in the minute field selects every fifth minute.",
  },
  {
    question: "How do I run a cron job on weekdays?",
    answer: "Use a day-of-week range of 1-5. For example, 0 9 * * 1-5 runs at 09:00 from Monday through Friday.",
  },
  {
    question: "Does cron use the server timezone?",
    answer: "Usually. Cron uses the timezone configured by the operating system or scheduler unless that environment provides an explicit timezone setting. This tool previews runs in the timezone selected above.",
  },
  {
    question: "Is cron syntax the same in AWS, Kubernetes, GitHub Actions, and Vercel?",
    answer: "No. Several platforms use cron-like schedules, but field counts, special characters, timezone rules, minimum intervals, and day-matching behavior can differ. Check the target platform before deployment.",
  },
  {
    question: "What is the difference between cron and crontab?",
    answer: "Cron is the scheduling service. A crontab is the configuration table it reads. A cron expression is the five-field schedule, while a crontab file contains schedule-and-command entries.",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Online Cron Editor",
      description,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any",
      url: absoluteUrl("/cron"),
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    },
  ],
};

export default function CronPage() {
  return (
    <main id="site-top" className="site concept-cloud cron-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }} />
      <div className="utility"><span className="pulse" /> DEVOPS UTILITIES</div>
      <SiteHeader />
      <section className="cron-hero" aria-labelledby="cron-title">
        <p className="eyebrow">DEVOPS UTILITIES / <Link href="/tools">ALL TOOLS</Link></p>
        <h1 id="cron-title">Online Cron Editor</h1>
        <p>Use this free online cron editor to build, validate, explain, and preview five-field Linux crontab expressions. Check upcoming run times in your selected timezone before adding the schedule to your server.</p>
      </section>

      <CronEditor />

      <div className="cron-guide">
        <section className="cron-section cron-guide-section" aria-labelledby="what-is-a-cron-editor">
          <p className="eyebrow">CRON BASICS</p>
          <h2 id="what-is-a-cron-editor">What Is a Cron Editor?</h2>
          <p>A cron editor helps you construct, validate, understand, and test Linux crontab expressions before deploying them. It turns the compact schedule into a readable explanation and lets you check upcoming execution times without changing a server configuration.</p>
        </section>

        <section className="cron-section cron-guide-section" aria-labelledby="create-a-cron-expression">
          <p className="eyebrow">FIVE-FIELD FORMAT</p>
          <h2 id="create-a-cron-expression">How to Create a Cron Expression</h2>
          <p>Write five space-separated fields in this order: <code>minute hour day-of-month month day-of-week</code>. Choose a valid value or supported operator for each field, then review the explanation and run preview above.</p>
          <div className="cron-table-wrap">
            <table>
              <caption>Linux cron field reference</caption>
              <thead><tr><th scope="col">Field</th><th scope="col">Range</th><th scope="col">Purpose</th></tr></thead>
              <tbody>{fields.map(([field, range, purpose]) => <tr key={field}><th scope="row">{field}</th><td><code>{range}</code></td><td>{purpose}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="cron-section cron-guide-section" aria-labelledby="common-cron-examples">
          <p className="eyebrow">COPYABLE SCHEDULES</p>
          <h2 id="common-cron-examples">Common Cron Expression Examples</h2>
          <div className="cron-table-wrap cron-examples-table">
            <table>
              <caption>Common five-field cron schedules and use cases</caption>
              <thead><tr><th scope="col">Expression</th><th scope="col">Meaning</th><th scope="col">Typical use case</th></tr></thead>
              <tbody>{examples.map(([expression, meaning, useCase]) => <tr key={expression}><th scope="row"><code>{expression}</code></th><td>{meaning}</td><td>{useCase}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="cron-section cron-guide-section" aria-labelledby="cron-versus-crontab">
          <p className="eyebrow">TERMINOLOGY</p>
          <h2 id="cron-versus-crontab">Cron Versus Crontab</h2>
          <dl className="cron-definition-list">
            <dt>cron</dt><dd>The Linux scheduling service that checks schedules and starts commands.</dd>
            <dt>crontab</dt><dd>The table of scheduled commands associated with a user or system.</dd>
            <dt>cron expression</dt><dd>The five schedule fields that define when a command should run.</dd>
            <dt>crontab file</dt><dd>A configuration file containing cron expressions followed by the commands to execute.</dd>
          </dl>
        </section>

        <section className="cron-section cron-guide-section" aria-labelledby="supported-linux-cron-syntax">
          <p className="eyebrow">VERIFIED PARSER SUPPORT</p>
          <h2 id="supported-linux-cron-syntax">Linux Cron Syntax Supported by This Editor</h2>
          <p>This tool targets numeric, five-field Linux cron expressions. The current validator supports:</p>
          <ul className="cron-guide-list">
            <li>Wildcards such as <code>*</code></li>
            <li>Comma-separated lists such as <code>0,15,30,45</code></li>
            <li>Numeric ranges such as <code>1-5</code></li>
            <li>Step values after a wildcard or range, such as <code>*/15</code> or <code>0-59/15</code></li>
            <li>Numeric weekdays <code>0-7</code>, where both <code>0</code> and <code>7</code> represent Sunday</li>
          </ul>
          <p>Named months and weekdays such as <code>JAN</code> or <code>MON</code> are not accepted. Numeric-prefix steps such as <code>0/15</code>, aliases such as <code>@daily</code>, and command text are also outside this validator&apos;s supported input.</p>
        </section>

        <section className="cron-section cron-guide-section" aria-labelledby="different-cron-formats">
          <p className="eyebrow">PLATFORM DIFFERENCES</p>
          <h2 id="different-cron-formats">Unsupported or Different Cron Formats</h2>
          <p>Cron-like schedulers are not interchangeable. Validate the final schedule in its target platform:</p>
          <ul className="cron-guide-list">
            <li><strong>Quartz Scheduler</strong> commonly uses six or seven fields, including seconds, plus characters such as <code>?</code>.</li>
            <li><strong>AWS EventBridge Scheduler</strong> uses an AWS-specific expression with a year field and additional wildcards.</li>
            <li><strong>Kubernetes CronJobs</strong> use a five-field schedule, but also have controller, concurrency, deadline, and timezone configuration that this page does not validate.</li>
            <li><strong>GitHub Actions</strong> uses POSIX-style scheduled workflow syntax, but platform interval, branch, timezone, and execution rules still apply.</li>
            <li><strong>Vercel Cron Jobs</strong> use five fields but apply Vercel-specific weekday, timezone, configuration, and plan rules.</li>
          </ul>
        </section>

        <div className="cron-guide-columns">
          <section className="cron-section cron-guide-section" aria-labelledby="day-of-month-week-behaviour">
            <p className="eyebrow">DAY MATCHING</p>
            <h2 id="day-of-month-week-behaviour">Day-of-Month and Day-of-Week Behaviour</h2>
            <p>In standard Linux cron, when both day fields are restricted, the schedule matches when either field matches. For example, <code>0 9 15 * 1</code> runs at 09:00 on every Monday and on the 15th day of each month.</p>
            <p>When either day field is <code>*</code>, the other field controls the day normally.</p>
          </section>

          <section className="cron-section cron-guide-section" aria-labelledby="cron-timezone-behaviour">
            <p className="eyebrow">TIMEZONES</p>
            <h2 id="cron-timezone-behaviour">Cron Timezone Behaviour</h2>
            <p>Actual execution depends on the timezone configured by the operating system, scheduler, container, or hosting platform. A correct expression can still run at an unexpected local time when environments use different timezone settings.</p>
            <p>The upcoming runs shown above are calculated using the timezone selected in the editor. Configure the target scheduler to use the same timezone before deployment.</p>
          </section>
        </div>

        <section className="cron-section cron-guide-section" aria-labelledby="common-cron-mistakes">
          <p className="eyebrow">TROUBLESHOOTING</p>
          <h2 id="common-cron-mistakes">Common Cron Mistakes</h2>
          <ul className="cron-guide-list cron-mistakes">
            <li>Putting fields in the wrong order.</li>
            <li>Confusing day-of-month with day-of-week.</li>
            <li>Assuming every scheduler supports identical cron syntax.</li>
            <li>Forgetting that the server or platform may use a different timezone.</li>
            <li>Running a script without executable permissions.</li>
            <li>Using relative or incorrect script paths instead of absolute paths.</li>
            <li>Expecting interactive shell environment variables to exist in cron.</li>
            <li>Discarding all output and losing the error messages needed for troubleshooting.</li>
            <li>Using an unescaped <code>%</code> in a crontab command, where it may be treated as a newline. This editor validates the five schedule fields, not the command.</li>
            <li>Creating an unintentionally frequent job with wildcards or a small step value.</li>
          </ul>
        </section>

        <section className="cron-section cron-guide-section" aria-labelledby="cron-faq">
          <p className="eyebrow">FREQUENTLY ASKED QUESTIONS</p>
          <h2 id="cron-faq">Cron Editor FAQ</h2>
          <div className="cron-faq-list">
            {faqs.map(({ question, answer }) => <article key={question}><h3>{question}</h3><p>{answer}</p></article>)}
          </div>
        </section>
      </div>

      <footer className="cron-footer">Built for browser-only schedule checks · <Link href="/tools">More DevOps tools</Link></footer>
    </main>
  );
}
