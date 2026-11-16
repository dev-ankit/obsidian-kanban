Community-maintained build of Kanban. The plugin ID and board format are unchanged, so existing boards and settings keep working. Every fix below was checked in a real Obsidian instance against 2.0.51 (see `.claude/skills/verify-kanban`), and the mobile fixes on an iPhone.

## Fixes

- **New note from card** works with a date anywhere in the card title and with dates linked to daily notes. Dates and times stay on the card, and none of them leak into the note's filename. (2.0.52 left the card unlinked when the date was mid-title.)
- **Drag auto-scroll** runs at a steady 600 px/s at the board edge on any display. Two bugs made it far too fast: scroll loops piled up, and the speed wasn't capped when a card reached past the edge. Measured on a 120 Hz screen: ~10,200 px/s in 2.0.51, ~4,400 px/s in 2.0.52.
- **Mobile:** "Add a card", the lane header +, and Submit work on the first tap while the keyboard is up. Submit no longer fires when a scroll starts on it.
- **iOS 26:** the new-card input has normal rounded corners instead of a pill shape.
- **Clearer notices:** when a note can't be created (the error is now logged, and the "shorten the text" hint only appears when the name really was too long), and when the configured note folder doesn't exist.
- **Card buttons:** icons fit the card's line height again, so the title lines up with the ⋯ button.

Also includes everything from 2.0.52 (13 merged community pull requests).
