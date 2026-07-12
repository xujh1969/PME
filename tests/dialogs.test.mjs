import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("does not use browser alert or confirm dialogs", () => {
  const appSource = readFileSync(new URL("../src/app.mjs", import.meta.url), "utf8");
  const modalSource = readFileSync(new URL("../src/ui/modals.mjs", import.meta.url), "utf8");

  assert.equal(appSource.includes("window.alert"), false);
  assert.equal(appSource.includes("window.confirm"), false);
  assert.equal(modalSource.includes("window.alert"), false);
  assert.equal(modalSource.includes("window.confirm"), false);
});
