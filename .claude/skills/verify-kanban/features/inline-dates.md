# Inline dates

Each inline date opens a picker for that occurrence. Choosing a day changes only that date in
the card's saved text, even when two occurrences contain the same date.

## Sub-features

- `date-edit-occurrence` edits the clicked date, including repeated dates and multiline cards.
- `date-picker-selection` opens the picker with the clicked date selected.
- `date-invalid-prefix` leaves an earlier invalid date token unchanged.
- `date-metadata` edits the last date shown by footer and table cells, using the picker's token count.
- `date-menu` preserves Add date and Edit date from the card menu.

## How to get to it (user POV)

- Click an inline date on a card, then choose a day in the calendar.
- Open a card's `More options` menu, then choose `Add date` or `Edit date`.

## Driving it with kv.mjs

Preconditions:

- `$K launch --fixture inline-dates`; `$K doctor` all PASS.
- Date format and display format are `YYYY-MM-DD`; daily-note linking is off.

- **Second distinct date.** `$K snap distinct-before`, then
  `$K click '.kanban-plugin__item::Distinct dates >> .kanban-plugin__preview-date' --nth 1`.
  `$K eval 'document.querySelector(".flatpickr-day.selected").getAttribute("aria-label")'`
  returns `January 20, 2026`. Click `.flatpickr-day[aria-label="January 25, 2026"]`.
  `$K file --expect 'Distinct dates @{2026-01-10} then @{2026-01-25}'` succeeds.
  `$K snap distinct-after`. Before the fix for #1000, the first date became January 25.
- **First date and picker selection.** Click the same card's date with `--nth 0`.
  The selected day is January 10, not the last date on the card. Choose January 12.
  `$K file --expect 'Distinct dates @{2026-01-12} then @{2026-01-25}'` succeeds.
- **Repeated date.** Click `.kanban-plugin__item::Repeated dates >> .kanban-plugin__preview-date`
  with `--nth 1`, then choose January 25.
  `$K file --expect 'Repeated dates @{2026-01-10} then @{2026-01-25}'` succeeds.
- **Invalid token before a date.** Click the date on `Invalid before`, then choose January 25.
  `$K file --expect 'Invalid before @{not-a-date} then @{2026-01-25}'` succeeds.
- **Multiline.** Click the second date on `Multiline dates`, then choose January 25.
  `$K file --expect 'Multiline dates @{2026-01-10}<br>Second line @{2026-01-25}'` succeeds: the
  card's legacy `<br>` stays as written (#1024), only the second date changes.
- **Single date and menu edit.** Click the date on `Single date`, choose January 12, and assert
  `Single date @{2026-01-12}`. Open its `More options` menu and choose `Edit date`, then January 15.
  `$K file --expect 'Single date @{2026-01-15}'` succeeds.
- **Menu add.** Open `No date`'s menu, choose `Add date`, and select a day.
  Check that `No date` now has exactly one date token on disk and in the UI.
- **Footer and table dates.** In the `inline-dates` fixture open `Footer.md`, then `Table.md`.
  For each, snap before editing. Click `Distinct dates`' `.kanban-plugin__item-metadata-date`
  (scope by `.kanban-plugin__item::Distinct dates` for the footer, `tr::Distinct dates` for the table).
  The picker selects January 20. Choose January 25 and assert the corresponding file contains
  `Distinct dates @{2026-01-10} then @{2026-01-25}`. Repeat with `Invalid before`: the invalid
  first token stays unchanged. Snap the saved result. Before the follow-up fix, the first token
  changed while the displayed last date stayed January 20.
- **Persistence.** Open as markdown from the board header, then use the palette's
  `Kanban: Toggle between Kanban and markdown mode`. All edited dates remain correct.
- **Proof.** `snap` before and after each edit, check the file after each mutation, and finish
  with `$K errors`.

## Gotchas

- `--nth` is zero based. Pick by occurrence, not date text, so identical dates exercise the bug.
- A stored `<br>` stays literal when only a date is edited.
- Invalid date text stays plain text; it does not have a `.kanban-plugin__preview-date` element.
- Linked dates navigate to daily notes. They do not open this inline picker.
