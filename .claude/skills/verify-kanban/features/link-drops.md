# Internal link drops

Dropping an internal link on a board uses its HTML text as the card link's alias. If that text
is empty or absent, the generated link keeps its default label instead of becoming invisible.

## Sub-features

- `link-drop-empty` preserves the generated wikilink or Markdown label when HTML text is empty (#624).
- `link-drop-no-html` preserves the generated label when the transfer has no HTML.
- `link-drop-alias` preserves a nonempty HTML alias in both link formats.
- `link-drop-unresolved` keeps the target of an unresolved link visible.

## How to get to it (user POV)

- Drag an internal link from a note in live preview onto a board in another pane.
- Obsidian's Files and links setting, `Use [[Wikilinks]]`, selects the link format.

## Driving it with kv.mjs

Preconditions:

- The baseline `basic` board is active, with `Notes/Spec.md` present; `$K doctor` all PASS.
- Try a real drag first. CDP external drops are unreliable; failure to create a card is not
  evidence that the parser is correct.

- **Parsing fallback.** Run `node .claude/skills/verify-kanban/bin/check-link-drop.mjs`.
  This calls the installed board's own drop handler with a browser `DragEvent` and `DataTransfer`,
  using Obsidian's real link generator. It captures the parsed content immediately before it
  enters the drag sorter. It does not insert cards, and must be reported as a parsing check,
  not an end-to-end drag check. `KV_RUN` selects an explicit scratch run.
- **Empty and missing HTML.** For a link to `Notes/Spec`, expect `[[Spec]]` with wikilinks enabled
  and `[Spec](Spec.md)` with Markdown links enabled. Neither format may have an empty label.
- **Nonempty alias.** HTML text `Visible label` must remain `[[Spec|Visible label]]` or
  `[Visible label](Spec.md)`.
- **Unresolved target.** Empty HTML for `Missing note` must yield `[[Missing note]]`.
- **Proof.** The script writes all eight cases to the run's `evidence/link-drop-parsing.json`
  and asserts their values. Use `--report-only` to capture results on an unfixed build.
  Run `$K errors` afterwards. Rerun `card-add` and the basic drag journeys to verify normal
  board editing independently.

## Gotchas

- The helper only connects to the scratch instance recorded by `kv.mjs`; it runs `doctor` first.
- It temporarily supplies Obsidian's link drag descriptor, changes the link-format setting,
  and captures the final `dragEndHTML` call. It restores all three in `finally`.
- CDP reads the handler's closure to find the drag manager. If Preact changes its event storage,
  the helper must be updated. No copy of the parser or replacement link generator is used.
- Modern Obsidian may supply visible HTML text even where Obsidian 0.16 supplied none. A successful
  drag of a visible link does not cover the empty-text case.
