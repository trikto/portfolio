import { Cron } from "croner";

export type CronFields = [string, string, string, string, string];
export type CronExpression = string;
export type CronAlias = "@yearly" | "@annually" | "@monthly" | "@weekly" | "@daily" | "@hourly" | "@reboot";
export type CronError = { field: number; message: string };
export type CronParseResult = { expression: CronExpression; valid: boolean; fields: CronFields | null; alias: CronAlias | null; errors: CronError[]; explanation: string; previewable: boolean };

export const cronFields = ["minute", "hour", "day", "month", "weekday"] as const;
export const cronRanges = ["0-59", "0-23", "1-31", "1-12", "0-7"] as const;
const ranges = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]] as const;
const names = ["Minute", "Hour", "Day", "Month", "Weekday"];
const aliases: Record<Exclude<CronAlias, "@reboot">, CronFields> = {
  "@yearly": ["0", "0", "1", "1", "*"],
  "@annually": ["0", "0", "1", "1", "*"],
  "@monthly": ["0", "0", "1", "*", "*"],
  "@weekly": ["0", "0", "*", "*", "0"],
  "@daily": ["0", "0", "*", "*", "*"],
  "@hourly": ["0", "*", "*", "*", "*"],
};

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

export function validateCron(fields: CronFields): CronError[] { return fields.flatMap((field, index) => values(field, ranges[index][0], ranges[index][1], index === 4) ? [] : [{ field: index, message: `${names[index]} must use ${cronRanges[index]}, *, lists, ranges, or steps.` }]); }
export function cronExpression(fields: CronFields) { return fields.join(" "); }

export function explainCron(fields: CronFields): string {
  if (validateCron(fields).length) return "Invalid expression";
  const [minute, hour, dom, month, dow] = fields;
  if (minute.startsWith("*/") && hour === "*" && dom === "*" && month === "*" && dow === "*") return `At every ${minute.slice(2)}th minute`;
  const time = minute === "*" && hour === "*" ? "Every minute" : minute === "0" && hour === "*" ? "At the start of every hour" : `At ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  if (dom === "*" && month === "*" && dow === "*") return time;
  if (dom === "*" && month === "*" && dow === "1-5") return `${time} on weekdays`;
  if (dom === "*" && month === "*" && dow === "1") return `${time} every Monday`;
  if (dom === "1" && month === "*" && dow === "*") return `${time} on the first day of every month`;
  return `${time} when the schedule matches`;
}

function error(expression: string, message: string, field = -1): CronParseResult { return { expression, valid: false, fields: null, alias: null, errors: [{ field, message }], explanation: "Invalid expression", previewable: false }; }

export function parseCronExpression(expression: CronExpression): CronParseResult {
  const value = expression.trim();
  if (!value) return error(value, "Enter a cron expression.");
  const alias = value.toLowerCase() as CronAlias;
  if (alias === "@reboot") return { expression: value, valid: true, fields: null, alias, errors: [], explanation: "At system startup", previewable: false };
  if (Object.prototype.hasOwnProperty.call(aliases, alias)) return { expression: value, valid: true, fields: aliases[alias as Exclude<CronAlias, "@reboot">], alias, errors: [], explanation: explainCron(aliases[alias as Exclude<CronAlias, "@reboot">]), previewable: true };
  if (value.startsWith("@")) return error(value, "Unknown cron alias.");
  const parts = value.split(/\s+/);
  if (parts.length !== 5) return error(value, "A cron expression must contain five fields.");
  const fields = parts as CronFields;
  const errors = validateCron(fields);
  return { expression: value, valid: !errors.length, fields, alias: null, errors, explanation: errors.length ? "Invalid expression" : explainCron(fields), previewable: !errors.length };
}

export function upcomingRuns(expression: CronExpression, timeZone: string, from = new Date()): Date[] {
  const parsed = parseCronExpression(expression);
  if (!parsed.valid || !parsed.previewable || !parsed.fields) return [];
  try { return new Cron(cronExpression(parsed.fields), { timezone: timeZone, mode: "5-part", paused: true }).nextRuns(5, from); } catch { return []; }
}
