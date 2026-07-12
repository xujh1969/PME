# Linked Markdown Package Design

## Scope

Add a local Markdown link insertion flow with custom display text. Expose it in the Insert menu and editor toolbar. Store the selected absolute path in the editable Markdown document.

Extend ZIP packaging to recursively include linked local `.md` and `.markdown` files from any directory or drive. Parse every collected document, collect its images and local Markdown links, rewrite packaged links, deduplicate canonical source paths, and stop recursion at already visited documents.

Theme switching and localization are separate follow-up projects.

## Package Layout

- Keep the current document at the ZIP root.
- Store linked documents in `documents/` using a sanitized base name plus a stable source-path hash.
- Store all images in `assets/` using the existing package image naming behavior.
- Preserve URL query and anchor suffixes when rewriting Markdown links.
- Leave network URLs and same-document anchors unchanged.
- Keep unresolved links unchanged and report them in `missing`.

## Components

- `src/ui/markdown-link-modal.mjs`: choose a local Markdown file and edit display text.
- `src/core/linked-markdown-package.mjs`: traverse the dependency graph and produce rewritten documents/resources.
- `src/core/tauri-workspace.mjs`: expose absolute Markdown selection and text loading.
- `src/app.mjs`: orchestrate insertion and package export.
- `src-tauri/src/main.rs`: native file picker and absolute UTF-8 text reader.

## Success Criteria

- Menu and toolbar both open the insertion window.
- Insertion produces a normal Markdown link with custom label and absolute local path.
- Recursive links, cycles, duplicate references, anchors, duplicate file names, images, and missing files are handled deterministically.
- Source files on disk are never modified.
- Full tests and production build pass.
