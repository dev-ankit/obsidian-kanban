Community-maintained build of Kanban with bug fixes from open upstream pull requests. The plugin ID and board format are unchanged, so existing boards and settings keep working.

## Fixes

- Fix the long blank area that appears after clicking "Add a card" (#973), already on upstream `main` but never released
- CJK text in collapsed lane titles is no longer upside down (#1244 by @SamTech37)
- Dropping a link onto a board no longer also opens the URL (#1229 by @laohei996)
- "New note from card" falls back correctly when the configured note folder is missing or invalid (#1228 by @laohei996)
- Whitespace-only card and list titles are ignored instead of creating blank entries (#1226 by @laohei996)
- Date and time syntax no longer leaks into filenames from "New note from card" (#1222 by @yhbarve)
- "New note from card" shows an error instead of failing silently (#1188 by @RobTheFiveNine)
- Cards no longer render as pills on iOS/iPadOS 26 (#1216 by @mixflavor)
- Dragging a card across lanes scrolls at a usable speed (#1179 by @BradGroux)
- Sorting by priority places cards without a priority correctly (#1169 by @HsiuCL)
- The mobile Submit button works with one tap (#1156 by @eddiewastaken)
- Keyboard shortcuts keep working after adding a card on desktop (#1147 by @mrdonado)
- Icons use Obsidian's standard size variables (#1012 by @kepano)
- Date colors for "before" ranges pick the closest range (#1008 by @petermeglis)
