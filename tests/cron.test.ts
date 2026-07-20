import assert from "node:assert/strict";
import test from "node:test";
import { upcomingRuns, validateCron, type CronFields } from "../lib/cron.ts";

const fields = (expression: string) => expression.split(" ") as CronFields;

test("accepts standard lists, ranges, and wildcard steps", () => {
  for (const expression of ["*/15 * * * *", "0-59/15 * * * *", "0,15,30,45 * * * *", "0 9 * * 1-5", "0 0 1 * *"]) {
    assert.equal(validateCron(fields(expression)).length, 0, expression);
    assert.equal(upcomingRuns(fields(expression), "UTC").length, 5, expression);
  }
});

test("rejects malformed expressions without throwing during preview", () => {
  for (const expression of ["0/15 * * * *", "5/15 * * * *", "60 * * * *", "*/0 * * * *", "*/61 * * * *", "1-0 * * * *", "0 0 * * 8", "0 0 * * */8"]) {
    assert.ok(validateCron(fields(expression)).length, expression);
    assert.deepEqual(upcomingRuns(fields(expression), "UTC"), [], expression);
  }
});
