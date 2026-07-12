import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const tauriConfig = JSON.parse(readFileSync(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8"));
const cargoToml = readFileSync(new URL("../src-tauri/Cargo.toml", import.meta.url), "utf8");
const mainRs = readFileSync(new URL("../src-tauri/src/main.rs", import.meta.url), "utf8");

test("exposes Tauri development and build scripts", () => {
  assert.equal(packageJson.scripts["tauri:dev"], "tauri dev");
  assert.equal(packageJson.scripts["tauri:build"], "tauri build");
  assert.equal(packageJson.dependencies["@tauri-apps/api"].startsWith("^2."), true);
  assert.equal(packageJson.devDependencies["@tauri-apps/cli"].startsWith("^2."), true);
});

test("points Tauri to the Vite dev server and production dist", () => {
  assert.equal(tauriConfig.build.devUrl, "http://127.0.0.1:5173");
  assert.equal(tauriConfig.build.frontendDist, "../dist");
  assert.equal(tauriConfig.build.beforeBuildCommand, "npm run build");
  assert.deepEqual(tauriConfig.bundle.icon, ["icons/icon.ico"]);
});

test("uses a dark native window background during startup", () => {
  assert.equal(tauriConfig.app.windows[0].backgroundColor, "#050505");
});

test("defines a minimal Tauri 2 Rust application", () => {
  assert.equal(cargoToml.includes("tauri = { version = \"2\""), true);
  assert.equal(cargoToml.includes("tauri-build = { version = \"2\""), true);
  assert.equal(mainRs.includes("tauri::Builder::default()"), true);
  assert.equal(mainRs.includes("tauri::generate_context!()"), true);
});

test("registers native workspace file commands", () => {
  assert.equal(mainRs.includes("create_workspace_dialog"), true);
  assert.equal(mainRs.includes("open_workspace_dialog"), true);
  assert.equal(mainRs.includes("open_markdown_file_dialog"), true);
  assert.equal(mainRs.includes("open_markdown_file_path"), true);
  assert.equal(mainRs.includes("pick_workspace_parent_dialog"), true);
  assert.equal(mainRs.includes("open_workspace_path"), true);
  assert.equal(mainRs.includes("export_html_to_pdf_dialog"), true);
  assert.equal(mainRs.includes("export_markdown_file_dialog"), true);
  assert.equal(mainRs.includes("export_binary_file_dialog"), true);
  assert.equal(mainRs.includes("read_binary_file_path"), true);
  assert.equal(mainRs.includes("pick_image_file_dialog"), true);
  assert.equal(mainRs.includes("pick_markdown_link_dialog"), true);
  assert.equal(mainRs.includes("read_text_file_path"), true);
  assert.equal(mainRs.includes("write_text_file_path"), true);
  assert.equal(mainRs.includes("ImageFilePayload"), true);
  assert.equal(mainRs.includes("write_text_file"), true);
  assert.equal(mainRs.includes("write_binary_file"), true);
  assert.equal(mainRs.includes("remove_file"), true);
});

test("accepts both md and markdown file extensions in native commands", () => {
  assert.equal(mainRs.includes('extension.eq_ignore_ascii_case("md")'), true);
  assert.equal(mainRs.includes('extension.eq_ignore_ascii_case("markdown")'), true);
});

test("exports PDF through Edge headless without print headers", () => {
  assert.equal(mainRs.includes("--print-to-pdf="), true);
  assert.equal(mainRs.includes("--no-pdf-header-footer"), true);
  assert.equal(mainRs.includes("--user-data-dir="), true);
  assert.equal(mainRs.includes("--dump-dom"), false);
  assert.equal(mainRs.includes("percent_encode_path"), true);
  assert.equal(mainRs.includes("wait_for_pdf_file(&pdf_path)?"), true);
  assert.equal(mainRs.includes("pick_pdf_save_file"), true);
});

test("hides the PowerShell host window for native folder picking", () => {
  assert.equal(mainRs.includes("CREATE_NO_WINDOW"), true);
  assert.equal(mainRs.includes(".creation_flags(CREATE_NO_WINDOW)"), true);
  assert.equal(mainRs.includes("\"-WindowStyle\", \"Hidden\""), true);
});
