Community-maintained build of Kanban. The plugin ID and board format are unchanged.

This release fixes bugs from the upstream issue tracker. Every fix was reproduced in a real Obsidian instance before it was fixed, checked afterwards (see `.claude/skills/verify-kanban`), code-reviewed over two rounds, and tested on an iPhone.

## Fixes

- **New note from card no longer loses card content.** Tags, inline fields, links and URLs used to be stripped from the card. They now stay on the card next to the link to the new note, and the note's link always resolves. (#1016, #848, #632)
- **Editing a card's second date changes that date**, not the first one. Dates in the card footer and table view edit the date they show. (#1000)
- **Duplicated cards get their own block ID**, so links to the copy go to the copy. (#830)
- **A literal `<br>` inside a table survives editing** instead of turning into a line break that corrupts the table. (#1024)
- **Search matches the right cards** after the board reloads. (#1246)
- **Dragging works on a newly created board** without reopening it. (#902)
- **Dropping a link with empty or blank text** no longer creates an invisible card. (#624)
- **The board archive limit accepts `-1`** (keep everything), as documented, so archived cards aren't discarded by an inherited limit. (#695)
- **Settings open instantly in large vaults.** With 36,000 notes they took about 19 seconds before. Note folder and Note template now use Obsidian's search picker. (#735)

Includes everything from 2.0.55.
