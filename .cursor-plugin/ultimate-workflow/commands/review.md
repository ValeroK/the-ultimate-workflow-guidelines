---
description: Review the diff through four parallel lenses, then adversarially try to refute each finding. Writes nothing.
argument-hint: "[--lenses security,performance]"
---

# Phase: review

## Before the workflow: choose the domain experts

Domain experts (currently `security`) review as extra lenses. The workflow script has no shell, so work out which ones apply here, in code:

1. Find the plan file. Use the one the user named. Otherwise, if exactly one `PLAN-*.md` exists at the repository root, use it. If several exist and none was named, ask which; never pick by modification time. If none exists, skip `--plan` below.
2. Run, with the review range (default `main..HEAD`):
   `git diff --name-status <range> | node "${CLAUDE_PLUGIN_ROOT}/experts/route.js" --plan <plan file>`
3. Keep the JSON it prints exactly as printed; it is passed to the workflow in step 7 as `routing`. Its `experts` is the list that will run: the plan's experts plus any the diff adds. If `added` is not empty, tell the user which experts the diff added beyond the plan, and why those paths matched.
4. If the script exits with code 2 (unreadable plan, unknown expert name), stop and show its stderr. Do not run the review without the experts the plan asked for.
5. If `experts` is not empty, save the diff for them, so that every expert reads the same one: `mkdir -p .ultimate-workflow && git diff <range> > .ultimate-workflow/review.diff`. Their references live in `${CLAUDE_PLUGIN_ROOT}/experts`.
6. If `security` is in the list, run the dependency audit, which needs network access and which a model must not improvise. List the tracked lockfiles with `git ls-files -- '*package-lock.json' '*uv.lock'`, and add a `pyproject.toml` only where no `uv.lock` sits beside it. Then run
   `git diff --name-status <range> | node "${CLAUDE_PLUGIN_ROOT}/experts/deps-audit.js" --base-ref <left side of the range> --changed-from-stdin <those files>`
   and pass the JSON it prints as `deps`. If it fails or prints nothing, leave `deps` out and tell the user the audit did not run and why. Never report the dependencies as clean because the audit is missing.

7. Do not edit, trim or retype that JSON, and do not choose experts yourself. The routing table is the script's job. The workflow refuses to run without the router's output, so a skipped router is a stop and not a quiet review without experts. Only if you truly cannot run the script (no shell on this host), pass `"skipRouting": true` instead of `routing`, and tell the user that domain experts were not considered.

## Run the phase

Call the **Workflow** tool with:

- `scriptPath`: `${CLAUDE_PLUGIN_ROOT}/workflows/review.js`
- `args`: a JSON object, not a string: `{ "range": "<range>", "routing": <the router's JSON from step 3, unchanged>, "diffFile": ".ultimate-workflow/review.diff", "expertsDir": "${CLAUDE_PLUGIN_ROOT}/experts", "deps": <the audit JSON, if produced> }`, plus `rigor` and `lenses` if the user gave them (`$ARGUMENTS`). Leave `diffFile` and `expertsDir` out when `routing.experts` is empty.

Optional extra lenses beyond the four defaults.

Call it once. Do not re-implement the phase inline, and do not run it a second
time because the first result was not what you expected -- these phases cost
six figures of tokens each, and a rerun is a decision for the user to make.

## When it returns

Present confirmed, refuted, and unverified findings **separately**. List the refuted ones rather than dropping them: a verifier that silently filters cannot be audited.

## If the Workflow tool is unavailable

Say so plainly rather than approximating the phase by hand. The value of a
phase comes from a fresh context per role and tools scoped by subtraction;
a single agent imitating five is the thing this replaced.

On hosts with no scriptable orchestrator, the same roles are invoked directly
as agents -- see the "Running the phases here" table in
`rules/the-ultimate-workflow-guidelines.mdc`.
