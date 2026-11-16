# Documentation links

The README and published documentation should link only to available project resources.

## Sub-features

- `docs-roadmap` excludes the retired GitHub project link (#1075).

## How to get to it (user POV)

- Open the repository README or the documentation home page.

## Driving it with kv.mjs

Preconditions: repository files available. This check concerns public documentation,
so it does not need a scratch Obsidian instance.

- Check `README.md` and `docs/Obsidian Kanban Plugin.md`. Neither should advertise a
  Development Roadmap or link to `obsidian-kanban/projects/1`.
- If a replacement roadmap is added, follow the rendered link and confirm that it
  reaches an accessible project. Do not substitute the unrelated issues page.

## Gotchas

- The retired URL redirects to the community archive before returning HTTP 404.
