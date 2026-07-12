import test from "node:test";
import assert from "node:assert/strict";
import { readRecentWorkspaces, rememberRecentWorkspace } from "../src/core/recent-workspaces.mjs";

function memoryStorage(initial = "[]") {
  let value = initial;
  return { getItem: () => value, setItem: (_key, next) => { value = next; } };
}

test("reads valid recent workspaces and tolerates invalid storage", () => {
  const storage = memoryStorage(JSON.stringify([{ projectName: "A" }, null, {}]));
  assert.deepEqual(readRecentWorkspaces(storage, "recent", 6), [{ projectName: "A" }]);
  assert.deepEqual(readRecentWorkspaces(memoryStorage("{"), "recent", 6), []);
});

test("remembers recent workspaces newest-first without duplicates", () => {
  const storage = memoryStorage(JSON.stringify([{ kind: "file", projectName: "A", filePath: "a.md" }]));
  rememberRecentWorkspace(storage, "recent", {
    kind: "file", projectName: "A2", displayName: "A2", filePath: "a.md",
  }, 6);
  assert.deepEqual(readRecentWorkspaces(storage, "recent", 6).map((item) => item.projectName), ["A2"]);
});
