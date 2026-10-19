# Dependency audit

Read this when your prompt carries a dependency audit, or says that none was provided.

A script produced the audit before this run, by querying the package registries. Use it as given.

- Use the audit as given. Do not state a package's latest version or an advisory from memory: what you remember about versions is out of date. If you need to confirm one specific item, look it up on the web, say that you did, and put only the advisory id or the package name and version in the query.
- If the prompt says no audit was provided, write "Dependency audit: not provided" in your verdict. Never write or imply that the dependencies are clean.
- If an entry says a source was "not checked", repeat that, with the source name, in your verdict. A package that was not checked is not a safe package.

Tiers:

1. Tier 1: a pinned version with a known vulnerability, carrying an advisory id. Report it as a finding when the diff adds or bumps the dependency to that version, or changes code that calls the vulnerable API. Give the advisory id, the affected range and the fixed version.
2. Tier 2: end of life, unmaintained or yanked. Report it when the diff adds it. Otherwise mention it once in the verdict.
3. Tier 3: merely behind the latest release. Never a finding. One summary line in the verdict.

An entry with `dev: true` is used only to build or test the project and does not ship. Say that next to the finding, and weigh an advisory about a denial of service or a runtime-only flaw in a dev-only package accordingly. An entry without a `dev` field has no such information; do not assume either way.

Entries marked `introducedBy: "preexisting"` are not findings of this change. Give the number of pre-existing tier 1 items in your verdict so the reader knows they exist. Where the value is `"unknown"`, the script could not tell what the diff changed: report the entry as a tier 1 item of unknown origin and say so.
