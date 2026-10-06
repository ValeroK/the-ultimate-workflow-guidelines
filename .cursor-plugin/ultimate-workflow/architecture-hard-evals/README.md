# Hard probes for the architecture skills

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

    claude plugin eval . --eval-dir architecture-hard-evals --trust-plugin --runs 3 -j 4 --max-cost-usd 10 --no-publish --json out.json
