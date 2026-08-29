# Memory

> Slim index of topical knowledge for this repo. Read the topical file only when
> the task touches the topic. For one-line empirical lessons, use `## Gotchas`
> in `AGENTS.md` instead.
>
> Each entry: link to the topical file + short purpose + a "Read when..." cue
> with concrete keywords / file globs. Threshold: explanatory ("here's how X
> works" / "here's why we picked Y"), affects future feature work, not obvious
> from reading the code. One-liners go to `AGENTS.md` `## Gotchas`.

- [research/new-sdlc-with-vibe-coding.md](research/new-sdlc-with-vibe-coding.md) *(external reference, not a `memory/` topical; lives at the git repo root, not inside the installed plugin)* — Summary of Google's May 2026 paper on agentic engineering: the vibe-coding spectrum, `Agent = Model + Harness`, static vs dynamic context, and the CapEx/OpEx economics. **Read when** designing agent orchestration, deciding what belongs in always-on context, arguing whether a problem is the model or the harness, or justifying upfront structure. Full PDF alongside it.

- [memory/context-boundary.md](memory/context-boundary.md) — Why `CLAUDE.md` is a thin index, the keep-what-has-no-cue rule, and what stops it growing back. **Read when** editing `CLAUDE.md`, `memory.md`, `SKILL.md`, `rules/*.mdc`, or deciding whether something belongs in always-on context.
- [memory/hooks-and-gates.md](memory/hooks-and-gates.md) — How enforcement works, why a fail-open gate goes silently dead, and what was measured per host. **Read when** `hooks/**`, `gate.js`, adapters, heartbeat, `status.js`, adding a host, or "a gate is not firing".
- [memory/workflows-authoring.md](memory/workflows-authoring.md) — How the phase scripts are built, what the runtime forbids, and what each phase costs. **Read when** `workflows/*.js`, `agents/uw-*.md`, adding a phase, or `parallel()` returned nothing.
- [memory/mirrors.md](memory/mirrors.md) — Which files are hand-copies, which differences are deliberate, and what CI cannot see. **Read when** editing `SKILL.md`, `rules/*.mdc`, `references/`, or `agents/`.
- [memory/cursor-install.md](memory/cursor-install.md) — Why the plugin payload lives under `.cursor-plugin/ultimate-workflow/` and how Cursor marketplace sparse-checkout emptied root-level installs. **Read when** changing marketplace sources, packaging, release ZIP layout, `/add-plugin`, or diagnosing a Cursor install that looks present but has no agents/rules.

<!-- Add topical files under memory/ as they earn their place. See skills/the-ultimate-workflow-guidelines/references/memory-template.md for entry shape. -->
