# The static / dynamic context boundary

> Why `AGENTS.md` is a thin index rather than the whole workflow, and what
> stops it growing back.
> Last updated 2026-08-28.

**If you are reading this because a thin `AGENTS.md` looked incomplete and you were about to move content back into it: that is the failure this file exists to prevent.** Read on before editing.

## Mental model

Static context is enforced by **presence** — it is there every turn whether relevant or not. Dynamic context is enforced by **retrieval** — it arrives only when something cues it.

The selection rule follows directly:

> **Keep what has no cue. Move what has a cue.**

Retrieval fails when the trigger is an *absence*. You need "do not add a dependency" at the moment you are thinking about the new capability, not about the constraint — and no file glob fires for "you are about to run `npm init`". Anything with a concrete topic, keyword, or path can move. Anything whose trigger is "you are about to do a thing you are not considering" cannot.

## What was measured before the change

`CLAUDE.md` was 240 lines and 2769 words. It has since become `AGENTS.md` -- read natively by Cursor, pulled into Claude Code through a one-line `@AGENTS.md` stub -- and the same measurement held there: 90% of its lines were byte-identical to `SKILL.md`.

| Portion | Words | Relevance |
|---|---|---|
| Principles, Workflow, Gates | 1220 | **Byte-identical to `SKILL.md`** |
| Memory-system guidance | 715 | Consumed at most once per feature, at step 6 |
| Gotchas entries | 650 | ~427 subsystem-specific, ~162 broadly applicable |

About 58% was rarely relevant. Guidance about where to write things down, plus the things written down, came to 49% of the file — larger than the workflow steps it served.

The 1220 duplicated words carried close to zero information risk: deleting them lost nothing that was not already on disk behind a better trigger. The whole argument was about whether that trigger fires.

## Key decisions

- **Principle *names* stay, full text moves.** The name is the retrieval hook that makes the model recognise the skill applies at all. "Every changed line traces directly to the request" is ten words carrying most of the behavioural weight of seven bullets.
- **Hard constraints never move.** No `package.json`, no build step, no dependency; no emoji in code; the verify command. All are uncued.
- **Two Gotchas stay despite looking subsystem-scoped.** The `node -e` backslash collapse and `node --test <dir>` read like tooling trivia, but their cue is "you are about to run a shell command", which no topical will ever be read for. The first has hit three times and corrupted a test file, a regex, and a fixture directory.
- **The memory protocol moved to `references/memory-protocol.md`.** Its real consumer is already `workflows/harvest.js`, which inlines the decision test into the router agent's prompt — delivered at the moment of use, in a fresh context, by a fixed script rather than a model remembering to consult it. Keeping 715 always-on words was paying twice for the second-best copy.
- **The always-on file stopped being the standalone artifact.** The README's `curl` one-liner now points at `SKILL.md`, which is self-contained prose. A thin index has dead pointers for someone holding one file. This also collapsed a three-way mirror to a pair.
- **The line cap is a ratchet, not a target.** CI asserts it because the file will not stay thin on its own.

## The honest limits

The line count is an **input** measure. It records what we spent, not what we bought. It must never be the headline.

The behaviour change was checked by `evals/context-boundary/` — the same fixtures run under the old file and the new one, scoring trajectory rather than prose, with two negative controls that pass by reading *nothing extra*. Without those, the eval rewards over-retrieval, which scores well while undoing the point.

One run per cell supports **"no detected regression"** and nothing stronger. Agents are not deterministic; two identical `/harvest` runs here produced different proposals.

**The rollback unit is a section, not the file.** If a fixture regresses, restore the section it covers.

## Gotchas (topic-specific)

- A rule that is followed reliably today because it is always loaded may stop being followed once it only loads on a cue match, and **the failure is silent** — nothing announces that a rule was not retrieved.
- Do not land a context move and a reduction in enforcement in the same change. The two confirmation points survived on always-loaded prose *plus* gates; removing both reinforcements at once would leave nothing holding them.
