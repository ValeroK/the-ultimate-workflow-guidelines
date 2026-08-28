# The enforcement gates

The five phase commands make ordering structural: you cannot skip a step that has not been started. The gates cover the other case — **ad-hoc edits in a repo that has a plan**, where nobody ran a phase at all.

They are **opt-in**. Set `ULTIMATE_WORKFLOW_GATES=on`. Anything else, including unset, means off.

## What they do

Five lifecycle hooks read a small YAML block at the top of `PRD.md` or `PLAN-<feature>.md`:

| Gate | Rule |
|---|---|
| G1 | No source edit before the plan is confirmed |
| G2 | No implementation before the tests are confirmed — test files exempt, that is the point |
| G3 | No finishing a turn with unverified changes |
| G4 | Three failed verification rounds escalates to you |
| G5 | One line per prompt naming the current stage, so it survives a trimmed history |

Even switched on they are **completely inert** in a repo with no `PRD.md` and no `PLAN-*.md`, so trivial work in an unmanaged project is never blocked. They fail open: an internal error blocks nothing.

Set `plan_confirmed` and `tests_confirmed` to `true` only after the user has actually confirmed that stage. They are not the model's to set, and setting one to clear a block defeats the only thing the gate does.

## Why they are off by default

They shipped **on** in 2.4.0, as the enforcement story. Measuring them changed the answer.

Full enforcement on one host, partial on one, unverified on two. Worse, there turned out to be three separate routes to *installed and silently enforcing nothing* — and a hook that never loaded, a hook that crashed, and a hook that correctly allowed everything all look identical from outside.

A default-on mechanism that fails open invisibly is worse than an opt-in one somebody chose. So they were demoted to a backstop and the phase commands became the story.

Two of the defects found in the v3.0.0 review are worth stating, because they show the failure mode:

- **G4 scored a failing test run as green.** Pass or fail was read from which event fired, on the belief that a failure arrives as a distinct failure event. Claude Code does not send one — a recorded fixture shows a non-zero-exit command arriving as an ordinary `PostToolUse`. So a red run cleared the dirty flag and reset the round counter. Failing the tests was the way to satisfy the gate that exists to make you pass them.
- **The Cursor fallback never fired.** On a host that cannot block a write, a denied edit is downgraded to *allow, record the violation, correct it at the end of the turn*. That check sat behind another one that steps aside whenever no verification command is configured — which the shipped plan template guaranteed. The violation was recorded and shown to nobody.

Both are fixed, both have regression tests confirmed to fail against the old code. Both were invisible to a green suite of two hundred tests, because the defect was in the wire format rather than the logic.

## Check they are actually running

```bash
node hooks/status.js
```

Reports whether the gates are live, what stage you are in, and what is blocking you right now.

Worth running once after installing, because **hook config is read at host startup**. A gate registered mid-session does nothing until you restart and gives no sign of it. Every gate now leaves a heartbeat, and this reads it, so *never ran*, *live*, *stale*, and *disabled* are four distinguishable states rather than four kinds of silence.

### For scripts and CI

```bash
node hooks/status.js --json
```

Exit is always 0, blocking or not, so it stays usable under `set -e`.

```jsonc
{
  "liveness": { "state": "live|stale|never|disabled", "ageSeconds": 12, "count": 41 },
  "stage":    "none|bootstrap|feature",
  "file":     "/abs/path/PLAN-feature.md",   // null at stage none
  "state":    { "plan_confirmed": false },   // the plan's front matter, present keys only
  "blocking": { "blocked": true, "reason": "Gate G1: ..." },
  "g3Active": true
}
```

Treat the key names as a contract. The human report and this object are rendered from one computed value, so they cannot disagree with each other.

## Claude Code only, and why

**Cursor, Codex CLI, Gemini CLI, and claude.ai get the workflow as prose.** The checkpoints are observed, not enforced.

That scope is measured, not assumed. On Cursor 3.17.19 a pre-edit hook returning `deny` is honoured for reads and **ignored for writes**: the file is created, and the following event reports success, so the model is never even told it was blocked. Shipping gates there would look like enforcement while providing none.

The Codex and Gemini hook contracts are documented and look nearly identical to Claude Code's, but neither has been exercised against a real payload. Every defect found on the hosts that *were* exercised — a UTF-8 byte-order mark that makes payload parsing throw, absolute paths defeating test-file detection, `workspace_roots` in place of `cwd` — was invisible in the documentation and failed open.

Until someone records real payloads with `hooks/dev/record.js`, those hosts get prose. Prose that works is better than enforcement that silently doesn't.
