# Settings

Board settings override plugin defaults. Note folder and template controls search the complete
set of eligible vault paths, including in large vaults, without freezing the settings window.

## Sub-features

- `settings-tag-reset` restores inherited tag colors, including from an empty local override (#1094).
- `settings-locale-fallback` opens settings in regional or unsupported languages without console errors (#1248).
- `settings-large-open` opens board and global settings in a large vault without building a DOM
  element for every file and folder.
- `settings-large-select` finds and saves paths near the end of the complete candidate list.
- `settings-path-default` resets a local selection to its inherited global default.
- `settings-template-path` matches the template's complete folder/name path, including inherited choices.
- `settings-template-scope` searches the configured template folder recursively.
- `settings-path-use` creates a note using the selected folder and template.
- `settings-path-cancel` cancels the picker without changing settings.

## How to get to it (user POV)

- Board header → Open board settings.
- Obsidian Settings → Community plugins → Kanban Options, or the Kanban sidebar tab.
- In either settings view, click Note template or Note folder, type to search, then choose a result.

## Driving it with kv.mjs

Preconditions:

- For scale checks, launch `basic`, then run
  `node .claude/skills/verify-kanban/scripts/populate-settings-vault.mjs .verify-runs/latest 36000`.
  The generator creates 36,000 notes in 36,361 folders, in addition to the baseline contents.
  Observe `app.vault.getFiles().length` and
  `app.vault.getAllLoadedFiles().filter(f => f.children).length` with `eval` until indexing finishes.
  Expect 36,002 files and 36,363 folders, including the vault root. Also wait for Obsidian's
  `Indexing vault...` notice to disappear (`$K wait '.notice progress' --gone --timeout 60000`).
  Loaded-file counts alone do not prove metadata indexing has finished. Do not time indexing.
- For template scope and defaults, launch `--fixture settings`. Core Templates is enabled with
  folder `Templates`; its nested `Card.md` contains a unique marker. `Notes/Spec.md` is outside it.
- Run `doctor` before each journey and `errors` afterward. Stop every run.

- **Measure board settings.** With no modal open, run
  `node .claude/skills/verify-kanban/scripts/measure-settings.mjs .verify-runs/latest board`.
  The script opens settings using a real harness click and saves timing JSON and a CPU profile in
  the run's evidence directory. `commandToResponsiveMs` includes the harness subprocess and ends
  after two animation frames following the click command. `clickToPaintMs` can be misleading on the
  old build: the empty controls can paint before deferred dropdown construction freezes the UI.
  Take `snap board-settings`. Close with Escape. Repeat to check a warm open too.
- **Measure global settings.** `key Mod+,`, click `.vertical-tab-nav-item::Community plugins`, then
  run the same script with label `global` and fourth argument `.vertical-tab-nav-item::Kanban`.
  Take `snap global-settings`. Compare the same fully indexed vault and machine before and after.
- **Choose late paths.** In board settings, click `.setting-item::Note folder >> button`, type
  `Folder-35999`, and click `.suggestion-item::Settings load/Group-359/Folder-35999`.
  `file --expect '"new-note-folder":"Settings load/Group-359/Folder-35999"'` must pass.
  Choose `Note-35999` in the Note template picker and verify the complete saved template path.
  Reopen settings and verify both selected labels. These paths must remain searchable regardless
  of the number of initially visible suggestions. Close settings and use a card's New note from
  card action; verify its folder and the `Settings fixture 35999` template content on disk.
- **Template path.** With the `settings` fixture, open Note template and search
  `Templates/Nested`. The result is `Templates/Nested/Card.md`. Search the complete path too,
  select it, and assert `"new-note-template":"Templates/Nested/Card.md"` on disk. Reopen the
  picker and verify searching `Card` still finds it. Before the follow-up fix, only the basename
  matched and the folder query showed `No results found`. Snap each query.
- **Template scope.** With the `settings` fixture, open the template picker. `Card` is present;
  search `Spec` and verify no results. Press Escape and reopen the picker to clear the query, then type `Card`
  and select it. The board saves `"new-note-template":"Templates/Nested/Card.md"`.
- **Cancel.** Open either picker, type a query, then Escape. The board file is unchanged and the
  settings window remains open.
- **Global defaults and reset.** In global settings choose Note folder `Notes` and template `Card`.
  Wait until `.obsidian/plugins/obsidian-kanban/data.json` contains both paths. In board settings,
  choose folder `Templates/Nested` and verify the local path on disk, then reopen the picker and
  choose `Notes (default)`. The local folder key disappears and the button shows `Notes (default)`.
  For the template, select `Templates/Nested/Card.md (default)` and verify the local template key disappears too.
- **Use defaults.** Close settings. From `Write release notes` choose New note from card. The new
  file is `Notes/Write release notes.md`, contains the template marker, and the board saves
  `[[Write release notes]]`. Capture a snap and check the file contents.
- **Basic regression.** Run `card-add`, then `dnd-cross-lane` and `dnd-empty-lane` from the existing
  cards and drag feature maps. Assert the saved board order after each.

- **Tag color inheritance.** In global Kanban settings add a tag color for `#work`, set its
  background to `#ff0000`, blur the field, and wait until plugin `data.json` contains the color.
  Close settings: `Plan sprint #work` has a red tag. Open board settings and add a local color;
  delete it with `.kanban-plugin__tag-color-input-wrapper [aria-label="Delete"]`.
  Assert the board saves `"tag-colors":[]`: this remains an explicit choice to suppress global
  colors. Click `.kanban-plugin__tag-color-input-wrapper [aria-label="Reset to default"]` and
  assert `file --absent 'tag-colors'`. Close settings and verify the tag background is red again.
  Repeat after reopening the board with an empty override, and with a nonempty override. The
  reset clears the local editor rows, removes the key on disk and restores inheritance. Cancel
  the modal and reopen it to confirm the result survives. Global settings retain their color.
  Capture the local controls and the restored tag; finish with `errors`.

- **Regional language.** Use English (GB) as the scratch profile's language. If the native
  Language dropdown cannot be driven over CDP, configure the environment with
  `eval 'localStorage.setItem("language", "en-GB")'`, then disable and re-enable Kanban
  through Settings → Community plugins. This is locale setup; open Kanban settings through
  the UI to test the reported failure. Verify English labels and clean `errors`. The old
  build logged `kanban locale not found en-GB` for every translated string. Repeat with an
  unsupported language to check English fallback, and an exact supported locale to check that
  its existing translations still take precedence. Stop the scratch instance afterward.

## Gotchas

- The picker uses Obsidian's own suggestion UI. Its visible result window is bounded; search still
  considers every eligible path. A count of visible suggestions is not the candidate count.
- With no template folder configured, every vault file remains eligible, as before. Do not silently
  cap that list or restrict it to markdown files.
- Selecting the inherited choice unsets the local key; it does not copy the global path into the board.
- `file` polls only board markdown. For global settings, inspect `data.json` after the one-second
  settings debounce has fired before proceeding.
