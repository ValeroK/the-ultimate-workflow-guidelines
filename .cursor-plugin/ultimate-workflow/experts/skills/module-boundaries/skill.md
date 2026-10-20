---
name: module-boundaries
description: Use when a change adds or moves a module or package, imports across one, changes what a package exports, or changes the tool that enforces boundaries - Go internal and linkname, Node and TypeScript exports and project references, pnpm workspaces, Nx, dependency-cruiser, import-linter, Java modules, ArchUnit.
verified: 2026-10-20
requires: the ecosystem's own boundary mechanism, where the repository uses one
---

# Module boundaries, ecosystem by ecosystem

## Goal

- **Lets the expert catch:** a change that makes a module's internals reachable, or that weakens the tool that would have refused the new import, in the one mechanism the repository already uses.
- **Applies to:** `go.mod`, `go.work`, `package.json` `exports`, `tsconfig*.json`, `pnpm-workspace.yaml`, `nx.json`, `project.json`, `.dependency-cruiser.*`, `.importlinter` and `[tool.importlinter]`, `module-info.java`, ArchUnit rules and their freeze store.
- **Not for:** lock files, version ranges and third-party dependencies (developer, `dependency-discipline`); a published package's version bump (developer); whether the boundary check runs in CI (devops) or can fail as a gate (quality).

Sources: **[R]** the maintainer's live check of the language and tool documentation (go.dev, nodejs.org, typescriptlang.org, pnpm.io, the Java Language Specification, import-linter, dependency-cruiser, nx.dev, archunit.org; 2026-10-20); **[T]** a third-party page, not checked; **[O]** our own reasoning. A [T] or [O] item is a prompt to check, not a finding on its own.

## First, establish the target

- **Which mechanism the repository uses.** Check only that one; where it uses none, the convention method in your review reference applies.
- **Where the rules live.** import-linter reads `.importlinter`, `setup.cfg` or `pyproject.toml` `[tool.importlinter]`, with five contract types (`forbidden`, `protected`, `layers`, `independence`, `acyclic_siblings`) [R]. dependency-cruiser `forbidden` rules match `from.path` and `to.path` by regular expression, `to.path` may use `$1` from `from.path`, and `to: { circular: true }` forbids cycles [R]. Java code on the class path (the unnamed module) is not encapsulated by modules [R].
- **The versions.** pnpm from `packageManager`: below 11, 11, or 12.7.0 and later change which file holds workspace settings (below). The Go toolchain for `linkname` (1.23). TypeScript `moduleResolution`.
- The compiler already refuses an illegal Go `internal` import, a missing ES-module extension under `node16`, a project-reference cycle, a cross-project import with no `references` entry (TS6307, a secondary source for the code), and a split package between named Java modules; do not report those.
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## Go

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Code under `internal/` is importable only below its parent [R], so the finding is a package moved out of `internal/` or its exported API widened [O] | A directory renamed out of `internal/`, or new exported names in an `internal` package used across the module | The package is meant to be public and the plan says so |
| A module at v2 or later ends its path with `/vN`; v0 and v1 must not [R] | A v2 tag, or a breaking change to a v1 module, with no path change | |
| From Go 1.23 the linker refuses `//go:linkname` to standard-library symbols not marked for it; `-ldflags=-checklinkname=0` bypasses it [R] | `//go:linkname` added, or `-checklinkname=0` in build flags | `linkname` between the repository's own packages, which still breaks encapsulation [O] |

## Node, TypeScript and pnpm

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| With `exports` in `package.json`, Node refuses an unlisted subpath (`ERR_PACKAGE_PATH_NOT_EXPORTED`) [R]; removing or renaming a key breaks that subpath's consumers [O] | A key removed or renamed in `exports`, or an import into another workspace package's `src/` or `dist/` | |
| TypeScript reads `exports` only under `moduleResolution` `node16`, `nodenext` or `bundler`, not `node10`; `resolvePackageJsonExports: false` turns it off [R]. Under `node10` a deep import compiles and Node refuses it at run time [O] | A deep import in a project on `node10`, or `resolvePackageJsonExports: false` added | |
| Without `noEmitOnError`, `tsc` emits outputs despite errors, so an incremental build treats a broken referenced project as up to date [R] | A project-references setup whose shared config drops or lacks `noEmitOnError: true` | One-shot builds whose output is discarded on failure |
| A workspace package importing something its own manifest does not declare resolves only through hoisting, and breaks when installed alone [O] | A new import of a sibling package with no dependency entry | |
| pnpm reads workspace members from `pnpm-workspace.yaml`, and warns when `package.json` `workspaces` differs; from 12.7.0, `pnpm install` creates the file from `workspaces` when absent [R] | A new package directory matched by `workspaces` but not by `packages` in an existing `pnpm-workspace.yaml` | pnpm 12.7.0 or later with no `pnpm-workspace.yaml` |
| From pnpm 11 the `pnpm` field in `package.json` is ignored; settings belong in `pnpm-workspace.yaml` [R] | `"pnpm": { ... }` added to `package.json` on pnpm 11 or later | pnpm 10 or earlier |
| A plain range to a sibling links the local package only while its version satisfies the range, and silently falls back to the registry otherwise; `workspace:` refuses anything but the local package [R] | An internal dependency written as `^1.0.0` instead of `workspace:` | Testing against an older published version on purpose |
| pnpm replaces `workspace:` ranges with real versions on `pnpm pack` and `pnpm publish`; a plain `npm publish` does not, and ships a broken manifest [R] | A publish script using `npm publish` in a pnpm workspace | |

## Nx and dependency-cruiser

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| `@nx/enforce-module-boundaries` `depConstraints`: `notDependOnLibsWithTags` follows the whole tree, `onlyDependOnLibsWithTags` checks direct dependencies only, and `allow` entries bypass the rule [R] | A new `allow` entry or a changed tag in the same diff as the import it would refuse | |
| dependency-cruiser's exit code is the number of `error` violations; `warn` and `info` exit 0 [R] | A rule's `severity` lowered from `error`, `pathNot` widened, or the cycle rule given an exception for the new import | A wrapper that fails on warnings |

## Python: import-linter

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| An unmatched `ignore_imports` entry is an error by default; `unmatched_ignore_imports_alerting = warn` or `none` weakens it [R] | That option added, a new `ignore_imports` entry for the import the diff adds, a contract removed, or layers reordered | |
| `forbidden` contracts see external packages only with `include_external_packages = True`, and then only root-level names (`django`, not `django.db.models`) [R] | An external package added to `forbidden_modules` without that setting, or as a dotted subpackage | |
| An `_private` module imported from another package crosses a boundary the language does not enforce [O] | `from other_pkg._internal import ...` | The repository's linter already enforces private names |

## Java modules and ArchUnit

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A package is usable by other modules at compile time only if `module-info.java` exports it; `opens` grants reflective access at run time only [R]. A new `exports` or `opens` for an implementation package widens the API [O] | `exports` or `opens` added for an `impl` or `internal` package | |
| `FreezingArchRule` fails on a new violation unless `freeze.refreeze=true` (default false) [R]; in CI, `freeze.store.default.allowStoreCreation=false` also fails a rule whose store was not committed [R] | `freeze.refreeze=true` in `archunit.properties`, or new lines in the violation store in the same diff as the violating code | The first freeze of an existing codebase, recorded as such in the plan |

## Not a finding

- An import that follows the repository's own convention, even where you would draw the boundary elsewhere.
- A boundary tool the repository does not use: do not ask for one.
- A test file reaching into its own module's internals.
- Type-only imports excluded from a cycle rule, when the repository excludes them elsewhere.
