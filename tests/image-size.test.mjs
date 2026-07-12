import test from "node:test";
import assert from "node:assert/strict";

import {
  getRenderedImageWidth,
  getScaledImageWidth,
  normalizeImageScale,
  normalizeImageWidth,
} from "../src/core/image-size.mjs";

test("normalizes positive image width values", () => {
  assert.equal(normalizeImageWidth("320"), 320);
  assert.equal(normalizeImageWidth("320px"), 320);
  assert.equal(normalizeImageWidth("0"), null);
  assert.equal(normalizeImageWidth(""), null);
});

test("normalizes positive image scale values", () => {
  assert.equal(normalizeImageScale("75"), 75);
  assert.equal(normalizeImageScale(125), 125);
  assert.equal(normalizeImageScale("-10"), null);
  assert.equal(normalizeImageScale("auto"), null);
});

test("calculates rendered image width from scale metadata before stored width", () => {
  assert.equal(getRenderedImageWidth({ scale: 50, originalWidth: 320, width: 999 }), 160);
  assert.equal(getRenderedImageWidth({ width: 240 }), 240);
  assert.equal(getRenderedImageWidth({}), null);
});

test("calculates scaled image width only when scale and original width are available", () => {
  assert.equal(getScaledImageWidth(50, 320), 160);
  assert.equal(getScaledImageWidth(null, 320), null);
  assert.equal(getScaledImageWidth(50, null), null);
});
