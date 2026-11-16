---
kanban-plugin: table
---

## Todo

- [ ] Distinct dates @{2026-01-10} then @{2026-01-20}
- [ ] Repeated dates @{2026-01-10} then @{2026-01-10}
- [ ] Invalid before @{not-a-date} then @{2026-01-20}
- [ ] Multiline dates @{2026-01-10}<br>Second line @{2026-01-20}
- [ ] Single date @{2026-01-10}
- [ ] No date

## Done

%% kanban:settings

```
{"kanban-plugin":"table","date-format":"YYYY-MM-DD","date-display-format":"YYYY-MM-DD","link-date-to-daily-note":false,"move-dates":true}
```

%%
