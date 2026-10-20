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

## When not to add structure

The repository's current shape is the default. Matching it beats improving it. Do not refactor code you were not asked to touch. A little duplication costs less than the wrong abstraction. A class that wraps a third-party client at a boundary is already justified, and so is a closed switch over an enum.
