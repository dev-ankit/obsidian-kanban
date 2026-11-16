Community-maintained build of Kanban. The plugin ID and board format are unchanged.

This release fixes more bugs from the upstream issue tracker. Every fix was reproduced in a real Obsidian instance before it was fixed, checked afterwards (see `.claude/skills/verify-kanban`), code-reviewed, and tested on an iPhone.

## Fixes

- **New lists keep "Mark cards in this list as complete"** when you switch it on while creating them. (#984)
- **"Today", "tomorrow" and date colors stay current** while a board is open, including on the card you're dragging and on cards scrolled out of view. (#1036, #1048)
- **Dragging near the edge of one board no longer scrolls the other board** in a split, or a neighbouring list. Dragging a little past the bottom of a list keeps it scrolling. (#1051)
- **Typing in a note next to a large board no longer stalls** when the note saves. Cards update when a linked note's properties change, and a board recovers by itself once a broken linked note is fixed. (#670)
- **Daily-note links in Markdown format work with nested folders**, including date formats like `YYYY/MM/DD`. (#516)
- **Arrow keys in the date picker follow your week start**, and Sunday works as the week start in languages whose weeks start on Monday. (#811)
- **Adding or collapsing a list after reopening a board that's already open** no longer shows an "is not iterable" error. This was introduced in 2.0.56.
- **A card that embeds a missing note with a Markdown link** no longer breaks the board.

Includes everything from 2.0.56.
