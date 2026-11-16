# Kanban verification map

This directory is the maintained source for verifying what Kanban users see and do. Read this
index, then use the matching feature file as the recipe. Commands assume
`K=.claude/skills/verify-kanban/bin/kv.mjs`, run from the repo root.

## Baseline preconditions

- A run started with `$K launch` (fixture `basic`) that printed `READY`, and `$K doctor` all PASS.
- The `basic` fixture's `Board.md` has lanes `Todo` (Write release notes, `Buy milk @{2026-01-15} today`,
  `Plan sprint #work`, `Review PR [[Notes/Spec]]`), `Doing` (Fix drag scroll) and `Done`
  (`[x] Ship 2.0.52`), plus `Notes/Spec.md`.
- Other fixtures (`$K launch --fixture <name>`): `wide` has 8 lanes, including the CJK titles
  `待办事项` and `進行中`, and is wider than the window; `note-folder` has `Board.md` with
  `new-note-folder: Notes` and `Board-missing.md` pointing at a folder that doesn't exist. Each
  feature file names the fixture a journey needs.
- Each journey assumes the baseline board. After a mutating journey, relaunch (a fresh run is
  cheaper than undoing by hand). Never drive an instance this run didn't start.

## Driving conventions

- Act only through UI input: `click`, `type`, `key`, `drag`, the command palette. `eval` is for
  observing.
- Name cards and lanes by visible text (`.kanban-plugin__item::Buy milk`), never by position.
- Card actions go through the card's `More options` button; right-click doesn't work over CDP.
- After any mutation, poll the disk with `$K file --expect …` before taking the next step.

## Proof and skip reporting

- `snap` before and after the action under test; name snaps after the journey step.
- Mutation proof = the screen (`outline` or a snap) AND the board file on disk agree.
- Finish with `$K errors`; any recorded error fails the journey.
- Record the feature file, sub-feature IDs and entry point with the evidence paths.
- If a precondition is missing, report the journey as failed with the reason. Don't weaken
  the journey to make it pass, and never report an entry point as verified through a different one.

## Feature entry contract

Each feature file has an H1, one paragraph of user-visible behavior, then exactly four H2s in
order: `Sub-features`, `How to get to it (user POV)`, `Driving it with kv.mjs` (starting with
`Preconditions:`, then labeled steps pairing the action, the command and the observable result), and
`Gotchas`.

## Features

- [Cards](./cards.md): add, edit in place, duplicate, delete and archive cards.
- [Inline dates](./inline-dates.md): edit the clicked date when a card contains multiple dates.
- [Cards](./cards.md): add, edit in place, delete and archive cards.
- [Search](./search.md): match the current card text after outside file changes.
- [Drag and drop](./drag-and-drop.md): move cards within and between lanes (including empty and
  off-screen lanes), autoscroll at the board edge, and reorder lanes.
- [Internal link drops](./link-drops.md): preserve visible labels for empty HTML, missing HTML,
  explicit aliases, and unresolved targets. Includes a parsing-only fallback for CDP.
- [New note from card](./new-note-from-card.md): turn a card into a linked note in the right folder,
  keeping dates and times on the card.
- [Lanes](./lanes.md): add a list, collapse it, and keep CJK titles upright when collapsed.
- [Board integrity](./board-integrity.md): refuse to save over content the board can't represent,
  explain which lines, and recover once they're fixed.
- [View modes](./view-modes.md): board, table and list layouts, and switching between markdown and Kanban.
