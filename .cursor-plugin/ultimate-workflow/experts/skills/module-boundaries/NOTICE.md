# Notice

This skill is written in our own words. No text is copied.

| Source | Licence | What it informed |
|---|---|---|
| go.dev module reference and `cmd/go` internal directories; nodejs.org packages; typescriptlang.org module resolution and project references; the Java Language Specification, chapter 7; import-linter, dependency-cruiser, nx.dev and archunit.org documentation; pnpm.io, checked live by the maintainer on 2026-10-20 | Language and tool documentation | Every fact marked [R] |
| mattpocock/skills `setup-ts-deep-modules` ("prove the rules bite", turned around into the loosened-rule check); wshobson/agents `monorepo-management` and `monorepo-architect` (phantom dependencies, tags); tech-leads-club/agent-skills `modular-design-principles`, `coupling-analysis` | MIT | The loosened-rule check, undeclared workspace imports, deep imports past entry points |

Left out: lock files and version ranges (`dependency-discipline`), CI for affected packages (the DevOps engineer), pattern catalogues and absolute rules such as "no direct cross-module imports".
