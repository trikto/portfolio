import test from "node:test";
import assert from "node:assert/strict";
import { cronExpression, parseCronExpression, upcomingRuns } from "../lib/cron.ts";

test("parses a valid five-field expression and preserves the complete copy value", () => {
  const expression = "*/15 * * * *";
  const parsed = parseCronExpression(expression);
  assert.equal(parsed.valid, true);
  assert.equal(parsed.explanation, "At every 15th minute");
  assert.equal(cronExpression(parsed.fields!), expression);
});

test("rejects malformed fields, ranges, lists, and steps", () => {
  assert.equal(parseCronExpression("").valid, false);
  assert.equal(parseCronExpression("0 9 * *").valid, false);
  assert.equal(parseCronExpression("60 9 * * *").valid, false);
  assert.equal(parseCronExpression("0 9 1,32 * *").valid, false);
  assert.equal(parseCronExpression("*/0 * * * *").valid, false);
});

test("keeps Linux day-of-month and day-of-week OR matching", () => {
  const runs = upcomingRuns("0 9 15 * 1", "UTC", new Date("2026-07-14T09:00:00Z"));
  assert.equal(runs[0]?.toISOString(), "2026-07-15T09:00:00.000Z");
});

test("supports crontab.guru aliases", () => {
  for (const alias of ["@yearly", "@annually", "@monthly", "@weekly", "@daily", "@hourly"]) {
    const parsed = parseCronExpression(alias);
    assert.equal(parsed.valid, true, alias);
    assert.equal(parsed.alias, alias, alias);
  }
  const reboot = parseCronExpression("@reboot");
  assert.equal(reboot.valid, true);
  assert.equal(reboot.previewable, false);
  assert.equal(reboot.explanation, "At system startup");
  assert.deepEqual(upcomingRuns("@reboot", "UTC"), []);
});
