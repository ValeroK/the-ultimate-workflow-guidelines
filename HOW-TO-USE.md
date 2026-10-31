# How to use it

One page, two flows: **a new project** (greenfield) and **a feature in an existing project**. Everything else in this repo explains how it works; this page only explains what to type.

You only need one command:

```
/ultimate-workflow:feature <what you want>
```

---

## First: install or update

1. In Claude Code, type these two lines, one at a time:
   ```
   /plugin marketplace add ValeroK/the-ultimate-workflow-guidelines
   /plugin install ultimate-workflow
   ```
2. Restart Claude Code.
3. Type `/ultimate-workflow:` and check that `feature` is in the list.

Updating: `/plugin marketplace update the-ultimate-workflow-guidelines`, then restart. If `feature` is still missing (a release re-published under the same number), run `/plugin marketplace remove the-ultimate-workflow-guidelines`, then the two lines above again, then restart.

---

## Flow A: a new project (greenfield)

Do **one session for the PRD, then one session per milestone**. A whole project in one chat runs out of context; the files carry the state between sessions.

### Session 1: PRD and setup (no code yet)

In an empty repo folder:

```
/ultimate-workflow:feature new project: <describe the idea in a few sentences>
```

Already have a PRD? Put it in the folder as `PRD.md` and type `/ultimate-workflow:feature build the PRD in PRD.md`.

It stops for your OK three times:

| Step | It writes | You |
|---|---|---|
| 1. PRD | `PRD.md`, after asking you questions | Read it, say OK |
| 2. Design | Diagram, architecture, frameworks (in `PRD.md`) | Read it, say OK. This is the hardest decision to undo |
| 3. Setup docs | `ROADMAP.md` (the milestones), `progress.md`, `AGENTS.md`, `CLAUDE.md`, `memory.md` | Check each milestone is small enough for one session; if not, say "split milestone 2" |

Then type `/handoff` and close the session.

### Session 2, 3, 4 ...: one milestone each

Open a **new** session in the same folder and type the same thing every time:

```
/ultimate-workflow:feature continue the roadmap
```

It finds the next milestone that is not done, says which one, and runs the full flow on it:

| Step | You |
|---|---|
| 1. Plan, with the experts | **Read it, say OK** |
| 2. Test plan | **Read it, say OK** |
| 3. Code, card by card | Nothing |
| 4. Review and experts check | Nothing, unless it shows you a serious finding |
| 5. Lessons worth keeping | Say which to keep |
| 6. Marks the milestone done in `ROADMAP.md` and `progress.md`, shows what it built and what it cost | Say **"commit"** |

Then `/handoff`, close the session, and start a new one for the next milestone. Repeat until the roadmap is done.

---

## Flow B: a feature in an existing project

In the project folder:

```
/ultimate-workflow:feature <what you want built>
```

It first tells you how big the job is:

| It says | When | What runs | Stops for you |
|---|---|---|---|
| **Skip** | Typo, formatting, one-line fix, doc edit, rename | Just makes the change | Never |
| **Light** | A small, clear change of a few files | Plan, test plan, code, experts check | 2 times |
| **Full** | Real scope, contracts, data, security, infrastructure | Plan with experts, test plan, code card by card, review, experts check, lessons | 2 times |

Wrong guess? Say "make it full" or "make it light".

The two stops are always the same: **"here's the plan, OK?"** and **"here are the tests, OK?"** It also stops if an expert finds a serious problem, the code fails three rounds, or something breaks, and tells you why. It commits only when you say "commit".

---

## Cheat sheet

```
New project, session 1:   /ultimate-workflow:feature new project: <idea>       -> OK, OK, OK -> /handoff
New project, session N:   /ultimate-workflow:feature continue the roadmap      -> OK, OK -> "commit" -> /handoff
Existing project:         /ultimate-workflow:feature <what you want>           -> OK, OK -> "commit"
```

---

## All the commands

| Command | Use it |
|---|---|
| `/ultimate-workflow:feature` | **Always start here** |
| `/ultimate-workflow:plan` | Redo only the plan |
| `/ultimate-workflow:tests` | Redo only the test plan |
| `/ultimate-workflow:build` | Only write the code (the only step that edits files) |
| `/ultimate-workflow:review` | Review the whole change |
| `/ultimate-workflow:experts` | Experts check before a commit |
| `/ultimate-workflow:harvest` | Save the lessons from a finished feature |
| `/ultimate-workflow:value` | What the workflow cost and what it caught |
| `/ultimate-workflow:expert-attribution` | Which expert skill a finding came from (rarely needed) |
| `/handoff` | Ending a session with work in flight: writes a note for the next session |

---

## The gates (on by default)

- They act only in a folder that has a `PRD.md` or a `PLAN-*.md`.
- There, Claude cannot edit code before you confirm the plan, or commit before the experts check passes.
- While Claude works, only the tests related to the change run. The full suite runs once at the end of a build and once before each commit, and whenever config, a lockfile or many files changed. Set `test_related_command` in the plan (it proposes one) to get this; without it every run is the full suite.
- A block message names the step to run; normally `feature` has already run it.
- Turn them off: set `ULTIMATE_WORKFLOW_GATES=off`.
- Check they are working: `node hooks/status.js` in the plugin folder says `live`.

Details: [docs/gates.md](docs/gates.md).

---

## If something looks wrong

- **It did not say which milestone or tier.** Tell it: "do milestone 3" or "make it full".
- **It started coding without asking you twice.** Stop it. That is a bug; report it.
- **A milestone was not marked done.** Say "mark milestone 1 done in ROADMAP.md", or the next session starts it again.
- **On Cursor, Codex or Gemini.** There is no `feature` command or gate there. Follow the same steps by hand; the rule file describes them.
