---
kanban-plugin: board
---

## Now

- [ ] Short
- [ ] Some text before the list
  - [ ] item 1
  - [ ] item 2
- [ ] this is a test

  > [!note]- a callout
  > this should be hidden by default

- [ ] > A blockquote
- [ ] > [!note] Known callout
      > Callout contents

## List

- [ ] Task

## Nested

- [ ] ![[Board#List]] #render @{2026-11-17}
- [ ] ![[Source#Tasks]]

%% kanban:settings

```
{"kanban-plugin": "board", "show-checkboxes": true, "move-dates": false, "date-format": "YYYY-MM-DD", "link-date-to-daily-note": false, "tag-colors": [{"tagKey": "#render", "color": "#ff0000", "backgroundColor": "#ffff00"}], "date-colors": [{"isAfter": true, "color": "#00ff00"}]}
```

%%
