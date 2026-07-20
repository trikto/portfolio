"use client";

import { useMemo, useState } from "react";
import { cronFields, cronRanges, parseCronExpression, type CronExpression, upcomingRuns } from "@/lib/cron";

const initial: CronExpression = "0 9 * * 1-5";
const randomExpressions = ["30 2 * * *", "0 18 * * 1-5", "15 6 1 * *"];
const syntaxRows = [["*", "any value"], [",", "value list separator"], ["-", "range of values"], ["/", "step values"]];
const aliasRows = [["@yearly", "non-standard"], ["@annually", "non-standard"], ["@monthly", "non-standard"], ["@weekly", "non-standard"], ["@daily", "non-standard"], ["@hourly", "non-standard"], ["@reboot", "non-standard"]];

function formatNextRun(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
}

export function CronEditor() {
  const [expression, setExpression] = useState<CronExpression>(initial);
  const [activeField, setActiveField] = useState<number | null>(null);
  const [timeZone] = useState(() => typeof Intl === "undefined" ? "UTC" : Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [copyState, setCopyState] = useState("");
  const parsed = useMemo(() => parseCronExpression(expression), [expression]);
  const runs = useMemo(() => parsed.valid && parsed.previewable ? upcomingRuns(expression, timeZone) : [], [expression, parsed, timeZone]);
  const selectedField = activeField === null ? null : cronFields[activeField];
  const referenceRows = activeField === null ? [...syntaxRows, ...aliasRows] : [...syntaxRows, [cronRanges[activeField], "allowed values"]];
  const copy = async () => { try { await navigator.clipboard.writeText(expression); setCopyState("Copied"); } catch { setCopyState("Copy unavailable"); } window.setTimeout(() => setCopyState(""), 1800); };
  const explanation = parsed.valid ? `“${parsed.explanation}.”` : "“Invalid expression.”";
  return <div className="cron-guru-editor">
    <section className="cron-guru-result" aria-live="polite"><p>{explanation}</p><small>{parsed.valid && parsed.alias === "@reboot" ? "system startup trigger" : parsed.valid && runs[0] ? `next at ${formatNextRun(runs[0], timeZone)}` : parsed.valid ? "no upcoming runs found" : parsed.errors[0]?.message}</small></section>
    <section className={`cron-guru-box${parsed.valid ? "" : " invalid"}`} aria-label="Cron expression editor"><button className="cron-guru-random" type="button" onClick={() => setExpression(randomExpressions[Math.floor(Math.random() * randomExpressions.length)])}>random</button><div className="cron-guru-input-row"><input aria-label="Cron expression" aria-invalid={!parsed.valid} value={expression} onChange={(event) => setExpression(event.target.value)} /><button type="button" onClick={copy}>Copy</button></div><div className="cron-guru-fields">{cronFields.map((field, index) => <button className={activeField === index ? "active" : ""} type="button" key={field} onClick={() => setActiveField(index)}>{field}</button>)}</div></section>
    <section className="cron-guru-reference" aria-label="Cron reference"><table><tbody><tr><th colSpan={2}>{selectedField ? `${selectedField} · ${cronRanges[activeField!]}` : "syntax"}</th></tr>{referenceRows.map(([term, description]) => <tr key={`${term}-${description}`}><th>{term}</th><td>{description}</td></tr>)}</tbody></table></section>
    <p className="cron-copy-status" aria-live="polite">{copyState}</p>
  </div>;
}
