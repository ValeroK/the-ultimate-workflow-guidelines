---
description: Review the diff through four parallel lenses plus the domain experts that apply, then adversarially try to refute each finding. Writes nothing.
argument-hint: "[--experts-only] [--lenses security,performance]"
---

# Phase: review

The review has a part that code does, before the workflow, and a part the workflow does. Do the first part exactly; it is what makes the second part trustworthy.

## Before the workflow

1. **The plan file.** The one the user named. Otherwise, if exactly one `PLAN-*.md` exists at the repository root, use it. If several exist and none was named, ask which; never pick by modification time. If none exists (a bug fix, a small change), there is no plan: skip the plan steps below, and the experts are chosen from the diff alone.
2. **The range.** If the working tree has uncommitted changes (`git status --porcelain` prints anything), review those: range `working`. Otherwise review `main..HEAD`, or the range the user gave.
3. **Prepare.** Run `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" prepare --range <range>`. It saves the diff to `.ultimate-workflow/review.diff`, fingerprints the working tree so the evidence says what was reviewed, and prints JSON: `hash`, `diffFile`, `files` and `available` (the experts that exist, discovered from the agents folder). Keep `available` exactly as printed. If it exits with code 2, stop and show its stderr.
4. **The plan's experts.** If there is a plan file, run `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" read --plan <plan file>` and use its `experts`. Otherwise use an empty list.
5. **Dependency audit.** If `files` includes a `package-lock.json`, a `uv.lock` or a `pyproject.toml`, run the audit, which needs network access and which a model must not improvise. List the tracked lockfiles with `git ls-files -- '*package-lock.json' '*uv.lock'`, and add a `pyproject.toml` only where no `uv.lock` sits beside it. Then run
   `git diff --name-status <base of the range, or HEAD for working> | node "${CLAUDE_PLUGIN_ROOT}/experts/deps-audit.js" --base-ref <the same base> --changed-from-stdin <those files>`
   and pass the JSON it prints as `deps`. If it fails or prints nothing, leave `deps` out and tell the user the audit did not run and why. Never report the dependencies as clean because the audit is missing. The audit runs whenever the files call for it, whichever experts end up selected, so an expert the diff adds will have it.

## Run the phase

Call the **Workflow** tool with:

- `scriptPath`: `${CLAUDE_PLUGIN_ROOT}/workflows/review.js`
- `args`: a JSON object, not a string: `{ "range": "<range>", "available": <from step 3, unchanged>, "experts": <from step 4>, "diffFile": ".ultimate-workflow/review.diff", "expertsDir": "${CLAUDE_PLUGIN_ROOT}/experts", "plan": "<plan file, if any>", "deps": <the audit JSON, if produced> }`, plus `rigor` and `lenses` if the user gave them (`$ARGUMENTS`), and `"expertsOnly": true` if the user passed `--experts-only` (this is what the commit check uses: only the experts run, not the four core lenses).

The workflow asks the same question again of the real diff, "which of these experts apply?", and merges the answer by code: the diff can add an expert to the plan's set and can never remove one. You do not choose experts. Pass `"noExperts": true` only if you truly cannot run `experts.js` (no shell on this host), and tell the user that domain experts were not considered.

Call it once. Do not re-implement the phase inline, and do not run it a second
time because the first result was not what you expected -- these phases cost
six figures of tokens each, and a rerun is a decision for the user to make.

## After the workflow

Record the evidence, in code. Build a JSON object with `"ok": true` and the `expertLane` exactly as the workflow returned it (do not edit it), and run
`node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" record --stage review [--plan <plan file>]`
with it on standard input. It writes one record per expert that ran, against the fingerprint from step 3, and adds any expert the recheck found to the plan's `experts:` line. If `expertLane.recheckFailed` is true, say so: the commit gate will not be satisfied until the recheck succeeds.

## High-confidence findings are raised and resolved

The commit gate refuses while an expert's high-confidence finding is open, so raise each one now. `record` prints them as `open`, each with an `id`; `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" findings` lists them again at any time. For every open finding, tell the user, in plain words, what it is, where it is, and how it fails, then **stop and ask**: fix it, or dismiss it.

- **Fix it.** Change the code, then run the experts check again. The finding is resolved when the next review no longer reports it.
- **Dismiss it.** Only when the user says to, in their words: `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" resolve --id <id> --reason "<the user's words>"`. The reason is kept and shown wherever findings are listed. Never dismiss a finding on your own authority, never write a reason the user did not give, and never edit the evidence files by hand.

Findings below high confidence are reported with the others but do not block.

## When it returns

Say which experts ran, which were added by the diff beyond the plan (`expertLane.added`) and why (the recheck's reasons are in the workflow log), and any that failed. Present confirmed, refuted, and unverified findings **separately**. List the refuted ones rather than dropping them: a verifier that silently filters cannot be audited.

## If the Workflow tool is unavailable

Say so plainly rather than approximating the phase by hand. The value of a
phase comes from a fresh context per role and tools scoped by subtraction;
a single agent imitating five is the thing this replaced.

On hosts with no scriptable orchestrator, the same roles are invoked directly
as agents -- see the "Running the phases here" table in
`rules/the-ultimate-workflow-guidelines.mdc`.
