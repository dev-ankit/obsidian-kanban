Community-maintained build of Kanban. The plugin ID and board format are unchanged. Each fix below was reproduced first and then checked in a real Obsidian instance (see `.claude/skills/verify-kanban`).

## Fixes

- **No more blank board when you open a board that's already open**, for example from the quick switcher or by clicking a card's link to its own board (#662; reported in upstream PR #1221 by @akinard).
- **A note in reading mode stays in reading mode** after you view it as a board and switch back. This also holds across an app restart and when the plugin is disabled, and raw source mode is kept too (#666; reported in upstream PR #1227 by @laohei996).

## Translations

Reviewed string by string against the English text and Obsidian's official translations before merging, with corrections applied:

- Spanish (upstream PR #1087 by @Rikiub)
- Ukrainian (upstream PR #1240 by @futurebyte22). Ukrainian was also wired to the wrong file and never loaded; that's fixed.
- Traditional Chinese, Taiwan (upstream PR #1214 by @mixflavor)
- Korean additions (upstream PR #1150 by @writing-sky)

Includes everything from 2.0.54.
