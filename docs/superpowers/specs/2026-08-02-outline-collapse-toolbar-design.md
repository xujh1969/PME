# Outline Collapse and Toolbar Additions

## Goal

Add missing heading and block-format controls, plus a batch outline-collapse command that affects only the left document outline. Preserve the existing editor heading-collapse behavior unchanged.

## Scope

- Add H3, H4, H5, and H6 buttons to the top toolbar's Text group. H3 already exists in the current markup, so implementation must avoid duplicating it and add only missing buttons.
- Add bullet list, ordered list, task list, and blockquote buttons to the text-selection floating toolbar.
- Add an independent `折叠大纲` submenu to the Paragraph application menu with H1, H2, H3, H4, H5, and `全部展开` entries.
- Do not change Markdown syntax, document content, export output, editor undo history, or document dirty state.

## Outline Behavior

The new commands operate exclusively on the left outline tree through its existing per-document `collapsedOutlineGroups` UI state.

- H1: collapse every H1 outline item that has descendants.
- H2: expand all H1 groups, then collapse every H2 item that has descendants.
- H3 through H5: expand all groups above the selected level, then collapse every group at the selected level.
- All expand: remove every collapsed outline group for the current document.
- Headings without descendants remain ordinary outline entries because there is no child group to hide.
- Groups below the selected level retain their prior state while hidden beneath a collapsed ancestor. This preserves the user's more detailed outline choices when the ancestor is expanded later.
- Outline state remains session-only and is remembered separately for each open document. It is never serialized to Markdown.

## Independence From Editor Folding

The existing editor heading-collapse command and `<!--collapsed-->` persistence remain untouched. Collapsing an editor heading must not alter the outline tree, and the new outline commands must not alter editor headings.

## UI Integration

Use the existing `toolButton`, `menuSubmenu`, `menuItem`, icon, active-state, and command-dispatch patterns. No new global CSS is required. The floating toolbar additions use existing button and separator styles, and menu additions use the existing nested-menu component.

## Implementation Boundary

Keep the level-to-outline-group calculation in a small pure helper so it can be tested without rendering the full app. The app command handler applies the helper result to the current document's `collapsedOutlineGroups` set and re-renders the outline.

## Testing

- Verify the Text group contains exactly one button for each H1 through H6.
- Verify the floating toolbar exposes all four requested block-format commands.
- Verify the Paragraph menu contains the new submenu and all six entries.
- Unit-test H1 through H5 transformations, all-expand behavior, leaf headings, and preservation of deeper group state.
- Run the complete test suite and production build.

## Success Criteria

All requested controls are visible and dispatch existing formatting commands. Batch outline collapsing follows the selected level, affects only the left outline, remains session-only, and leaves all existing editor folding and persistence behavior unchanged.
