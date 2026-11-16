# Search

Board search matches each card's current text after outside file changes. Inserting, removing or
reordering cards must not transfer search text between cards (#1246).

## Sub-features

- `search-reparse` keeps matches correct while an outside write inserts, removes or reorders cards.
- `search-edit` matches a card's updated text after an outside write changes its title.
- `search-reopen` preserves matches through markdown and Kanban view switches.

## How to get to it (user POV)

- Click the board header's `Search...` button and type a query.
- Change the board file in another editor or through sync while the board remains open.

## Driving it with kv.mjs

Preconditions:

- `$K launch --fixture parser-roundtrip --open Search.md`; `$K doctor` all PASS.
- `V=$(readlink .verify-runs/latest)/vault`. Search.md contains 100 cards in Todo, with
  `uniqueneedle` only in `Card 002`.

- **Baseline.** Click `.mod-root .view-action[aria-label="Search..."]`, type `uniqueneedle`, snap.
  Only `Card 002 uniqueneedle` appears in `$K outline`.
- **Insertion.** Insert `- [ ] Inserted card syncmarker` immediately after `## Todo` in
  `$V/Search.md` using an outside file write. Keep search open. The only visible card remains
  `Card 002 uniqueneedle`. Before the fix, `Card 001 phrase001` appeared instead.
- **Removal.** Remove the inserted line with another outside write. The same unique card matches.
- **Reorder.** Move the `Card 002 uniqueneedle` line below `Card 005` from outside. The same card
  matches. Snap and inspect the disk file after each write.
- **Rename.** Replace `uniqueneedle` with `renamedneedle` from outside. The old query has no matches.
  Close search with Escape, reopen it, and type `renamedneedle`: only Card 002 matches.
- **Reopen.** Close search with Escape, open as markdown with the header button, then return using
  the palette command `Kanban: Toggle between`. Search for `renamedneedle` again; Card 002 matches.
- **Proof.** Save before/after snapshots, inspect the resulting file, then `$K errors`.

## Gotchas

- Filtering hides nonmatching cards. Inspect visible card titles, not just highlights.
- Use outside writes for the re-parse checks. Editing a card directly hydrates it through another path.
