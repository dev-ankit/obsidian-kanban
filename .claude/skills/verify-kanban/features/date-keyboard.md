# Date picker keyboard navigation

The editor date picker's arrow keys follow its displayed week start (#811). Left and Right at
the displayed row boundaries retain the existing previous/next-month behavior.

## Sub-features

- `date-keyboard-week-start` uses the displayed calendar's first and last weekdays.
- `date-keyboard-month-row` preserves the row when moving between months.
- `date-keyboard-vertical` moves Up and Down by seven days.

## How to get to it (user POV)

Set "Calendar: first day of week" in board settings. Add or edit a card and type `@`.

## Driving it with kv.mjs

Preconditions:

- `$K launch --fixture date-regressions --open Keyboard.md`; `$K doctor` all PASS.
- The board uses Monday as week start and unlinked dates.
- For reproducible dates on another day, override only the page's Date before opening the picker
  using the page-clock setup in `date-clock.md`, starting at November 16, 2026 at noon.

- **Saturday to Sunday.** Add `Keyboard @`. Press Right five times from Monday November 16.
  Read `.flatpickr-day.selected`'s `aria-label`: November 21. Snap, then press Right once.
  The selection must be November 22, and the visible month stays November. Snap again.
  Before the fix it jumps to December 13.
- **Reverse.** Left from Sunday selects Saturday November 21.
- **Month boundaries.** Right twice from that Saturday selects Monday December 21. Left from
  that Monday selects Sunday November 22. Read the selected `aria-label` after each step.
- **Vertical and save.** Up selects November 15, Down returns to November 22. Enter accepts the
  picker; another Enter saves the card. Escape closes the form.
  `$K file Keyboard.md --expect 'Keyboard @{2026-11-22}'` and snap the saved card.
- **Other starts.** Repeat with a Sunday-first board and a Wednesday-first board. The rightmost
  displayed weekday, rather than Moment's locale weekday, triggers the next-month move.
  Finish with `$K errors`.

## Gotchas

- This journey exercises the editor's `@` suggestion, not the card menu's picker.
- Month-jumping at the displayed row edge is existing behavior. This fix changes which weekday
  counts as that edge, not the interaction itself.
