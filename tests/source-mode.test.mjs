import test from "node:test";
import assert from "node:assert/strict";

import {
  getSourceText,
  renameSourceDraftPath,
} from "../src/core/source-mode.mjs";

test("uses source draft text before serializing the document", () => {
  assert.equal(
    getSourceText("note.md", {
      sourceDrafts: { "note.md": "# Draft\n" },
      documents: {
        "note.md": { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Doc" }] }] },
      },
    }),
    "# Draft\n",
  );
});

test("serializes document text when no source draft exists", () => {
  assert.equal(
    getSourceText("note.md", {
      sourceDrafts: {},
      documents: {
        "note.md": { type: "doc", content: [{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Doc" }] }] },
      },
    }),
    "# Doc\n",
  );
});

test("serializes a missing document as an empty document", () => {
  assert.equal(getSourceText("missing.md", { sourceDrafts: {}, documents: {} }), "\n");
});

test("renames source drafts when a saved markdown path is adopted", () => {
  assert.deepEqual(
    renameSourceDraftPath({ "old.md": "# Draft\n", "other.md": "# Other\n" }, "old.md", "new.md"),
    { "new.md": "# Draft\n", "other.md": "# Other\n" },
  );
});

test("leaves source drafts unchanged when the old path has no draft", () => {
  const drafts = { "other.md": "# Other\n" };
  assert.deepEqual(renameSourceDraftPath(drafts, "old.md", "new.md"), drafts);
});
