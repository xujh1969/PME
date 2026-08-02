# Resizable Table Columns Design

## Goal

Allow users to drag the divider between Markdown table columns, persist the chosen widths, and restore them when the document is reopened. Existing tables without saved widths must keep their current automatic layout.

## Editor Interaction

- TipTap's existing resizable table support remains the source of truth for drag behavior.
- A narrow, visible resize target appears on internal column boundaries while the pointer is near a divider.
- Dragging updates TipTap cell `colwidth` attributes in pixels.
- Tables wider than the editor stay at their chosen width inside the existing horizontally scrollable table wrapper.
- Resizing must not affect non-table elements or shared application styles.

## Markdown Persistence

Standard Markdown has no column-width syntax. PME stores widths in an optional comment immediately before the table:

```markdown
<!-- pme-table-widths: 180,320,140 -->
| Name | Description | Status |
| ---- | ----------- | ------ |
| A    | Text        | Done   |
```

- Widths are positive integer pixels, one per logical column.
- The comment is emitted only when a table has user-defined widths.
- Parsing applies each logical width to the corresponding `colwidth` cell attribute.
- Invalid metadata is ignored and the table falls back to automatic layout.
- Other Markdown readers continue to see a normal table and ignore the HTML comment.

## Static Export

- HTML keeps the stored pixel widths and wraps oversized tables in horizontal scrolling.
- PDF preserves stored widths when they fit. Oversized tables are proportionally reduced to the printable width in the export clone; cell text wraps.
- Word converts stored widths to proportions of the usable page width. Oversized source widths therefore fit without changing relative column sizes.
- Export-time fitting never writes adjusted values back to the document.

## Verification

- Unit tests cover metadata parsing, serialization, invalid metadata, and no-metadata compatibility.
- Editor integration tests verify resizable table configuration and resize-handle styling.
- Export tests verify PDF fitting rules and Word proportional widths.
- Full tests and production build must pass.
