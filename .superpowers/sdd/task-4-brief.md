### Task 4: Register Node and Add Insert Entry

**Files:**
- Modify: `src/app.mjs`
- Modify: `src/editor/editor-command-runner.mjs`
- Modify: `src/editor/editor-extensions.mjs`
- Modify: existing command/menu tests as needed

**Interfaces:**
- Consumes: `MindMap`
- Consumes: command `insertMindMap`
- Produces: menu/toolbar command id `mindmap`

- [ ] **Step 1: Add failing registration tests**

Add to `tests/editor-command-runner.test.mjs` or a new focused source assertion:

```js
test("runs the mindmap insert command", () => {
  const calls = [];
  const chain = {
    focus: () => chain,
    insertMindMap: () => {
      calls.push("mindmap");
      return chain;
    },
    run: () => calls.push("run"),
  };

  runEditorCommand("mindmap", { editor: { chain: () => chain } });

  assert.deepEqual(calls, ["mindmap", "run"]);
});
```

If the local test harness for `runEditorCommand` differs, adapt only the setup to match existing tests in that file.

- [ ] **Step 2: Run test to verify failure**

Run:

```powershell
npm test -- tests/editor-command-runner.test.mjs
```

Expected: FAIL because `mindmap` is not handled.

- [ ] **Step 3: Wire command runner**

In `src/editor/editor-command-runner.mjs`, add alongside the Mermaid command:

```js
  } else if (command === "mindmap") {
    chain.insertMindMap().run();
```

- [ ] **Step 4: Register extension**

In `src/app.mjs`, import:

```js
import { MindMap } from "./editor/mindmap-node.mjs";
```

In the editor extension options where `mermaidDiagram: MermaidDiagram` is registered, add:

```js
      mindMap: MindMap,
```

In `src/editor/editor-extensions.mjs`, include `"mindMap"` in atom block lists that currently include `"mermaidDiagram"`.

- [ ] **Step 5: Add UI entry**

In `src/app.mjs`, add toolbar/menu item next to Mermaid:

```js
${toolButton("mindmap", "Workflow", "思维导图")}
```

and insert menu item:

```js
menuItem("mindmap", "思维导图"),
```

Use the exact local helpers and surrounding syntax already present in `src/app.mjs`.

- [ ] **Step 6: Verify command and build**

Run:

```powershell
npm test -- tests/editor-command-runner.test.mjs
npm run build
```

Expected: command test and build pass.

- [ ] **Step 7: Commit**

Run:

```powershell
git add src/app.mjs src/editor/editor-command-runner.mjs src/editor/editor-extensions.mjs tests/editor-command-runner.test.mjs
git commit -m "feat: add mindmap insert entry"
```

Expected: commit succeeds.

---

