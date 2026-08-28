# Ultimate Workflow

Your AI coding assistant is fast, confident, and forgets everything. This makes it slow down, show you a plan, write the tests first, and remember what it learned.

Works in **Claude Code**, **Cursor**, **Codex CLI**, **Gemini CLI**, and **Claude Desktop**.

Visual walkthrough: **https://valerok.github.io/the-ultimate-workflow-guidelines/**

---

## The problem

You ask for a small change. You get 200 lines. Half of them "improve" code you never mentioned.

You ask a question. It guesses instead of asking you back.

You explain a quirk of your project. Next session, it's gone, and you explain it again.

Telling it not to do these things doesn't work. Instructions like "always plan first" sit in a file the model reads once and then drifts away from twenty minutes into a long conversation.

## The idea

Stop asking one assistant to do everything in one long conversation.

Split the work into **five short jobs**. Each one starts fresh, knows only what it needs, does a single thing, hands you the result, and stops.

That's the whole concept. Three things follow from it:

**It can't skip a step.** Not because it's being watched, but because each step is a separate command you run. There's nothing to skip ahead to. The next step doesn't exist until you start it.

**It can't wander.** A job that only reads code is given tools that only read code. Four of the five jobs physically cannot write to your files. Only the build step can.

**It can't lose the thread.** Each job hands back a document, not a memory. The plan is a file on disk. When the conversation gets too long and the history is trimmed, the plan is still there.

The cost is honest: five commands instead of one, and you're the one who moves between them. That's the trade. You get a checkpoint you actually read, twice, before any code is written.

## What it feels like

Say you ask for rate limiting on your public API.

**1. It writes a plan and stops.**

A file lands on disk: which files it looked at and why they matter, the patterns already in your codebase it intends to follow, anywhere it wants to deviate and the tradeoffs both ways, and what it's still unsure about. No code yet.

**2. You say go. It writes a test plan and stops again.**

What to test, how, and what "done" means. Four independent critics then attack that plan with one question: *could someone write code that passes all of this and still be wrong?* Arguing about how you'd know it works is much cheaper on paper than on code that already exists.

**3. You say go. Now it writes the tests, runs them, and proves they fail.**

A test that passes before the feature exists is testing nothing, and once everything is green you can't tell the difference. So it checks. Then it writes the smallest implementation that makes them pass, and loops until green.

**4. When something doesn't add up, it stops and asks.**

A real example from building this repo: the hook payloads it recorded didn't match the vendor's documentation. Instead of guessing, it laid out the options and waited.

**5. When it lands, it writes down what it learned.**

Short warnings go somewhere always loaded. Longer explanations go in a topic file that's only opened when relevant, so your always-on instructions stay small.

## The five commands

| Command | What it does | Can it write? |
|---|---|---|
| `/ultimate-workflow:plan` | Several readers explore the code in parallel, then one writes the plan | No |
| `/ultimate-workflow:tests` | Drafts a test plan, then four critics try to break it | No |
| `/ultimate-workflow:build` | Writes the tests, proves they fail, implements, loops to green | **Yes** |
| `/ultimate-workflow:review` | Four reviewers, then a skeptic who tries to disprove each finding | No |
| `/ultimate-workflow:harvest` | Works out which lessons from this feature are worth keeping | No |

Four of the five hand you proposals instead of applying them. That's on purpose. A proposal you have to accept is a proposal you actually read.

You don't need all five every time. A typo doesn't need a plan.

## Starting a brand new project?

There's a separate mode for that: it interviews you, writes a PRD, designs the system with you, and sets up the living documents the workflow above then reads. Use it once, on an empty repo.

| Skill | When |
|---|---|
| `the-ultimate-workflow-guidelines` | Day-to-day work in an existing codebase |
| `project-bootstrap-guidelines` | Greenfield only, run once |

Under both sit four principles: **think before coding**, **simplicity first**, **surgical changes** (every changed line traces back to something you asked for), and **goal-driven execution** (define "done" in terms you can check, then loop until it's true).

## Memory that compounds

Two places, two jobs:

- **Always loaded** — short defensive warnings. *"Tests need a live Postgres, run `docker compose up -d db` first."*
- **Loaded on demand** — the longer explanations, in a topic file fetched only when the topic comes up. *"Auth uses short-lived JWTs because..."*

The test: if it starts with *"beware"*, it's a warning. If it starts with *"here's how"* or *"here's why"*, it's a topic file.

This matters more than it sounds. Everything in the always-loaded pile is paid for on every single message, whether it's relevant or not. Keeping it small is what keeps it read.

## Install

**Claude Code**

```
/plugin marketplace add ValeroK/the-ultimate-workflow-guidelines
```

then

```
/plugin install ultimate-workflow
```

**Cursor**

```
/add-plugin ValeroK/the-ultimate-workflow-guidelines
```

**Claude Desktop** — download `the-ultimate-workflow-guidelines-plugin.zip` from the [latest release](https://github.com/ValeroK/the-ultimate-workflow-guidelines/releases/latest) and upload it. Needs a paid plan with code execution. The same ZIP works for an offline Cursor install.

**Just one project, no plugin** — drop the whole workflow into a single repo as one file:

```bash
curl -o CLAUDE.md https://raw.githubusercontent.com/ValeroK/the-ultimate-workflow-guidelines/main/skills/the-ultimate-workflow-guidelines/SKILL.md
```

You get the workflow as prose. No templates, no bootstrap mode, no commands. See [CURSOR.md](CURSOR.md) for using individual Cursor rules on their own.

## What you get on which host

Claude Code can run the five commands as real scripts, so the ordering is guaranteed. Nowhere else can.

| | Claude Code | Cursor | Codex / Gemini / Desktop |
|---|---|---|---|
| The five jobs, each with fresh context | Yes | Yes, you invoke them | As prose |
| Ordering guaranteed | Yes | You hold the sequence | You hold the sequence |
| Only the builder can write | Yes | Yes | — |
| Optional enforcement hooks | Yes | No | Not verified |

Cursor keeps most of what matters: separate jobs, clean context each time, and only one of them able to write. What it loses is the guarantee, and its rule file says so plainly rather than implying otherwise.

There's an optional enforcement layer for Claude Code — hooks that block an edit before the plan is confirmed, and so on. It's **off by default**; details and the honest limits are in **[docs/gates.md](docs/gates.md)**.

## Layout

```
skills/     the two skill bodies, plus templates
rules/      Cursor's rules: one always on, the rest fetched on demand
commands/   the five slash commands
workflows/  the scripts each command runs (Claude Code)
agents/     the five roles; only the builder has write access
hooks/      the optional enforcement layer
memory/     topic files, loaded on demand
evals/      checks that the instructions still get followed
```

## Credits and license

Behavioural principles derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls.

The plugin refuses to write emoji into your files. They break Windows terminals and corrupt pipelines. Set `ALLOW_EMOJIS=1` if you want them.

MIT with Attribution — see [LICENSE](LICENSE). Redistributions, modifications, and derivative works must visibly credit `ValeroK` and link back to https://github.com/ValeroK/the-ultimate-workflow-guidelines somewhere a user can see it (README, docs, About screen). A source comment or the LICENSE file alone doesn't satisfy it.
