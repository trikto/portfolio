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
    const step = match[2] ? Number(match[2]) : 1;
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
  const time = minute === "*" && hour === "*" ? "Every minute" : minute === "0" && hour === "*" ? "At the start of every hour" : `At ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  if (dom === "*" && month === "*" && dow === "*") return time;
  if (dom === "*" && month === "*" && dow === "1-5") return `${time} on weekdays`;
  if (dom === "*" && month === "*" && dow === "1") return `${time} every Monday`;
  if (dom === "1" && month === "*" && dow === "*") return `${time} on the first day of every month`;
  if (minute.startsWith("*/") && hour === "*" && dom === "*" && month === "*" && dow === "*") return `Every ${minute.slice(2)} minutes`;
  return `${time} when the schedule matches`;
}
function dateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", weekday: "short", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { minute: value("minute"), hour: value("hour"), day: value("day"), month: value("month"), weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.find((part) => part.type === "weekday")?.value ?? "") };
}
export function upcomingRuns(fields: CronFields, timeZone: string, from = new Date()): Date[] {
  if (validateCron(fields).length) return [];
  const allowed = fields.map((field, index) => values(field, ranges[index][0], ranges[index][1], index === 4)!) as number[][];
  const start = new Date(from); start.setSeconds(0, 0); start.setMinutes(start.getMinutes() + 1);
  const result: Date[] = [];
  // ponytail: minute scan handles browser time zones; replace with a jump parser only if profiling shows it matters.
  for (let time = start.getTime(), limit = time + 366 * 86400000; time < limit && result.length < 5; time += 60000) {
    const current = dateParts(new Date(time), timeZone), dayMatches = allowed[2].includes(current.day), weekdayMatches = allowed[4].includes(current.weekday);
    const dayOk = fields[2] === "*" || fields[4] === "*" ? dayMatches && weekdayMatches : dayMatches || weekdayMatches;
    if (allowed[0].includes(current.minute) && allowed[1].includes(current.hour) && dayOk && allowed[3].includes(current.month)) result.push(new Date(time));
  }
  return result;
}
