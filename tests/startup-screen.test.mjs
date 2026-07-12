import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/app.mjs", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

test("keeps an empty themed startup surface before the app bundle renders", () => {
  assert.equal(indexHtml.includes("boot-screen"), false);
  assert.equal(indexHtml.includes("系统正在加载"), false);
  assert.equal(indexHtml.includes('<body class="is-booting">'), true);
  assert.equal(indexHtml.includes("background: #050505"), true);
  assert.equal(styles.includes(":root {\n  color: var(--color-ink);\n  background: var(--color-canvas);"), true);
  assert.equal(styles.includes("html {\n  background: var(--color-canvas);"), true);
  assert.equal(styles.includes("body.is-booting"), true);
  assert.equal(appSource.includes('requestAnimationFrame(() => document.body.classList.remove("is-booting"))'), true);
});
