import test from "node:test";
import assert from "node:assert/strict";

import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";

import { moveTopLevelBlock } from "../src/editor/block-drag-data.mjs";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { content: "text*", group: "block" },
    image: { group: "block", atom: true },
    text: { group: "inline" },
  },
});

function paragraph(text) {
  return schema.node("paragraph", null, text ? schema.text(text) : null);
}

test("moves a top-level block after a later block", () => {
  const state = EditorState.create({
    schema,
    doc: schema.node("doc", null, [paragraph("A"), schema.node("image"), paragraph("B")]),
  });

  const transaction = moveTopLevelBlock(state, 0, state.doc.content.size);

  assert.deepEqual(transaction.doc.toJSON(), schema.node("doc", null, [
    schema.node("image"),
    paragraph("B"),
    paragraph("A"),
  ]).toJSON());
});

test("moves a top-level block before an earlier block", () => {
  const doc = schema.node("doc", null, [paragraph("A"), schema.node("image"), paragraph("B")]);
  const state = EditorState.create({ schema, doc });
  const imagePos = doc.child(0).nodeSize;

  const transaction = moveTopLevelBlock(state, imagePos, 0);

  assert.deepEqual(transaction.doc.toJSON(), schema.node("doc", null, [
    schema.node("image"),
    paragraph("A"),
    paragraph("B"),
  ]).toJSON());
});
