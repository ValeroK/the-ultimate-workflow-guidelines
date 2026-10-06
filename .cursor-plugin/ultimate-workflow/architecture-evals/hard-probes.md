# Hard probes for the architecture skills

> Moved here from a separate `architecture-hard-evals/` suite on 2026-10-06 when the suites were merged (layout only; the cases and graders are unchanged). The cases are the `hard`-tagged ones in this directory.

The first quality suite was saturated: the baseline model passed almost every case, so a score of 1.0
with a skill showed that it fired and nothing about whether it helped. These probes plant a flaw the
user does not mention (stacked non-idempotent retries, a poison-message loop, a shared database
behind a "which index" question, an irreversible migration, PII and unbounded metric labels, untested
backups) and grade by regex whether the answer names it. 11 cases, 3 runs per arm, with and without
the plugin. They cover the three skills whose value was unproven: resilience, modularity, operability.

## Pre-registered decision rule (written before the first run, 2026-10-06)

For each skill, take the mean delta (with-skill score minus no-skill score) over its cases.

- Mean delta at least +0.10 and the skill fired in at least 2 of 3 runs of most of its cases: keep the skill.
- Otherwise: fold its content into the core skill's references and drop its description.

Graders and prompts are not to be edited after seeing results. If a grader is judged wrong, record the
reason and re-run as a new suite rather than amending this one.

Run, from the plugin root:

    claude plugin eval . --eval-dir architecture-evals --tag hard --trust-plugin --runs 3 -j 4 --max-cost-usd 10 --no-publish --json out.json

## Outcome (2026-10-06)

The run (11 cases, 3 runs per arm) gave a mean delta of -0.03; per skill: resilience -0.02,
modularity -0.04, operability -0.04. By the rule above all three were to be folded.

**Decision: the maintainer kept all five skills as separate skills.** Rationale given: the model can
call a skill when it needs it, and the always-on cost of a description is small. This overrides the
pre-registered rule; it is a judgement call, not a result the data supports. What the data does say:
the skills fire (resilience 11/12, modularity 9/12, operability 5/9 of runs) but on these probes the
baseline model already named the planted flaw (7 of 11 cases scored 1.0 in both arms), so no lift was
measured. The measured gains are elsewhere: greenfield premise pushback and quality-attribute
questions, and the operability go-live checklist.

Revisit if a probe set is found where the baseline fails, or if per-skill description cost becomes a
problem. Results are saved at the repo root under evals/results/architecture-skills.
