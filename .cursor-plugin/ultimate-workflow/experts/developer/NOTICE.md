# Notice

The developer expert's checklists restate ideas from the open-source review guides below. No text is copied; the wording is our own. They are credited here because the ideas are theirs.

| Source | Licence | What the ideas informed |
|---|---|---|
| affaan-m/ECC, its code-reviewer agent | MIT | The evidence gate before a finding, high severity needing proof, and the list of false positives that became the "Do not report" list |
| addyosmani/agent-skills, `code-review-and-quality`, `code-simplification`, `api-and-interface-design` | MIT | Complexity relocated rather than removed, feature logic leaking into shared code, near-duplicates of a canonical helper, the second-caller test for an abstraction, "maintain balance" |
| anthropics/claude-plugins-official, `pr-review-toolkit` agents (silent-failure hunter, type-design analyser) | Apache-2.0 | Swallowed failures and fallbacks that make failure look like success |

Trail of Bits `sharp-edges` (CC BY-SA 4.0) shaped the "wrong or hidden meaning" category (a zero or empty value that disables a check). Only the idea is used; nothing is copied, so its share-alike terms are not triggered. If text from it is ever adapted, this file and the licence of the adapted file must change first.

The sources were read as data. None of their scripts, hooks or fetches are used.

## Primary sources checked on 2026-10-20

A research pass (run outside the build session, returned by the maintainer) gave each claim a URL and a quote. Only sources that are the author's or vendor's own page are listed as support. Nothing is copied.

| Source | What it supports |
|---|---|
| Sandi Metz, "The Wrong Abstraction" (sandimetz.com, 2016) | Duplication is cheaper than the wrong abstraction; the basis for the flag-and-branch-in-a-shared-helper check |
| Google engineering practices, reviewer guide: "What to look for", "The standard of code review", "How to write code review comments" (google.github.io/eng-practices) | Over-engineering is solving a problem that might exist later; style is only what the style guide says; label optional comments |
| Martin Fowler, "Flag Argument" (martinfowler.com/bliki/FlagArgument.html) | The flag-that-switches-behaviour check, and its exceptions (a passed-through value, a private helper) |
| Robert C. Martin, "The Open-Closed Principle" (objectmentor.com/resources/articles/ocp.pdf) | The growing type switch |
| Microsoft engineering playbook, code reviews | Mechanical checks belong in CI, not in review comments |
| Language and tool documentation: Ruff (blind-except, unused-import), mypy strict, typescript-eslint, `go vet`, Checkstyle, the Rust book, the Python tutorial on errors, Effective Go, Microsoft .NET exception guidance | What a linter already catches (so the review leaves it), swallowed errors, and scoped resource cleanup |
| Perry, Srivastava, Kumar, Boneh, CCS 2023 (user study, 47 participants); Pearce et al., IEEE S&P 2022; Spracklen et al., USENIX Security 2025 (arXiv 2406.10279) | Assistant-written code can be less secure than the author believes; models invent package names, and the invented names repeat |

Vendor research, weaker evidence: GitClear's 2025 report on 211 million changed lines reports far more copied blocks of five or more lines after assistants arrived. GitClear sells code-analysis products; read it as a signal, not a measurement.

Not used as support, because the research pass could only reach them through blogs or slide decks: the original wording of SRP, LSP, ISP and DIP, the Gang of Four intents (reproduced on a university page), YAGNI on Fowler's site, and Fowler's smell catalogue. The checklist does not depend on their exact words. Figures quoted in the returned notes without a matching quote (task success rates in the Perry study, the exact sample size in the Spracklen study, claims about two follow-up studies, and a Checkstyle sentence on complexity 15) were not used.

Checks of ours with no primary source under that name: unearned abstraction (closest: Fowler's "Speculative Generality", Metz), complexity moved not removed (closest: Ousterhout on shallow modules), diverged duplicate (clone-detection research calls it a near-miss clone), wrong or hidden meaning, shared mutable state (a general concurrency hazard), new dependency (supported only by the package-hallucination research above). They stay because the developer expert beat the plain reviewer on the frozen corpus; that measurement, not a citation, is their evidence, and a check that fires nothing in the corpus is the first to remove.

## Agent sources compared on 2026-10-20

Twenty-two upstream developer agents and skills were read side by side (the comparison is kept in the source repository and not shipped). Ideas taken from them, restated in our words:

| Source | Licence | What it informed |
|---|---|---|
| affaan-m/ECC, `code-reviewer`, `silent-failure-hunter` | MIT | Report a repeated problem once with every location; lost error cause and log-and-continue as swallowed failures |
| anthropics/claude-plugins-official, `pr-review-toolkit` `code-reviewer` and `silent-failure-hunter` | Apache-2.0 | Check the diff against the project's written rules; retries that give up silently |
| addyosmani/agent-skills, `code-simplification` | MIT | Find out why code exists before calling it unnecessary (Chesterton's fence) |
| msitarzewski/agency-agents, `minimal-change-engineer` | MIT | Every changed line traces to the task; changes outside the task as a finding |
| alirezarezvani/claude-skills, `karpathy-reviewer` | MIT | Drive-by edits in untouched code as part of the same category |
| github/awesome-copilot, `gem-reviewer` | MIT | Separate what was read from what was inferred; stop a candidate after three searches that add nothing |

The checks for a list that must be edited in step, and for a test that cannot fail, come from our own measurements (a general review corpus where every reviewer missed them, or this expert did).
