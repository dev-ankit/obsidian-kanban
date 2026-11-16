# Date labels and colors over time

Open boards update relative labels and date colors without a card edit (#1036, #1048). One clock
per mounted board refreshes at minute boundaries and on focus or visibility changes. Clock ticks
only update the presentation; the board file must remain unchanged.

## Sub-features

- `date-clock-relative` updates tomorrow/today/yesterday and time-until labels.
- `date-clock-color` recomputes moving thresholds and today's color.
- `date-clock-inline` also recolors inline dates, clearing a color when no rule applies.
- `date-clock-table` refreshes table date cells.

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
- **Proof.** Capture before/after snaps and observations and finish with `$K errors`.
  `$K stop` discards the page-clock override with the scratch process.

## Gotchas

- The visible relative label is capitalized by CSS; kv text locators use `Today`, while
  `textContent` reads `today`.
- Install the clock before opening the board, so its initial scheduled tick uses that clock.
- A clock jump alone does not run timers. Wait for the real scheduled minute tick.
