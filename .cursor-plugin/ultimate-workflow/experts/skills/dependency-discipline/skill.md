# Dependency discipline

Use this when a change adds, removes or upgrades a dependency: a package manifest (`package.json`, `pyproject.toml`, `requirements*.txt`, `go.mod`, `Cargo.toml`, `pom.xml`, `build.gradle`), a lockfile, or new imports of a third-party package. Known vulnerabilities are checked by the dependency audit tool and the security expert; this skill is about whether the dependency should be there and whether the change to it is safe.

## A new dependency

Ask, in order:

1. **Is it needed?** Does the standard library or an existing dependency already do this? A new package for one small function is a cost every install, audit and upgrade pays.
2. **Is it the real package?** Models invent plausible package names, and the invented names repeat, which makes them easy to register maliciously. A name you cannot confirm exists, is the canonical one, and is not a misspelling of a popular package is a finding. Say what you could not check.
3. **Is it maintained?** Recent releases, open issues answered, more than one maintainer for anything on a critical path.
4. **What does it pull in?** A direct dependency can bring dozens of transitive ones. Look at the lockfile diff, not only the manifest.
5. **Is its licence compatible?** A strong copyleft licence (GPL, AGPL) in a proprietary or permissively licensed project is a legal question for the user. An unknown licence is a finding.
6. **Does it run code on install?** Install scripts (`postinstall`, build hooks) execute on every developer machine and CI runner.

## An upgrade

- **One package per change, or a small related group.** A bulk upgrade that breaks the build hides which package did it and cannot be reverted package by package.
- **A major version is a behaviour change.** It needs the changelog or migration notes read, and the code changed where the notes say. A patch or minor version can still break; semantic versioning is a promise, not a guarantee.
- **The lockfile moves with the manifest.** A manifest change without a lockfile change, a hand-edited lockfile, or a lockfile change with no manifest change (unless it is a deliberate refresh) is a finding.
- **Peer-dependency conflicts are resolved, not forced.** `--force`, `--legacy-peer-deps` or an override that silences a conflict ships an untested combination.
- **Ranges.** A dependency moved from an exact version to a wide range (`*`, `latest`, `>=`) in an application lets an unreviewed version ship on the next install.

## Removing a dependency

Search for every import, including dynamic ones (`require` of a computed name, `importlib`, plugin registries, configuration files that name a package) before agreeing it is unused.

## Not a finding

- A dependency the plan names and justifies.
- A lockfile refresh that the change says is deliberate and that only moves versions within the declared ranges.
- A development-only tool in the development dependency group.
- Version pins in a library's manifest that follow the repository's existing policy.
