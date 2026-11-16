# Date labels and colors over time

Open boards update relative labels and date colors without a card edit (#1036, #1048). One clock
per window moves at minute boundaries and when the window regains focus or becomes visible. A tick
only changes what is shown, and only where it shows something new; the board file must remain
unchanged.

## Sub-features

- `date-color-text` colors linked dates and relative labels with the same rules (#656).
- `date-clock-relative` updates tomorrow/today/yesterday and time-until labels.
- `date-clock-color` recomputes moving thresholds and today's color.
- `date-clock-inline` also recolors inline dates, clearing a color when no rule applies.
- `date-clock-table` refreshes table date cells.
- `date-clock-overlay` shows the current label and color on a card while it is dragged.
- `date-clock-scrolled-out` gives cards that were scrolled out of view during a tick the current
  colors when they come back.
- `date-clock-chip-moment` colors an inline date and time by the same moment as the footer: the
  date at the card's time, or today at that time when the card has no date.
- `date-clock-cost` keeps a tick cheap on a large board.

## How to get to it (user POV)

Enable "Show relative date" and configure date colors. Leave a dated card open across midnight,
then return to the window after it was inactive.

## Driving it with kv.mjs

Preconditions:

- `$K launch --fixture date-regressions`; `$K doctor` all PASS.
- Clock.md, Clock-inline.md and Clock-table.md contain November 17 and 19, 2026 dates. Today's
  color is green; dates between now and one day away are yellow.
- The following is test-clock setup only. It overrides the scratch page's Date; the system clock
  and timers remain real. Do not use CDP virtual time or call rendering internals.

```js
(() => {
  window.RealDate ||= Date;
  window.clockOffset = new RealDate('2026-11-16T23:59:54').getTime() - RealDate.now();
  window.Date = class extends RealDate {
    constructor(...args) {
      if (args.length) super(...args);
      else super(RealDate.now() + window.clockOffset);
    }
    static now() {
      return RealDate.now() + window.clockOffset;
    }
  };
  return new Date().toString();
})();
```

- **Before midnight.** Run that expression with `$K eval`, then open Clock.md via the file explorer.
  Snap immediately. Relative labels are `tomorrow` and `in 3 days`; November 17 is yellow.
  Save a copy/hash of the board file.
- **After midnight.** Leave the card untouched. Within about six real seconds,
  `$K wait '.kanban-plugin__item-metadata-date-relative::Today' --timeout 15000` succeeds.
  Snap and observe the page Date, label textContent and date wrapper style. Expect `today`,
  `in 2 days`, and green on November 17. The file's bytes must not change.
- **Original-build reproduction.** Set the clock to November 16 at noon before opening Clock.md.
  Capture the labels/styles, then `$K eval 'window.clockOffset += 86400000'`. The labels and color
  stay stale on the original build. Reopen the board through the file explorer; they update.
  This is a simulated day change, not a claim of having waited overnight.
- **Inline and table.** Switch away, reset clockOffset to November 16 at 23:59:54, then open
  Clock-inline.md and repeat. Repeat for Clock-table.md. Read `.kanban-plugin__date` styles.
- **Expired rule.** On the inline board, advance the page to November 18 just before a minute
  boundary. After the tick, November 17 reads yesterday and loses its green custom property.
  November 19 becomes tomorrow and gains yellow. Check the file is unchanged.
- **Dragged card** (`date-clock-overlay`). After the midnight tick on Clock.md,
  `$K drag '.kanban-plugin__item::Due tomorrow' '.kanban-plugin__lane::Done' --hold` and read
  `.kanban-plugin__drag-container .kanban-plugin__item-metadata-date-relative` and the
  `--date-color` of `.kanban-plugin__drag-container .kanban-plugin__date`: `today` and green, as
  on the board. `release`. Before the fix the dragged card still read `tomorrow` and yellow.
- **Scrolled out** (`date-clock-scrolled-out`). Open Clock-long.md (50 inline-dated cards) at
  23:59:45, scroll its lane to the end (the first dozen cards leave the DOM), wait for the tick,
  then scroll back to the top and read every chip's `--date-color`: all green. Before the fix
  the cards that were out of view came back yellow.
- **Same moment as the footer** (`date-clock-chip-moment`). Set the page clock to
  `2026-11-16T10:00:00` and open Clock-time.md (inline, `past` rule red), then
  Clock-time-footer.md (same cards, dates in the footer). For each card compare the chips'
  `--date-color` with the footer's: `Late today` (23:00) has no color on either, `Early today`
  (09:00) is red on both, and the two time-only cards match too. Before the fix the inline date
  of `Late today` and the time-only 23:00 chip were red while the footer was not.
- **Focus.** `$K eval '(() => { window.clockOffset += 3 * 86400000; window.dispatchEvent(new Event("focus")) })()'`
  stands in for waking the machine three days later: labels and colors update at once.
- **Cost** (`date-clock-cost`). Launch `--fixture performance` (600 cards, no date colors, no
  relative dates) and run `node .claude/skills/verify-kanban/bin/measure-clock.mjs plain-native`
  and `... plain-4x 4`. It moves the page clock a minute and focuses the window ten times, and
  reports main-thread time per 400 ms window against idle windows. A tick and a same-minute
  focus must both stay within a few ms: nothing on this board depends on the time. To measure a
  board that does, copy Board.md inside the run's vault with
  `"show-relative-date": true` and a `date-colors` list in its settings block, open the copy and
  measure again; a same-minute focus must still cost nothing. Before the fix every tick and every
  focus re-rendered all 600 cards (about 30 ms, 80–100 ms at 4x).
- **Proof.** Capture before/after snaps and observations and finish with `$K errors`.
  `$K stop` discards the page-clock override with the scratch process.

- **Linked and relative text** (`date-color-text`). Launch `--fixture batch3-dates-links`.
  Use the page-clock setup above if today is not November 16, 2026. Open Board.md, Footer.md,
  and Linked.md through the explorer. Snap each and inspect computed `color` on the date text
  and `.kanban-plugin__item-metadata-date-relative`. Today is red on green, tomorrow is orange,
  and November 22 is blue. Linked dates must not retain the theme link color. Existing threshold
  ordering stays the same. On an uncolored date, links retain the theme link color and relative
  labels have no extra background. Repeat after the midnight tick to check both labels and
  colors refresh. Before the fix, relative labels were uncolored and linked text was purple.

## Gotchas

- The visible relative label is capitalized by CSS; kv text locators use `Today`, while
  `textContent` reads `today`.
- Install the clock before opening the board, so its initial scheduled tick uses that clock.
- A clock jump alone does not run timers. Wait for the real scheduled minute tick. The timer was
  set for the minute boundary of the clock it saw, so after a jump that isn't a whole number of
  minutes the next tick can be up to a minute away.
- Cards below the fold keep their rendered text until they have been on screen once; only cards
  that were shown and then scrolled away are detached.
- `measure-clock.mjs` installs the page-clock override itself and leaves CPU throttling off when
  it ends. Chromium attributes Preact's rendering to task time, not script time; compare `task`.
