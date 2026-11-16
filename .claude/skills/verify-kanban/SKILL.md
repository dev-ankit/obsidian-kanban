---
name: verify-kanban
description: Drive this repo's Kanban plugin inside a real, isolated Obsidian desktop instance (CDP over Electron) to prove a change works the way a user would see it — boards rendering, adding/editing/dragging cards, card menu actions, lanes, view modes — and capture screenshot + on-disk evidence. Use after changing src/, when reviewing or merging a PR, or when reproducing a bug report.
---

# Verify Kanban in a real Obsidian

Typecheck and build prove nothing about behavior here. The plugin has no test suite, its UI is
pointer-driven drag and drop, and its output is a markdown file. Verification means: run the built
plugin in real Obsidian, act through the UI, and check both the screen and the board file on disk.

Everything goes through one zero-dependency helper (Node ≥ 22). Call it from the repo root:

```sh
K=.claude/skills/verify-kanban/bin/kv.mjs
$K help
```

## Isolation (read first)

The user runs their own Obsidian with real vaults (some on iCloud). **Never** attach to it, open
its vaults, or kill processes by name. `kv.mjs launch` starts a *separate* Obsidian process with its
own `--user-data-dir` and a scratch vault under `.verify-runs/<run-id>/`, on a free CDP port.
Every other command talks only to the instance recorded in that run's `state.json`. Two runs can
coexist; pass `--run <dir>` (or `KV_RUN=<dir>`) to pick one, otherwise `.verify-runs/latest` is used.

The instance opens a **visible window on the user's screen**. Tell the user before launching, ask
them not to click in it or close it, and stop it when done.

## Launch

```sh
$K launch                  # yarn build, then start Obsidian on fixtures/basic, open Board.md
$K launch --no-build       # reuse main.js/styles.css already in the repo root
$K launch --fixture basic --open Board.md
```

Launch builds the plugin, copies `main.js`, `manifest.json` and `styles.css` into the scratch vault,
starts Obsidian, accepts the "Trust author and enable plugins" prompt with a real click, closes the
Settings window that follows, and opens the board by clicking it in the file explorer. It is ready
when it prints:

```
READY: Kanban 2.0.52 (<commit>) showing Board.md
```

If `node_modules` is missing: `yarn install --registry https://registry.npmjs.org/` (the user's
global npm registry is a private work mirror with expiring credentials; never edit `~/.npmrc`).

Launch also sets up the scratch instance so it can be driven: auto-update is off (`updateDisabled`
in the profile), native OS menus are off (`nativeMenus: false`; native menus are invisible to CDP),
background throttling is off (otherwise each input event waits seconds when the window is behind
others), and the window is sized to 1400×900.

## Doctor

Run this first whenever anything looks off, and before trusting a result:

```sh
$K doctor
```

It is read-only and checks that the process is alive, the CDP port belongs to our process, the
window is open, the window shows our scratch vault (not a user vault), the plugin is loaded, the
repo's `main.js` matches the build that's running (FAIL means you changed code: rebuild and
relaunch), no modal is blocking input, and no page errors have been recorded. Exit code 1 on any
FAIL.

## Drive

Locators are CSS, optionally with a visible-text filter, chained with ` >> ` to search inside the
previous match:

```
.kanban-plugin__item::Buy milk                              a card whose text contains "Buy milk"
.kanban-plugin__lane::Todo >> .kanban-plugin__new-item-button   "+ Add a card" in the Todo lane
.menu .menu-item::New note from card                        an item in an open Obsidian menu
```

The text filter is a substring match on the whole element, so give fixtures distinct titles. All
input goes through real CDP mouse and keyboard events, not DOM `.click()`.

| Do | Command |
|---|---|
| Click / double-click | `$K click '<loc>'` / `$K click '<loc>' --double` |
| Type into the focused editor | `$K type 'text'` then `$K key Enter` |
| Key combos | `$K key Escape`, `$K key Mod+p`, `$K key Mod+a`, `$K key Shift+Enter` |
| Drag a card next to another | `$K drag '<card>' '<target card>' --before` or `--after` |
| Drag into a lane (even empty) | `$K drag '<card>' '.kanban-plugin__lane::Doing'` |
| Drag to an off-screen lane | `$K drag '<card>' '<target>' --edge right --after` (prints scroll px/s) |
| Reorder lanes | `$K drag '.kanban-plugin__lane::QA >> .kanban-plugin__lane-grip' '.kanban-plugin__lane::Ready' --axis x --before` |
| Inspect a drag mid-flight | `$K drag ... --hold`, `$K snap mid-drag`, `$K release` |
| Hold a drag at an exact spot | `$K drag '<card>' --point X,Y --hold` (viewport px; prints which scroll containers moved) |
| Wait for UI | `$K wait '<loc>'`, `$K wait '<loc>' --gone --timeout 8000` |
| Read the board as shown | `$K outline` |
| Read the file on disk | `$K file`, `$K file Notes/Spec.md`, `$K ls` |
| Assert the file (polls) | `$K file --expect '- [ ] New card' --absent 'Old title'` |
| Observe internals | `$K eval 'app.workspace.activeLeaf.view.getViewType()'` |
| Page errors since launch | `$K errors` |

Stable handles in this app:

- Cards: `.kanban-plugin__item`; title `.kanban-plugin__item-title`; card menu button
  `a[aria-label="More options"]` inside the card.
- Lanes: `.kanban-plugin__lane` (text starts with the lane title); collapse chevron
  `.kanban-plugin__lane-collapse`; collapsed state is the class `collapse-horizontal` on
  `.kanban-plugin__lane-wrapper`; lane menu `.kanban-plugin__lane-settings-button`.
- Board header actions: `.workspace-leaf.mod-active .view-action[aria-label="…"]` with labels
  `Add a list`, `Archive completed cards`, `Open as markdown`, `Search...`, `Board view`,
  `Open board settings`.
- Obsidian menus: `.menu .menu-item::<label>`. Command palette: `Mod+p`, then type the command,
  then `Enter`. Kanban commands are prefixed `Kanban: `.
- File explorer entries: `.nav-file-title[data-path="Board.md"]`.

`eval` is for observing state. Never use it to perform the action you're verifying. Calling
plugin internals proves nothing about the UI path.

## Evidence

```sh
$K snap <step-name>                 # NN-<step>.png, NN-<step>.outline.txt, NN-<step>.<active file>
$K snap <step-name> --clip '<loc>'  # screenshot of just that element (for visual checks)
```

To show a change to a person, record it: start `$K record <name> --seconds N --label 'BEFORE 2.0.55'`
in the background, drive the UI, and it writes `evidence/<name>.mp4` (needs ffmpeg and ImageMagick).
Frames carry the time they were captured, and each is held until the next arrives, so a freeze shows at
its true length as the clock jumping. Compare builds with `launch --build-dir`.

Fixtures live in `fixtures/<name>/` and are copied into each run's vault: `basic` (default),
`wide` (8 lanes incl. CJK titles, wider than the window) and `note-folder` (boards with a
configured and a missing `new-note-folder`). Add a fixture rather than editing state through `eval`.

Evidence lives in `.verify-runs/<run-id>/evidence/` (gitignored) and survives `stop`; the scratch
vault in `.verify-runs/<run-id>/vault/` survives too, as the final on-disk state. Proof standards:

- Drive the real user path (button, menu, drag, palette), the one a bug report or PR describes.
- Snap before and after the action, not just the end state.
- Every mutation needs a disk check: `$K file --expect …` (board saves are debounced ~1–2 s).
  The screen can show a change that never reached the file.
- Run `$K errors` at the end; an uncaught exception during the journey fails it even if the
  screen looks right.
- Report which feature-map journey you drove and the evidence paths.

## Cleanup

```sh
$K stop                  # or: $K stop --run .verify-runs/<id>
```

Kills only the PID this run recorded (plus helper processes whose argv contains this run's unique
profile path), deletes the profile directory, and keeps `evidence/`, `vault/` and `state.json`.
Run it after every attempt, including failed ones. Old runs can be deleted with
`rm -rf .verify-runs/<id>` once their evidence is no longer needed.

## Feature map

`features/README.md` indexes the user-facing features with step-by-step journeys. Use the
matching file as the recipe and cover every entry point it lists, not just the convenient one.

## Mobile emulation

`$K eval 'app.emulateMobile(true)'` reloads the UI in Obsidian's phone mode (the `is-mobile` body
class, mobile Submit buttons, `Platform.isMobile`). The workspace comes back empty; reopen the board
with `$K eval '(async () => { await app.workspace.openLinkText("Board", "", false) })()'` (setup,
not the behavior under test). Emulation has no on-screen keyboard and no iOS focus or touch rules,
so it can show that focus stays put or a button fires once, but only a real phone proves a mobile
fix. Install a test build there with BRAT from a pre-release tag, in a vault outside iCloud.

## Gotchas

- Right-click (`click --right`) does not open the card context menu over CDP. Use the card's
  `More options` button.
- Shortcuts Obsidian binds to the app menu (`Mod+w`, `Mod+q`, `Mod+n`…) can act on a different
  leaf than you expect, or not at all. `Mod+w` closed the board instead of the focused note.
  Close tabs with `.workspace-tab-header::<title> >> .workspace-tab-header-inner-close-button`.
- "New note from card" opens the note in a split. In the narrower board, cards in off-screen
  lanes are not rendered, so locators for them fail. Close the note tab before continuing.
- A drag needs about 1 s over the target before release (`--settle`, default 1000 ms), or nothing
  drops. Within a lane, the other cards shift when the drag starts; `drag` re-measures the target
  after lifting, so always name the target card, not coordinates.
- Drop zones update only on pointer movement. After an autoscroll, release without moving and the
  card lands in the lane that was under the pointer before the scroll. `drag --edge` moves 1 px
  first; a bare `release` doesn't.
- `file --expect` with text already in the file passes instantly. For reorders, expect a string
  that spans the new boundary.
- Archiving keeps the card's text in the file (it moves under `## Archive`), so assert the
  section it lands in, not just that the text is gone.
- If the trust prompt never shows because someone clicked it, launch carries on; if the window
  was closed, `doctor` reports "Obsidian window open: FAIL". Stop and relaunch.
- If a command errors with "CDP … got no reply", a native dialog may be open. Run `doctor` and
  look at a `snap`.
