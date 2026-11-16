# Credits

This fork exists because of the people who built Kanban, reported its bugs and sent fixes for them. Thank you.

- **[@mgmeyers](https://github.com/mgmeyers)** created the plugin and maintained it for years.
- Everyone below found a bug or wrote a fix that is in this fork. Links go to the upstream repository.

## Pull requests merged from upstream

Merged with the author's own commits, so they also appear in the commit history.

| Pull request                                                                                                                                                   | Author                                               | First released in |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------- |
| [#1008](https://github.com/community-archive/obsidian-kanban/pull/1008) Fix bug in date display color overriding 'before' ranges                               | [@petermeglis](https://github.com/petermeglis)       | 2.0.53            |
| [#1012](https://github.com/community-archive/obsidian-kanban/pull/1012) Use standard icon size variables                                                       | [@kepano](https://github.com/kepano)                 | 2.0.53            |
| [#1147](https://github.com/community-archive/obsidian-kanban/pull/1147) Fix keyboard shortcuts broken after adding new cards                                   | [@mrdonado](https://github.com/mrdonado)             | 2.0.53            |
| [#1156](https://github.com/community-archive/obsidian-kanban/pull/1156) Make mobile 'Submit' button work with a single tap                                     | [@eddiewastaken](https://github.com/eddiewastaken)   | 2.0.53            |
| [#1169](https://github.com/community-archive/obsidian-kanban/pull/1169) fix: Ensure empty priority would be interpreted with correct value                     | [@HsiuCL](https://github.com/HsiuCL)                 | 2.0.53            |
| [#1179](https://github.com/community-archive/obsidian-kanban/pull/1179) fix: Reduce drag scroll speed to prevent overshooting columns (#1110)                  | [@BradGroux](https://github.com/BradGroux)           | 2.0.53            |
| [#1188](https://github.com/community-archive/obsidian-kanban/pull/1188) Fix: stop silently failing when failing to create new notes. fixes #1028               | [@RobTheFiveNine](https://github.com/RobTheFiveNine) | 2.0.53            |
| [#1216](https://github.com/community-archive/obsidian-kanban/pull/1216) fix: cards use --radius-m instead of --input-radius (fixes iOS/iPadOS 26 blob corners) | [@mixflavor](https://github.com/mixflavor)           | 2.0.53            |
| [#1222](https://github.com/community-archive/obsidian-kanban/pull/1222) Fix: date/time-trigger syntax leaking into filename on "New note from Card"            | [@yhbarve](https://github.com/yhbarve)               | 2.0.53            |
| [#1226](https://github.com/community-archive/obsidian-kanban/pull/1226) fix: reject whitespace-only card and list titles                                       | [@laohei996](https://github.com/laohei996)           | 2.0.53            |
| [#1228](https://github.com/community-archive/obsidian-kanban/pull/1228) fix: validate configured new-note folders                                              | [@laohei996](https://github.com/laohei996)           | 2.0.53            |
| [#1229](https://github.com/community-archive/obsidian-kanban/pull/1229) fix: prevent link drop navigation                                                      | [@laohei996](https://github.com/laohei996)           | 2.0.53            |
| [#1244](https://github.com/community-archive/obsidian-kanban/pull/1244) Fix upside-down CJK in collapsed lane titles                                           | [@SamTech37](https://github.com/SamTech37)           | 2.0.53            |
| [#1151](https://github.com/community-archive/obsidian-kanban/pull/1151) fix:Save card on lost focus if not empty                                               | [@codingseb](https://github.com/codingseb)           | 2.0.54            |
| [#1087](https://github.com/community-archive/obsidian-kanban/pull/1087) Add spanish localization                                                               | [@Rikiub](https://github.com/Rikiub)                 | 2.0.55            |
| [#1150](https://github.com/community-archive/obsidian-kanban/pull/1150) feat: Add some Korean translation to KanbanView                                        | [@writing-sky](https://github.com/writing-sky)       | 2.0.55            |
| [#1214](https://github.com/community-archive/obsidian-kanban/pull/1214) feat(i18n): add Traditional Chinese (Taiwan) zh-TW locale                              | [@mixflavor](https://github.com/mixflavor)           | 2.0.55            |
| [#1240](https://github.com/community-archive/obsidian-kanban/pull/1240) Update Ukrainian translations in locale file                                           | [@futurebyte22](https://github.com/futurebyte22)     | 2.0.55            |

## Fixes based on upstream pull requests

These pull requests found the bug and proposed a fix. The fork fixed it differently, so the commits are not theirs. Future fixes like these credit the author with a `Co-authored-by` line.

| Pull request                                                                                                                                               | Author                                     | First released in |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------- |
| [#1221](https://github.com/community-archive/obsidian-kanban/pull/1221) fix: clear stale kanbanFileModes, enable \_loaded flag, fallback window in addView | [@akinard](https://github.com/akinard)     | 2.0.55            |
| [#1227](https://github.com/community-archive/obsidian-kanban/pull/1227) Fix preserving Markdown mode after leaving Kanban                                  | [@laohei996](https://github.com/laohei996) | 2.0.55            |

## Bug reports

Each of these reports led to a fix in the fork.

| Issue                                                                                                                                                                               | Reported by                                            | Fixed in |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------- |
| [#831](https://github.com/community-archive/obsidian-kanban/issues/831) multi date tag colors [ between now and [x] before now ] longest x overide other x's color                  | [@xtmu](https://github.com/xtmu)                       | 2.0.53   |
| [#996](https://github.com/community-archive/obsidian-kanban/issues/996) New notes from cards notes not created in folder set in "Note folder"                                       | [@chigh](https://github.com/chigh)                     | 2.0.53   |
| [#1028](https://github.com/community-archive/obsidian-kanban/issues/1028) Silent error when failing to create a new note from a card                                                | [@RobTheFiveNine](https://github.com/RobTheFiveNine)   | 2.0.53   |
| [#1098](https://github.com/community-archive/obsidian-kanban/issues/1098) In boardview, when list is collapsed, Chinese Characters in the list title are upside down                | [@zhao414](https://github.com/zhao414)                 | 2.0.53   |
| [#1110](https://github.com/community-archive/obsidian-kanban/issues/1110) Scroll speed too fast                                                                                     | [@jonchoi](https://github.com/jonchoi)                 | 2.0.53   |
| [#1132](https://github.com/community-archive/obsidian-kanban/issues/1132) Plugin blocks using keyboard shortcuts after switching to Markdown view                                   | [@nazoadiego](https://github.com/nazoadiego)           | 2.0.53   |
| [#1137](https://github.com/community-archive/obsidian-kanban/issues/1137) New note from card                                                                                        | [@Rafael-Support](https://github.com/Rafael-Support)   | 2.0.53   |
| [#1160](https://github.com/community-archive/obsidian-kanban/issues/1160) Dropping link on board causes the link to be opened                                                       | [@pjeby](https://github.com/pjeby)                     | 2.0.53   |
| [#1203](https://github.com/community-archive/obsidian-kanban/issues/1203) Whitespace-only card and list titles are accepted with no validation                                      | [@prdai](https://github.com/prdai)                     | 2.0.53   |
| [#1204](https://github.com/community-archive/obsidian-kanban/issues/1204) CJK character orientation in collapsed lists                                                              | [@stevency](https://github.com/stevency)               | 2.0.53   |
| [#1215](https://github.com/community-archive/obsidian-kanban/issues/1215) Cards render absurdly rounded on iOS/iPadOS 26 (card borrows --input-radius)                              | [@mixflavor](https://github.com/mixflavor)             | 2.0.53   |
| [#1217](https://github.com/community-archive/obsidian-kanban/issues/1217) Collapsed column header renders CJK upside-down (rotate(180deg) flips glyphs in vertical writing mode)    | [@mixflavor](https://github.com/mixflavor)             | 2.0.53   |
| [#662](https://github.com/community-archive/obsidian-kanban/issues/662) Feature Request: Switching between Kanban- and Markdown-View                                                | [@tomo-one](https://github.com/tomo-one)               | 2.0.55   |
| [#666](https://github.com/community-archive/obsidian-kanban/issues/666) Switching away from kanban board no longer maintain reading-mode status in split pane layout                | [@TommyX12](https://github.com/TommyX12)               | 2.0.55   |
| [#624](https://github.com/community-archive/obsidian-kanban/issues/624) Dropping live preview link in 0.16 creates an invisible link                                                | [@pjeby](https://github.com/pjeby)                     | 2.0.56   |
| [#632](https://github.com/community-archive/obsidian-kanban/issues/632) new note from card discards urls                                                                            | [@martinhath](https://github.com/martinhath)           | 2.0.56   |
| [#695](https://github.com/community-archive/obsidian-kanban/issues/695) Local Setting maximum number of archived card doesn't work                                                  | [@GustavoSZ124](https://github.com/GustavoSZ124)       | 2.0.56   |
| [#735](https://github.com/community-archive/obsidian-kanban/issues/735) plugin options (settings dialog) freezes                                                                    | [@cernekj](https://github.com/cernekj)                 | 2.0.56   |
| [#830](https://github.com/community-archive/obsidian-kanban/issues/830) "Copy Link to Card" links to wrong card, if the card was created by "Duplicate card"                        | [@PeterP2](https://github.com/PeterP2)                 | 2.0.56   |
| [#848](https://github.com/community-archive/obsidian-kanban/issues/848) card title gets badly formatted                                                                             | [@jccalvojackson](https://github.com/jccalvojackson)   | 2.0.56   |
| [#902](https://github.com/community-archive/obsidian-kanban/issues/902) Can't drag and drop cards                                                                                   | [@sharetocreate](https://github.com/sharetocreate)     | 2.0.56   |
| [#1000](https://github.com/community-archive/obsidian-kanban/issues/1000) Multiple dates can be inserted with `@`, but only the first one can be edited                             | [@MicaelJarniac](https://github.com/MicaelJarniac)     | 2.0.56   |
| [#1016](https://github.com/community-archive/obsidian-kanban/issues/1016) Tag removed and used in the note title when creating new note from task                                   | [@bpthecodeman](https://github.com/bpthecodeman)       | 2.0.56   |
| [#1024](https://github.com/community-archive/obsidian-kanban/issues/1024) Table error display                                                                                       | [@PYUWAT](https://github.com/PYUWAT)                   | 2.0.56   |
| [#1246](https://github.com/community-archive/obsidian-kanban/issues/1246) Board search matches the wrong cards after the board is re-parsed (titleSearch is excluded from the diff) | [@kagetora0924](https://github.com/kagetora0924)       | 2.0.56   |
| [#516](https://github.com/community-archive/obsidian-kanban/issues/516) Markdown links makes date selector wrong                                                                    | [@shanming-cjx](https://github.com/shanming-cjx)       | 2.0.57   |
| [#670](https://github.com/community-archive/obsidian-kanban/issues/670) Slow down / freeze, when opening "new note from card"                                                       | [@StanSmooth](https://github.com/StanSmooth)           | 2.0.57   |
| [#779](https://github.com/community-archive/obsidian-kanban/issues/779) Typing lag if opened in split window                                                                        | [@secastles](https://github.com/secastles)             | 2.0.57   |
| [#811](https://github.com/community-archive/obsidian-kanban/issues/811) Calendar cursor navigation does not consider alternate first day of the week                                | [@Novbert](https://github.com/Novbert)                 | 2.0.57   |
| [#984](https://github.com/community-archive/obsidian-kanban/issues/984) When creating a list, toggling "Mark card in this list as complete", did not make a "completed" list.       | [@syaifurrizal](https://github.com/syaifurrizal)       | 2.0.57   |
| [#1036](https://github.com/community-archive/obsidian-kanban/issues/1036) Time until: not working properly                                                                          | [@Mm0p](https://github.com/Mm0p)                       | 2.0.57   |
| [#1048](https://github.com/community-archive/obsidian-kanban/issues/1048) Date colors don't update when the date changes                                                            | [@simeonrediger](https://github.com/simeonrediger)     | 2.0.57   |
| [#1051](https://github.com/community-archive/obsidian-kanban/issues/1051) Unwanted scroll when draggin a card from one board to another (two or more board open on different panes) | [@STP404](https://github.com/STP404)                   | 2.0.57   |
| [#296](https://github.com/community-archive/obsidian-kanban/issues/296) Can't always drag to bottom of different list                                                               | [@pjeby](https://github.com/pjeby)                     | 2.0.58   |
| [#656](https://github.com/community-archive/obsidian-kanban/issues/656) date colors not affecting text nor the relative date                                                        | [@Rhydderch](https://github.com/Rhydderch)             | 2.0.58   |
| [#680](https://github.com/community-archive/obsidian-kanban/issues/680) Turn off the tab title bar but still exist in kanban view                                                   | [@Lynx3x](https://github.com/Lynx3x)                   | 2.0.58   |
| [#754](https://github.com/community-archive/obsidian-kanban/issues/754) "Copy Link to Card" links don't work as expected                                                            | [@qustrolabe](https://github.com/qustrolabe)           | 2.0.58   |
| [#867](https://github.com/community-archive/obsidian-kanban/issues/867) Checkbox linked from an other part of the file is not updated on checked                                    | [@Owllyy](https://github.com/Owllyy)                   | 2.0.58   |
| [#1066](https://github.com/community-archive/obsidian-kanban/issues/1066) Daily Notes Settings should be respected                                                                  | [@Swivelgames](https://github.com/Swivelgames)         | 2.0.58   |
| [#1070](https://github.com/community-archive/obsidian-kanban/issues/1070) Cards moved to a "Complete" list aren't marked as complete                                                | [@jcelliott](https://github.com/jcelliott)             | 2.0.58   |
| [#1075](https://github.com/community-archive/obsidian-kanban/issues/1075) README contains link to roadmap, but the link is broken                                                   | [@honzajavorek](https://github.com/honzajavorek)       | 2.0.58   |
| [#1094](https://github.com/community-archive/obsidian-kanban/issues/1094) Tag colour doesn't reset                                                                                  | [@HarisDotParis](https://github.com/HarisDotParis)     | 2.0.58   |
| [#1096](https://github.com/community-archive/obsidian-kanban/issues/1096) error message in console on renaming kanban board                                                         | [@dictionarymouse](https://github.com/dictionarymouse) | 2.0.58   |
| [#1111](https://github.com/community-archive/obsidian-kanban/issues/1111) Glitch when moving card between lists with board displayed in a narrow tab                                | [@chafer31415](https://github.com/chafer31415)         | 2.0.58   |
| [#1121](https://github.com/community-archive/obsidian-kanban/issues/1121) Resizing Collumns in Table View inside a floating Window unresponsive                                     | [@IndieC](https://github.com/IndieC)                   | 2.0.58   |
| [#1248](https://github.com/community-archive/obsidian-kanban/issues/1248) Error: kanban locale not found en-GB plugin: obsidian-kanban:131                                          | [@iand66](https://github.com/iand66)                   | 2.0.58   |
