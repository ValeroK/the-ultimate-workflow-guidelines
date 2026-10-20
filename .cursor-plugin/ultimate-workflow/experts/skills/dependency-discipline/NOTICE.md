# Notice

This skill is written in our own words. No text is copied.

Sources compared on 2026-10-20, ideas only; the rows they informed are marked [T].

| Source | Version or commit, date checked | Licence | What it informed |
|---|---|---|---|
| addyosmani/agent-skills, `code-review-and-quality` (its dependency discipline section) | Read 2026-10-20 | MIT | The questions before adding a dependency, one package per upgrade, reading the changelog, reviewing the lockfile diff, never hand-editing the lockfile |
| alirezarezvani/claude-skills, `dependency-auditor` | Read 2026-10-20 | MIT | Licence classes (permissive, weak and strong copyleft, unknown) and upgrade risk by version type. Its bundled scanner scripts were not run or adapted |
| wshobson/agents, `dependency-upgrade` | Read 2026-10-20 | MIT | Staged upgrades and peer-dependency handling. Its suggestion to resolve conflicts with `--legacy-peer-deps` or `--force` was rejected |
| Spracklen et al., "We Have a Package for You!", USENIX Security 2025 (checked in the research pass) | Read 2026-10-20 | Paper | Models invent package names and the invented names repeat |

Install scripts and version ranges in applications come from our own review experience.
