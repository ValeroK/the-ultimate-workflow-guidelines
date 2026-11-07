---
description: Explore the codebase in parallel, draft a plan anchored in what already exists, and collect input from the domain experts that apply. Writes nothing.
argument-hint: "<what you want built>"
---

# Phase: plan

## Before the workflow: find out which experts exist

The workflow script cannot read the filesystem, so the list of domain experts is found here, in code, and written to a file the script is built from. Run `mkdir -p .ultimate-workflow/run`, then:

`node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" list > .ultimate-workflow/run/available.json`

It writes a JSON array, one entry per `agents/uw-expert-*.md`. An empty array is fine and means no expert is installed. If the script prints a problem on stderr, show it to the user: an expert whose file is malformed is left out of the list.

Then run `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" skills --stage plan > .ultimate-workflow/run/skills.json`. It writes a JSON object: for each expert that plans, the skills it may be given, each with a one-line headline and its text. The workflow asks which of them the draft needs, in the same call that chooses the experts, and can only pick from this list.

## Run the phase

1. With the Write tool, write `.ultimate-workflow/run/plan.args.json`: `{ "feature": "<the feature to plan, verbatim from the user>" }`, plus `"areas"` (a list of strings) if the user named some.
2. Run `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" script --phase plan --args-file .ultimate-workflow/run/plan.args.json --file available=.ultimate-workflow/run/available.json --file skills=.ultimate-workflow/run/skills.json`. It writes `.ultimate-workflow/run/plan.js`, which is `phases/plan.js` with those arguments and `expertsDir` built in, and prints its `scriptPath` and the skill names each expert may be offered.
3. Call the **Workflow** tool once, with `scriptPath` set to the path that command printed and no `args`. Do not pass the arguments yourself and do not copy or edit the script: the tool will not load a script from the plugin's own folder, and arguments a model retypes are no longer the text the code chose.

Call it once. Do not re-implement the phase inline, and do not run it a second
time because the first result was not what you expected -- these phases cost
six figures of tokens each, and a rerun is a decision for the user to make.
One exception: if the run failed before any agent started (0 agents, and an input or argument error), fix the input, rebuild the script, call the Workflow tool once more and say so, and note it in the ledger's workarounds. Any other failure stops here and goes to the user.

## When it returns

Present the returned plan and **stop**. Do not start work until the user confirms. Two things depend on that stop: the confirmation is the product, and `plan_confirmed` is set to `true` only after the user has confirmed, never to clear a block. Nothing is written into the repository before the user accepts the plan.

**Never present the plan from the Workflow tool's completion notice.** A large result is cut off in that notice (a real plan result was 62 KB and about 38 KB of it never reached the session), and a plan read from the cut-off text is a partial plan shown as whole. The notice names the Workflow tool's output file, which holds the complete result. Code writes the plan from that file, so the plan never passes through you: you pass paths. If the notice names no output file, or any command below fails, say so and stop. Never summarise the notice instead, and do not run the phase again.

1. **Write the plan, whole and decoded, to where it will be shown.** `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" present --result <the output file> --field planMarkdown --out <where>`. It reads the entire output file, takes `planMarkdown`, decodes the five HTML entities when the whole text came back escaped, and leaves a plan that merely mentions one alone (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`, `&amp;` last; writing them undecoded once corrupted a plan) and writes it. It prints the characters written and the last heading, and it exits non-zero rather than write a partial plan. `<where>` is the plan file of plan mode when it is active (its path is in the plan-mode instructions; on Claude Code call `EnterPlanMode` first if it is not, which asks the user), otherwise `.ultimate-workflow/run/plan.draft.md`.

   **Diagrams.** Claude Code's plan mode allows writing only its plan file, and no setting changes that. While it is active, put a diagram in the plan file as a fenced `mermaid` block. Once plan mode is off, the gates let a diagram through before confirmation: `.mmd`, `.mermaid`, `.puml`, `.plantuml`, `.drawio`, `.excalidraw` and `.d2` anywhere, `.html`, `.htm`, `.svg` and `.png` under a `docs` folder. Publishing a diagram as an artifact, or writing one anywhere else, waits until the plan is accepted.
2. **Tell the user what the experts did**, in a few lines, from the output file's `expertLane`: which experts were selected and why (`reasons`), whose input is in the plan (`ran`), any consult that failed (`failed`), and which skills each expert was given and why (`skillsLoaded`, `skillReasons`). The input itself is in the plan under "Expert input" and is part of what the user is confirming. If `expertLane.skipped` is set, say so plainly: no expert was consulted, and why. Do not copy the plan into chat.
3. **Raise the open questions one at a time.** The plan's "Open questions" and each expert's "Questions for you" are decisions for the user. Ask them one per turn with the host's ask-user tool (`AskUserQuestion` in Claude Code, `AskQuestion` in Cursor), never as one list. For each: say what the issue is, what each answer would change, and the pros and cons of each option, with your recommendation first. Fold each answer into the plan file with a small edit before the next question.
4. **Show it and stop.** In plan mode, call `ExitPlanMode`: the user sees the plan file in the plan view and accepts or rejects it there, and accepting is the confirmation. Where plan mode is not available, or `ExitPlanMode` cannot be used, read the file step 1 wrote (the draft file, or the plan-mode file when `ExitPlanMode` was the part that failed) and print all of it, not a summary, then ask the user to confirm in chat. A rejection or an edit request leaves `plan_confirmed` false; address it and show the plan again.
5. **On acceptance, write the repository plan** from the file that was shown, so edits the user made in the plan view are kept: `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" present --from <the file shown> --out PLAN-<feature>.md --confirm plan_confirmed`, with `<feature>` a short kebab-case name from the plan's title. If that file already exists, ask before replacing it. This is the first thing written into the repository, and it is what the gates read.

Then record what happened, in code and not from memory. The experts' lane is read from the output file, never retyped from the notice:

`node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" record --stage plan --plan <plan file> --result <the output file>`

It writes the `experts:` line into the plan's frontmatter, only ever adding to what is there, and leaves an evidence file for each expert that gave input. If `expertLane.skipped` was set there is nothing to record: tell the user, and do not invent an `experts:` line; source edits stay blocked by the experts gate until the user decides. If the user says no expert applies, record that with `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" select --plan <plan file> --add ""`.


## Record the run in the ledger

Last, after the steps above: save the workflow's result, exactly as returned (the Workflow tool's output file, wrapper and all: `ledger add` reads the phase result out of the wrapper, so do not unwrap it by hand), to `.ultimate-workflow/run/plan.result.json` (a one-liner that reads the tool's output file is the expected way, and is not a workaround; never retype or edit it), and write `.ultimate-workflow/run/plan.row.json` with the Write tool: `{ "runId": "<the run id>", "agents": <number>, "tokens": <subagent tokens>, "durationMs": <milliseconds>, "plan": "<plan file, if any>", "workarounds": ["<anything you had to do that this command did not say, one line each>"] }`, the numbers from the Workflow tool's result. Leave out a number the result does not show; never estimate one. Then run `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" ledger add --phase plan --row .ultimate-workflow/run/plan.row.json --result .ultimate-workflow/run/plan.result.json`. `/ultimate-workflow:value` reports from it.

Then, for each item in the "Expert input" that corrected the draft (a defect in it, not general advice), record a catch: `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" ledger catch --what "<the defect, one line>" --by expert:<name> --stage plan`. It stays unconfirmed until a test or a measurement shows it: when one does, `node "${CLAUDE_PLUGIN_ROOT}/experts/experts.js" ledger confirm --id <id> --text "<the test that went red, or the measurement>"`, and `refute` with the reason when it is not borne out.

## If the Workflow tool is unavailable

Say so plainly rather than approximating the phase by hand. The value of a
phase comes from a fresh context per role and tools scoped by subtraction;
a single agent imitating five is the thing this replaced.

On hosts with no scriptable orchestrator, the same roles are invoked directly
as agents -- see the "Running the phases here" table in
`rules/the-ultimate-workflow-guidelines.mdc`.
