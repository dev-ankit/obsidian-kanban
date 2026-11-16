Community-maintained build of Kanban. The plugin ID and board format are unchanged. Each fix below was checked in a real Obsidian instance (see `.claude/skills/verify-kanban`), and the phone fixes on an iPhone.

## Kanban no longer deletes content it can't show

Every edit rewrites the whole board file, so anything the board couldn't represent used to be deleted on the first edit, without warning. Examples: lane titles that lost their `##` (for example after copy-pasting a board), a note under a lane heading, a second list under one lane, or anything after the settings block. One flattened board went from 657 lines to 16 after adding a single list.

Now Kanban shows which lines it can't represent and an **Open as markdown** button, and leaves the file untouched. Once those lines are fixed, the board opens again. `**Complete**` and `## Archive` markers saved in another language are recognised. (Design and code reviewed over four rounds by three independent AI reviewers.)

## Editing cards

- Only one card is in edit mode at a time. Starting to edit another card saves the first if it changed.
- Clicking or tapping away from a card you're editing saves it, and a half-typed new card is kept (upstream PR #1151 by @codingseb).
- Phones: the card editor no longer has a tall blank area above the text, and the editor and its Submit button stay in view while the keyboard opens and as the text grows.
- An outside edit (sync, another pane) that changes a board setting and adds cards at the same time no longer loses the cards.

Includes everything from 2.0.53.
