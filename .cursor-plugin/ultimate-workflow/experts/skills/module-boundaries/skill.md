---
name: module-boundaries
description: Use when a change adds or moves a module or package, imports across one, or changes what a package exports: Go internal, Node and TypeScript exports, project references, Nx, dependency-cruiser, import-linter, Java modules.
---

# Module boundaries, ecosystem by ecosystem

Use this when a change adds or moves a module or package, imports across one, changes what a package exports, or changes the tool that enforces boundaries. For each ecosystem, check only the mechanism the repository already uses; where it uses none, the convention method in your review reference applies instead. Lock files and version ranges are `dependency-discipline`'s; CI for affected packages is the DevOps engineer's.

Each fact carries its source: **[R]** the maintainer's check of the language and tool documentation (go.dev, nodejs.org, typescriptlang.org, the Java Language Specification, import-linter, dependency-cruiser, nx.dev, archunit.org, pnpm.io; 2026-10-20); **[O]** our own reasoning.

**A rule loosened in the same change that crosses it.** Across every ecosystem: a boundary rule, contract, tag constraint, allow-list or frozen-violation store that changes in the same diff as the import it would have refused. The change hides the break instead of handling it [O]. Name the rule and the import.

## Go

- Code in or below a directory named `internal` can be imported only by code under the parent of `internal` [R]. The compiler refuses an illegal import, so the finding is a package moved out of `internal/`, or its exported API widened, which makes it importable by everyone [O].
- A module at major version 2 or above must end its path with `/vN`; v0 and v1 must not [R]. A v2 tag or a breaking change to a v1 module with no path change is a finding [O].

## Node and TypeScript

- When `package.json` has `exports`, Node refuses any subpath it does not list (`ERR_PACKAGE_PATH_NOT_EXPORTED`) [R]. Removing or renaming a key in `exports` breaks consumers of that subpath [O]; an import into another workspace package's `src/` or `dist/` bypasses its entry points [O].
- TypeScript reads `exports` only under `moduleResolution` `node16`, `nodenext` or `bundler`, and not under `node10` (`node`); `resolvePackageJsonExports: false` turns it off [R]. Under `node10` a deep import compiles while Node refuses it at run time [O].
- `node16` and `nodenext` require file extensions on relative imports in ES modules; `bundler` and `node10` do not [R].
- A referenced project needs `composite: true`, which forces `declaration` and requires every implementation file to be included [R]. Project references may not form a cycle [R]. A new import across projects with no matching `references` entry, or a new `.ts` file outside a composite project's `include`, breaks the build [O].
- A workspace package that imports something its own manifest does not declare resolves only through hoisting, and breaks when installed alone [O].

## Nx

- `@nx/enforce-module-boundaries` takes `depConstraints`, each with `sourceTag` or `allSourceTags` and `onlyDependOnLibsWithTags` or `notDependOnLibsWithTags`, and forbids deep and relative imports across projects [R]. `notDependOnLibsWithTags` follows the whole dependency tree; `onlyDependOnLibsWithTags` checks direct dependencies only [R]. Entries in the rule's `allow` option bypass it [R]: a new `allow` entry or a changed tag in the same diff as the import is the loosened-rule finding above.

## dependency-cruiser

- `forbidden` rules match `from.path` and `to.path` by regular expression, and `to.path` can refer to groups captured in `from.path` as `$1` [R]. `to: { circular: true }` forbids cycles, and type-only imports can be excluded from it [R]. A rule's `pathNot` widened, its severity lowered, or the cycle rule given an exception for the new import, is the loosened-rule finding [O].

## Python: import-linter

- Configuration lives in `.importlinter`, `setup.cfg` or `pyproject.toml` under `[tool.importlinter]` [R].
- Five contract types are built in: `forbidden`, `protected`, `layers`, `independence` and `acyclic_siblings` [R]. Layers are required unless written in parentheses [R].
- An `ignore_imports` entry that no longer matches an import is an error by default [R]. A new `ignore_imports` entry for the import the diff adds, a contract removed, or layers reordered, is the loosened-rule finding [O].
- An `_private` module imported from another package crosses a boundary the language does not enforce [O].

## Java modules and ArchUnit

- A package is usable by other modules at compile time only if `module-info.java` exports it; `opens` grants reflective access at run time only [R]. A new `exports` or `opens` for an implementation package widens the module's API [O].
- A module may not read two modules that export the same package, and a layer with one class loader may not hold two modules with the same package [R]. Two modules in the repository that declare classes in the same package is a split package [O].
- ArchUnit's `FreezingArchRule` records existing violations and reports only new ones [R]. New entries added to the violation store in the same diff as the code that violates the rule silence it [O].
- Code on the class path (the unnamed module) is not encapsulated by modules [R].
