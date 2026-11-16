Community-maintained build of Kanban. The plugin ID and board format are unchanged.

This release fixes more bugs from the upstream issue tracker. Every fix was reproduced in a real Obsidian instance before it was fixed, checked afterwards (see `.claude/skills/verify-kanban`), code-reviewed, and tested on an iPhone.

## Fixes

- **Dragging a card toward an edge scrolls based on where your finger or pointer is**, not where the card's side is. Scrolling starts about 70 px from the edge, slowly at first and faster as you get closer. Boards in narrow tabs no longer bounce left and right while you drag. (#1111)
- **Dropping a card at the very bottom of a long list** puts it at the bottom. (#296)
- **"Move to list" from a card's menu marks the card complete** when the target list completes its cards, as dragging does. A sorted list re-sorts the same way after either. (#1070)
- **Opening a copied card link** scrolls to the card and outlines it. If the card's list is collapsed, the list is outlined. (#754)
- **Clicking a date whose daily note doesn't exist yet** creates it with your Daily Notes folder, format and template. Other date links open their own target. (#1066)
- **Date colors work on relative dates** ("in 2 days") and on linked dates. They color the text and no longer add a bar across the card. (#656)
- **Embedded notes in cards update** when the embedded note changes. (#867)
- **A board's tag colors, date colors and tag order can be reset** to your global settings. (#1094)
- **Resizing table columns works in pop-out windows.** (#1121)
- **Renaming a board works** when it's open in a background tab. (#1096)
- **Boards follow Obsidian's "Show tab title bar" setting.** (#680)
- **Regional languages like English (UK)** use their base language and no longer log an error. (#1248)
- **Every archive action adds cards to the end of the archive**, so it stays in order and "Maximum number of archived cards" removes the oldest. Archiving a list used to add its cards to the top, where the limit could remove them straight away. (#1243)
- **Changing two board settings in quick succession** saves both.
- **Dropping a card on a collapsed list** puts the card in that list.

Includes everything from 2.0.57.
