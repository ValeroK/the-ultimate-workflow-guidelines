# Engineering brief

This applies to every line you write, in tests and in code. It adds no work: if the plan does not ask for something, do not build it. Where this brief and the plan disagree, the plan wins.

## Before you write

- Search the repository for how it already does this: a helper, a base type, error handling, how clients are passed in. Reuse it. Match its names and structure even where you would have chosen differently.
- Find the repository's lint, format and type-check commands (build files, CI config, pre-commit). Run them before you report done and fix what they report. Do not argue with a linter in prose.

## While you write

- Build the concrete thing. Add an interface, base class, factory, registry or wrapper only when a second real user exists today, in the code or in the plan. With one user, write the concrete code.
- Give a function one job. If you can name a second, unrelated reason it would change, such as storing and formatting, split it. A long, linear function that does one thing is fine.
- Extend the way the repository extends. If it dispatches by type with polymorphism, add a variant that way instead of another branch in an if chain. A switch over a closed set of values is fine.
- Subclass only when the child can stand in for the parent everywhere. Never override to disable behaviour, narrow it, or raise not-implemented. Use composition.
- Take clients and configuration as parameters where the repository does. Do not construct them inside business logic.
- Fail where the failure is. No empty catch, no default value returned on error, no fallback to a stub outside tests, no broad catch that would also hide unrelated errors. If a fallback is required, make it visible (a log line, a metric, or the return value) and say so in your summary.
- Call existing code instead of copying it. If two copies must exist because they change for different reasons, leave them.
- A parameter that switches between two behaviours becomes two functions. A true on/off toggle stays.
- Name things for what they do. A name that says one thing while the code does another is a bug. Give a bare number or string its unit, or a name, when its meaning is not obvious.
- Add nothing that nothing in this change uses: no parameter, hook, option or layer for later. No new dependency where the standard library or an existing one does the job.
- Do not return or store an object that a caller could then alter, and no mutable default arguments.
- Every line you change traces to the task. Do not reformat, rename or reword code the change does not need. List what you noticed but did not change as follow-ups in your summary.
- Keep a property of a thing next to the thing. Do not add a second list, keyed by its name, that the next change must remember to edit.
- Before you remove something, find out why it is there.

## When not to add structure

The repository's current shape is the default. Matching it beats improving it. Do not refactor code you were not asked to touch. A little duplication costs less than the wrong abstraction. A class that wraps a third-party client at a boundary is already justified, and so is a closed switch over an enum.

## Skills

The build command selects these in code from the plan, by the rule in parentheses, and passes their text with this brief: `files` matches file names the plan mentions, `added` matches the plan's text, `always` always applies. The order is the order of priority when they would not all fit. This section is not part of the brief the implementer reads.

- `experts/skills/failure-handling/skill.md` (added: \b(catch|except|rescue|recover|finally|retry|fallback|rollback)\b|\.catch\(|Err\(|unwrap_or|err != nil|throw |raise |error path|error handling): load when the plan adds error paths, fallbacks, retries or multi-step writes.
- `experts/skills/python-craft/skill.md` (files: *.py, *.pyi): load when the plan touches Python files.
- `experts/skills/typescript-craft/skill.md` (files: *.ts, *.tsx, *.mts, *.cts, *.js, *.jsx, *.mjs, *.cjs): load when the plan touches TypeScript or JavaScript files.
- `experts/skills/react-craft/skill.md` (files: *.tsx, *.jsx): load when the plan touches React components or hooks.
- `experts/skills/go-craft/skill.md` (files: *.go, go.mod): load when the plan touches Go files.
- `experts/skills/rust-craft/skill.md` (files: *.rs, Cargo.toml): load when the plan touches Rust files.
- `experts/skills/java-craft/skill.md` (files: *.java, pom.xml, build.gradle, build.gradle.kts): load when the plan touches Java files.
- `experts/skills/dependency-discipline/skill.md` (files: package.json, package-lock.json, yarn.lock, pnpm-lock.yaml, requirements*.txt, pyproject.toml, uv.lock, poetry.lock, Pipfile, Pipfile.lock, go.mod, go.sum, Cargo.toml, Cargo.lock, pom.xml, build.gradle, build.gradle.kts, Gemfile, Gemfile.lock): load when the plan changes a package manifest or lockfile.
- `experts/skills/surgical-change/skill.md` (always): load when writing any change, to keep every line traced to the task.
- `experts/skills/simplification/skill.md` (always): load when writing any change, to keep it from growing structure it does not need.
- `experts/skills/engineering-principles/skill.md` (always): load when writing any change, for what each principle means and when it does not apply.
