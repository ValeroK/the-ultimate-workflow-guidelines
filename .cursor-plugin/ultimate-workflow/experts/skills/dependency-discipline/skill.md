---
name: dependency-discipline
description: Use when a change adds, removes or upgrades a dependency - whether it should be there, whether it is the real package, and whether the change to it is safe.
verified: 2026-10-20
---

# Dependency discipline

## Goal

- **Lets the expert catch:** a dependency the standard library or an existing one already covers, an invented or look-alike package name, a lockfile that does not move with the manifest, and an upgrade whose behaviour change was not handled.
- **Applies to:** package manifests (`package.json`, `pyproject.toml`, `requirements*.txt`, `go.mod`, `Cargo.toml`, `pom.xml`, `build.gradle*`, `Gemfile`), their lockfiles, and new imports of a third-party package.
- **Not for:** known vulnerabilities and malicious install scripts (security, with the dependency audit); build reproducibility in CI (devops); workspace packages importing each other (softarch); a published package's own version bump (the language skill).

Sources: **[T]** upstream community skills and research summaries, not checked (see `NOTICE.md`); **[O]** our own reasoning. A row is a prompt to check, not a finding on its own. Whether a package is maintained or exists can be checked only with the web tool; say so when you could not.

## First, establish the target

- **Application or library.** Ranges and pins mean different things in each.
- **The repository's policy** for pins, ranges, dependency groups (`[dependency-groups]`, `devDependencies`) and lockfiles.

## A new dependency

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A new package for what the standard library or an existing dependency does is a cost every install, audit and upgrade pays [T] | A small helper package for one function | The plan names and justifies it |
| Models invent plausible package names, and the names repeat, which makes them easy to register maliciously; a name you cannot confirm is real and canonical is a finding [T] | A new dependency whose name is a near-spelling of a popular one, or that you cannot find | |
| A direct dependency can bring many transitive ones; read the lockfile diff, not only the manifest [T] | Dozens of new lockfile entries for one manifest line | |
| Strong copyleft (GPL, AGPL) in a proprietary or permissive project is a question for the user; weak copyleft (LGPL, MPL) has conditions on linking or files; an unknown licence is a finding [T] | A new dependency under those licences, or with none declared | |

## Upgrades and removals

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| One package per change, or a small related group, so a break can be traced and reverted [T] | A bulk upgrade of many unrelated packages | Packages that must move in lockstep (a framework and its plugins) |
| A major version is a behaviour change: the code changes where the migration notes say [T] | A major bump with no code change beside it | |
| The lockfile moves with the manifest [T] | A manifest change with no lockfile change, a hand-edited lockfile, or a lockfile change with no manifest change | A deliberate refresh within the declared ranges |
| Peer conflicts are resolved, not forced [T] | `--force`, `--legacy-peer-deps` or an override that silences a conflict | |
| An application moved from an exact version to a wide range (`*`, `latest`, `>=`) ships an unreviewed version on the next install [T] | A pin widened in an application manifest | A library declaring the range its consumers may use |
| Before removing a dependency, search dynamic imports too (`importlib`, computed `require`, plugin registries, configuration naming a package) [T] | A removal with no search beyond static imports | |

## Not a finding

- A dependency the plan names and justifies.
- A lockfile refresh the change says is deliberate, moving versions only within the declared ranges.
- A development-only tool in the development dependency group.
- Version pins in a library's manifest that follow the repository's existing policy.
