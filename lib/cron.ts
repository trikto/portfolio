import { Cron } from "croner";

export type CronFields = [string, string, string, string, string];
export type CronError = { field: number; message: string };
const ranges = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]] as const;
const names = ["Minute", "Hour", "Day of month", "Month", "Day of week"];

function values(token: string, min: number, max: number, sunday = false): number[] | null {
  if (!token) return null;
  const found = new Set<number>();
  for (const part of token.split(",")) {
    const match = part.match(/^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/);
    if (!match) return null;
    if (match[2] && match[1] !== "*" && !match[1].includes("-")) return null;
    const step = match[2] ? Number(match[2]) : 1;
    if (step > max - min + 1 - Number(sunday)) return null;
    const [start, rawEnd] = match[1] === "*" ? [min, max] : match[1].split("-").map(Number);
    const end = rawEnd ?? start;
    if (!Number.isInteger(step) || step < 1 || !Number.isInteger(start) || !Number.isInteger(end) || start < min || end > max || start > end) return null;
    for (let value = start; value <= end; value += step) found.add(sunday && value === 7 ? 0 : value);
  }
  return [...found].sort((a, b) => a - b);
}

export function validateCron(fields: CronFields): CronError[] { return fields.flatMap((field, index) => values(field, ranges[index][0], ranges[index][1], index === 4) ? [] : [{ field: index, message: `${names[index]} must use ${ranges[index][0]}–${ranges[index][1]}, *, lists, ranges, or steps.` }]); }
export function cronExpression(fields: CronFields) { return fields.join(" "); }
export function explainCron(fields: CronFields): string {
  if (validateCron(fields).length) return "Enter a valid five-field Linux cron expression.";
  const [minute, hour, dom, month, dow] = fields;
  if (minute.startsWith("*/") && hour === "*" && dom === "*" && month === "*" && dow === "*") return `Every ${minute.slice(2)} minutes`;
  const time = minute === "*" && hour === "*" ? "Every minute" : minute === "0" && hour === "*" ? "At the start of every hour" : `At ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  if (dom === "*" && month === "*" && dow === "*") return time;
  if (dom === "*" && month === "*" && dow === "1-5") return `${time} on weekdays`;
  if (dom === "*" && month === "*" && dow === "1") return `${time} every Monday`;
  if (dom === "1" && month === "*" && dow === "*") return `${time} on the first day of every month`;
  return `${time} when the schedule matches`;
}
export function upcomingRuns(fields: CronFields, timeZone: string, from = new Date()): Date[] {
  if (validateCron(fields).length) return [];
  try { return new Cron(cronExpression(fields), { timezone: timeZone, mode: "5-part", paused: true }).nextRuns(5, from); } catch { return []; }
}
