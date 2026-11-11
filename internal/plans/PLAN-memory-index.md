---
phase: build
plan_confirmed: true
tests_confirmed: true
test_command: node --test ".cursor-plugin/ultimate-workflow/hooks/**/*.test.js" "evals/**/*.test.js" mirrors.test.js
experts: [quality, genai, security, developer, softarch]
memory_root: .cursor-plugin/ultimate-workflow
dirty: false
verify_rounds: 0
last_verify: green
escalated: false
gate_violation: 
confirmed_hash: 9ee6d86557eeef4b
---

# PLAN: memory-index

> Written 2026-11-10 against plugin 4.7.0 (efd8193). Target release: 4.8.0. The plan was confirmed
> by the owner on 2026-11-10; the test plan is the second confirmation.
>
> Source: the review of RinDig/icm-architect (MIT) on 2026-11-10. Three ideas taken from it: index
> files are generated and never hand-edited, every link must resolve, and a step's context has a
> size budget. Nothing is copied from it; its scripts are Python and this plugin is Node only.
>
> Related: `experts/autopilot.js` (`matchingTopicals`, `pack`, `harvestBranch`, `withAddition`),
> `experts/experts.js` (`commitEvidence`), `hooks/lib/gates.js` (`commitGate`), `phases/harvest.js`,
> `phases/run.js`, `.cursor-plugin/ultimate-workflow/commands/harvest.md`, `.cursor-plugin/ultimate-workflow/agents/uw-harvester.md`,
> `.cursor-plugin/ultimate-workflow/skills/the-ultimate-workflow-guidelines/references/memory-protocol.md`, both memory-template.md
> copies, `mirrors.test.js`.

## Goal

Memory reaches the cards that need it, and cannot silently drift.

1. Each `memory/<topic>.md` describes itself in a small header (front matter): what it covers, the
   paths it is about, the keywords that cue it, when it was last updated.
2. The list in memory.md is generated from those headers, between markers. Text outside the
   markers is the owner's and is never touched.
3. Cards pick their topicals from the headers (path globs and keywords), not by parsing the
   sentence in memory.md.
4. Harvest writes the header of a new topical and regenerates the index in the same commit, so a new
   topical can never be orphaned.
5. Every relative link in `AGENTS.md`, `CLAUDE.md`, memory.md and `memory/*.md` resolves.
6. A context pack states its size, stays within a budget, and says what not to load.
7. A commit made by the agent that newly leaves the index stale or breaks a link is refused, with
   the command that fixes it. A commit from the owner's own terminal is not seen by the hooks; two
   things cover that: cards read the headers and never the index, and every harvest regenerates it.
8. An existing project switches over without a manual step: its first harvest after the upgrade
   carries the migration as a commit of its own on the harvest branch.

**Done when:** all eight hold, the full suite passes, this repo's own memory is migrated, and a
harvest that creates a new topical shows it in memory.md on the harvest branch.

## Changes after the review of 2026-11-10

1. Migration reaches existing projects through the harvest branch; un-migrated memory never fails a
   check.
2. Header paths are relative to the folder that holds memory.md, and a bare file name is a keyword.
3. Only problems a commit introduces block it; the autopilot regenerates a stale index itself.
4. Goal 7 says what the commit check cannot see.
5. Two harvest branches conflict in the generated block: the resolution is documented.
6. A plan with no per-card sections keeps today's behaviour for cited documents.
7. The pack budget is fixed here (15,000), and only topicals are ever dropped.
8. Cue paths that match no file are given to the harvester, which proposes corrected cues.

## Changes after the run of 2026-11-11

9. The new code lives in a new `lib/` folder, not in `experts/`, because of the byte budget on
   `experts/` (Decisions, "Where the new code lives"). Card paths and card sections say so.

## Why

- `harvestBranch` adds a proposal's text to the file it names. A new `memory/<topic>.md` is created,
  but nothing adds it to memory.md unless the harvester also proposes that edit. If it does not,
  `matchingTopicals` never sees the file and no card loads it.
- An extension of an existing topical is added at the end of the file, not under `## Key decisions`,
  and its "Last updated" line goes stale.
- `matchingTopicals` matches substrings of backticked terms and title words of five letters or more
  from free text, so the wording of one sentence decides what a card reads.
- The only memory checks are this repo's `mirrors.test.js:141-151`. They do not run in a user's
  project, and they cannot see a topical missing from the index.
- A pack has no size limit. Large plans are one of the untested areas of 4.7.0.

## Decisions

- **Header format.** Front matter at the top of the topical, in a fixed subset only: flat keys, and
  lists written inline (`[a, b]`) or as `- item` lines. Keys: `description` (one line, required),
  `read_when.paths` (globs, relative to the memory root: the folder that holds memory.md, which
  is the project root in most projects and the plugin payload in this one), `read_when.keywords`
  (words or short phrases), `updated` (YYYY-MM-DD). At least one of paths or keywords is required.
  Anything else fails `memory check` with the line and the reason. A leading BOM is ignored. No YAML
  library: the plugin has no dependencies.
- **Not migrated is not a failure.** A topical with no header, and a memory.md with no markers, are
  the state of every project before its first harvest on 4.8.0. `memory check` reports them as
  warnings ("not migrated") and exits 0; matching uses today's parser for them. Only an invalid
  header, a stale or hand-edited generated block, or a broken link fails.
- **Markers, not the whole file.** The generated list sits between
  `<!-- uw:memory-index:start ... -->` and `<!-- uw:memory-index:end -->`. The start marker says the
  list is generated and names the command. Everything outside the markers is kept byte for byte
  (this repo's memory.md has an entry that is deliberately not a link).
- **Same line format as today**, so the plan phase's memory reader, `.cursor-plugin/ultimate-workflow/skills/the-ultimate-workflow-guidelines/references/memory-protocol.md`, Cursor and
  people reading the file work unchanged:
  `- [memory/x.md](memory/x.md) - <description> **Read when** <paths in backticks>, <keywords>.`
  Sorted by path. Line endings follow the file. Regenerating an unchanged index changes nothing.
- **Pure core, thin wrappers.** `renderIndex(memoryMdText, { [topicalPath]: topicalText })` returns
  the new memory.md text and touches nothing. The CLI wraps it with the file system; `harvestBranch`
  calls it with blobs read through `git show`, because it never touches the working tree.
- **Matching.** A topical matches a card when one of its path globs matches one of the card's paths
  (either way: a card glob that covers a file the topical names counts too; the card's paths are
  taken relative to the memory root first, so `.cursor-plugin/ultimate-workflow/hooks/gate.js`
  meets `hooks/**` in this repo), or one of its keywords appears as a whole word or phrase,
  case-insensitive, in the card's text (title, paths, carried items). A word boundary is any
  character that is not a letter or a digit, so the keyword `gate.js` is found in `hooks/gate.js`. A topical with no header falls back to today's parser on its memory.md line, so a
  project that has not migrated works as before.
- **Harvest commits.** All `memory/*` proposals of one harvest go into one commit, together with the
  regenerated memory.md. Other destinations keep one commit per file, as today. A proposal that
  names memory.md is refused with a reason; the harvester never writes the index.
- **Migration rides the harvest branch.** When the project has a topical with no header or a
  memory.md with no markers, `harvestBranch` first makes one commit, "harvest: migrate memory to
  headers", with exactly what `memory migrate` would write, and the proposals follow on top. The
  owner reviews it like any lesson; dropping the branch leaves the project as it was. This happens
  even when the harvest has no proposals, so the first run on 4.8.0 always offers it.
- **Two harvest branches.** Both regenerate the same block, so merging the second can conflict in
  memory.md. The resolution is always the same and is written in the last harvest commit's message
  and in the memory guide: take either side, run `memory index`, commit.
- **Stale cues reach the harvester.** The harvest step runs `memory check` and gives its warnings
  (a cue path that matches no file, a topical not migrated) to the harvester, which may propose
  corrected cues through `add_paths` / `add_keywords` and a new `remove_paths` field.
- **Where an extension lands.** A memory proposal for an existing topical goes under
  `## Key decisions` when the file has one (the same way a gotcha goes under `## Gotchas`), otherwise
  at the end. Its `updated:` is set to the harvest date.
- **Link check scope.** New: relative markdown links and `@path` import lines in `AGENTS.md`,
  `CLAUDE.md`, memory.md and `memory/**/*.md`. Web links, `#anchors`, placeholders in braces and
  fenced code are skipped; a `#fragment` or `?query` on a file link is stripped first. Backticked
  paths are not checked (they name globs and examples). A header path glob that matches no tracked
  file is a warning, not a failure. Missing plan-cited documents stay where they are (the pack
  preflight); nothing duplicates it.
- **One check command.** `memory check` runs the index check and the link check together and exits 1
  on any failure, printing each problem and the fixing command. `links` runs the link check alone.
- **Commit gate.** The memory check is its own evidence, gathered in `experts.js` before
  `commitEvidence` returns `skip: 'only documentation changed'`, because a memory-only commit is
  exactly the one that matters. It applies when the commit includes memory.md, `memory/**`,
  `AGENTS.md` or `CLAUDE.md`. `gates.js` stays pure: it receives the result and denies with the
  problems and the command. Fail open on an internal error, like every other gate.
- **Only new problems block.** The evidence holds two lists: the problems of the files as they are
  now, and the problems of the same files at `HEAD` (read with `git show`). A problem is new when
  it is not in the second list (compared by file, kind and target, not by line number). New
  problems deny; old ones are returned as warnings and never block. So a card that edits a file
  with a link that was already broken is not parked for it.
- **The autopilot repairs, it does not refuse.** `card-commit` regenerates a stale index itself
  (when the project is migrated) and puts memory.md in the card's commit; it refuses only for a new
  broken link or an invalid header. `run-start` runs `memory check` once and puts what it finds in
  its result as warnings, which the run report shows; it never stops a run for them.
- **What the gate cannot see.** The hooks run on the agent's tool calls. A commit the owner makes in
  a terminal is not checked. Cards read headers, not the index, so a stale index hides nothing from
  a run; the next harvest regenerates it.
- **Memory root for the gate.** The gate uses `memory_root:` from the active plan's front matter
  when there is one, otherwise the project root.
- **Measured today (2026-11-10, dry run of this plan's own packs):** every card's pack is about
  22,500 tokens. Three causes, all fixed here:
  1. Every document the plan cites goes to every card, whole: the workflow skill (about 5,800 tokens)
     reaches all seven cards, though only the docs card works on it.
  2. `AGENTS.md` is listed twice when the plan also cites it (about 2,200 tokens each time).
  3. No topical reaches any card in this repo: `matchingTopicals` reads memory.md at the project
     root, and this repo keeps it in the payload.
- **Cited documents, per card.** A document the plan cites is required for a card when the card's
  own section, its tests or its paths name it; otherwise it is a pointer: one line, "cited by the
  plan, read only if your work touches it", with its summary. A pointer is never counted and never
  dropped. **Fallback:** when no card of the plan has a section of its own (`### Card <name>`), the
  plan gives no way to tell, so every cited document is required for every card, as today. The
  missing-document preflight is unchanged. The run guide tells plan authors to name a card's
  documents in its section.
- **One entry per file.** A file listed for two reasons appears once, with both reasons.
- **`AGENTS.md` and `CLAUDE.md` are conditional.** Tested 2026-11-10: when the session starts in the
  project root (as a run does), every agent, `uw-implementer` included, already has the project
  `CLAUDE.md` and the `AGENTS.md` it imports in its context; when the session starts in another
  folder, agents get only the user's global file. So the pack lists them as "read only if not
  already in your context" (agents told the two cases apart reliably in the test), and they do not
  count toward the budget. This saves about 2,200 tokens per agent per read on this repo, without
  losing them for a session started elsewhere.
- **Memory root.** Memory is read from the project root unless the plan's front matter sets
  `memory_root:` (this repo's plans set `.cursor-plugin/ultimate-workflow`). The same value is the
  `--root` default for the commands when a plan is given.
- **Pack budget.** Size is counted as characters divided by 4, over each listed file or line range.
  Pointers, `AGENTS.md` and `CLAUDE.md` are not counted. The default budget is 15,000 tokens: about
  twice the pack expected after the fixes above (about 7,500 for this plan's harvest card before
  topicals), and not ICM's 8,000, which this plan's own cards would already exceed. A plan may set
  `pack_budget:` in its front matter. Over budget, only topicals are dropped, lowest priority
  first: keyword-only topicals, then path-matched topicals with the fewest matches. Everything else
  (the plan's sections, the card's tests, the documents the card names, handoffs, the parked
  diagnosis, the journal) is never dropped. Dropped entries are
  listed in the pack as "not loaded (budget)". A pack never fails or parks a card for its size: if
  the required entries alone are over budget, the run sends one notice naming the card and the
  size, and goes on.
- **Do-not-load list.** Every pack ends with a short fixed list: other cards' folders except the
  handoffs listed, topicals not listed, the plan outside the listed line ranges, other `PLAN-*.md`
  files.
- **The proposal schema exists twice** (`phases/harvest.js` and `phases/run.js`), because a workflow
  script cannot share modules. Both change together, and a test holds them equal.
- **This repo's own memory** lives in the plugin payload (`.cursor-plugin/ultimate-workflow/memory.md`),
  not at the git root. The commands take `--root <dir>` (default: the current folder);
  `mirrors.test.js` runs them with the payload as root.

### Where the new code lives

Decided by the owner on 2026-11-11, after the first run parked card index. The test "shipped
experts/ stays under a byte budget that grows with each expert" in
evals/security-expert/provenance.test.js caps the `experts/` folder at 430,080 bytes, and about
5,200 bytes were free. The budget is not raised. Instead:

- New code goes into a new payload folder, `.cursor-plugin/ultimate-workflow/lib/`: `memory.js`, `links.js` and `pack.js`. The
  release ZIP takes every payload folder except the two it excludes, so nothing in packaging changes.
- `lib/` holds no tests and no fixtures; they stay under evals/.
- The `experts/` folder may grow by glue only: a command route, a call into `lib/`, a changed
  argument. All seven cards together have about 4,700 bytes there.
- A card that needs more room moves the function it is changing out of `autopilot.js` or
  `experts.js` into `lib/`, and leaves a call behind. It never edits the budget test.
- The commands keep their names (`node experts/experts.js memory index`, `links`).

## Out of scope

- `## Gotchas` in `CLAUDE.md`. It is a section of a file, not an index.
- A change-impact index (ICM's System map). Its own feature, later.
- The plan phase's memory reader. It reads memory.md, which keeps its format.

## Cards

- index: generated memory index from topical headers
  paths: .cursor-plugin/ultimate-workflow/lib/memory.js, .cursor-plugin/ultimate-workflow/experts/experts.js, evals/experts/memory.test.js
  experts: [quality, genai, security]
  status: committed c0921ac8b8ee
  committed: c0921ac8b8ee
- links: link check for the entry and memory files
  paths: .cursor-plugin/ultimate-workflow/lib/links.js, .cursor-plugin/ultimate-workflow/lib/memory.js, .cursor-plugin/ultimate-workflow/experts/experts.js, evals/experts/links.test.js, evals/experts/memory.test.js
  depends: index
  experts: [quality, genai, security]
  status: committed 260c6578b8c0
  carried: developer at .cursor-plugin/ultimate-workflow/lib/memory.js:301: cli writes memory.md first and the topicals afterwards, with no rollback if a later write throws.
  committed: 260c6578b8c0
- match: cards pick topicals from the headers
  paths: .cursor-plugin/ultimate-workflow/lib/memory.js, .cursor-plugin/ultimate-workflow/experts/autopilot.js, evals/experts/autopilot.test.js, evals/experts/memory-match.test.js
  depends: index
  experts: [quality, genai, security]
  status: parked uw/parked/memory-index/match; the commit was refused: Gate G6: no review from genai covers these changes. Run /ultimate-workflow:experts, which re-asks which domain experts apply (it can only add) and runs them, then commit again.
  carried: developer at .cursor-plugin/ultimate-workflow/lib/memory.js:257: A second glob-to-regex converter was written instead of reusing globToRegExp from experts.js (line 213), and the two disagree on `**/`.
  parked: uw/parked/memory-index/match; the commit was refused: Gate G6: no review from genai covers these changes. Run /ultimate-workflow:experts, which re-asks which domain experts apply (it can only add) and runs them, then commit again.
- budget: pack size, budget and do-not-load list
  paths: .cursor-plugin/ultimate-workflow/lib/pack.js, .cursor-plugin/ultimate-workflow/experts/autopilot.js, .cursor-plugin/ultimate-workflow/experts/experts.js, .cursor-plugin/ultimate-workflow/phases/run.js, evals/experts/autopilot.test.js, evals/experts/pack-budget.test.js
  depends: match
  experts: [quality, genai, security]
  status: blocked by match
- harvest: harvest writes headers and regenerates the index
  paths: .cursor-plugin/ultimate-workflow/lib/memory.js, .cursor-plugin/ultimate-workflow/experts/autopilot.js, .cursor-plugin/ultimate-workflow/phases/harvest.js, .cursor-plugin/ultimate-workflow/phases/run.js, .cursor-plugin/ultimate-workflow/commands/harvest.md, .cursor-plugin/ultimate-workflow/agents/uw-harvester.md, evals/experts/harvest.test.js, evals/experts/autopilot.test.js
  depends: index, match, budget
  experts: [quality, genai, security]
  status: blocked by match
- gate: commit refused on a stale index or a broken link
  paths: .cursor-plugin/ultimate-workflow/hooks/lib/gates.js, .cursor-plugin/ultimate-workflow/hooks/lib/gates.test.js, .cursor-plugin/ultimate-workflow/hooks/gate.js, .cursor-plugin/ultimate-workflow/lib/memory.js, .cursor-plugin/ultimate-workflow/experts/experts.js, .cursor-plugin/ultimate-workflow/experts/autopilot.js, evals/experts/experts.test.js, evals/experts/autopilot.test.js, evals/experts/memory-gate.test.js
  depends: index, links, harvest
  experts: [quality, genai, security]
  status: blocked by harvest
- docs: templates, protocol, migration of this repo, release
  paths: .cursor-plugin/ultimate-workflow/memory.md, .cursor-plugin/ultimate-workflow/memory/**, .cursor-plugin/ultimate-workflow/skills/the-ultimate-workflow-guidelines/references/memory-protocol.md, .cursor-plugin/ultimate-workflow/skills/the-ultimate-workflow-guidelines/references/memory-template.md, .cursor-plugin/ultimate-workflow/skills/project-bootstrap-guidelines/references/memory-template.md, .cursor-plugin/ultimate-workflow/skills/project-bootstrap-guidelines/SKILL.md, .cursor-plugin/ultimate-workflow/skills/the-ultimate-workflow-guidelines/SKILL.md, .cursor-plugin/ultimate-workflow/rules/**, .cursor-plugin/ultimate-workflow/phases/run.md, mirrors.test.js, CHANGELOG.md, .cursor-plugin/plugin.json, .claude-plugin/marketplace.json
  depends: index, links, match, budget, harvest, gate
  experts: [quality, genai, security]
  status: blocked by match
- fixup: confirmed review findings
  paths: .cursor-plugin/ultimate-workflow/lib/memory.js, .cursor-plugin/ultimate-workflow/lib/links.js, .cursor-plugin/ultimate-workflow/lib/memory.js, .cursor-plugin/ultimate-workflow/lib/links.js, evals/experts/links.test.js, evals/experts/memory.test.js
  carried: correctness at C:\Users\kobiv\Projects\the-ultimate-workflow-guidelines\.cursor-plugin\ultimate-workflow\lib\memory.js:145: withHeader keeps a bare conjunction as a keyword: the strip `/^(?:or|and)\s+/` needs whitespace after the word, so a cue fragment that is only 'or' or 'and' (what is left once the backticked terms are removed) survives the `/\w/` filter.; correctness at C:\Users\kobiv\Projects\the-ultimate-workflow-guidelines\.cursor-plugin\ultimate-workflow\lib\links.js:18: fileTarget treats a home-relative import (`@~/...`) as a path relative to the project and reports it broken, only targets starting with `/`, `#`, a scheme or containing `{` are skipped.; correctness at C:\Users\kobiv\Projects\the-ultimate-workflow-guidelines\.cursor-plugin\ultimate-workflow\lib\links.js:43: brokenLinks runs the LINK regex over the whole line and does not skip inline code spans, so a markdown link shown as an example inside backticks is checked as a real link.; simplicity at .cursor-plugin/ultimate-workflow/lib/memory.js:257: A second glob-to-regex converter (`globRe`) was written although `globToRegExp` already exists and is exported from experts/experts.js:213 (and is passed around as a parameter by cardsLib and autopilot.js), and the two disagree on `**/`.; simplicity at .cursor-plugin/ultimate-workflow/lib/links.js:68: The `links` command walks the whole project tree (`listFiles(root)`, skipping only .git and node_modules) to select four fixed locations: AGENTS.md, CLAUDE.md, memory.md and memory/.; test-coverage at C:\Users\kobiv\Projects\the-ultimate-workflow-guidelines\evals\experts\links.test.js:142: The header-glob warning (globRe/cueWarnings in lib/memory.js:257-269) is only exercised with the shape `dir/**`, so the single-star and leading-`**/` semantics of the hand-written glob converter have no oracle.; test-coverage at C:\Users\kobiv\Projects\the-ultimate-workflow-guidelines\evals\experts\memory.test.js:154: No test covers a memory.md that has the start marker but no end marker, the one state where findBlock (lib/memory.js:96-102) deliberately throws instead of guessing.
  status: fixed-in-round b320f7b480da
  committed: b320f7b480da

### Card index

New `lib/memory.js` (see Decisions, "Where the new code lives"): the header parser (the fixed subset), `renderIndex` (pure), and the
commands `memory index [--root <dir>]`, `memory check [--root <dir>]` (index part only until the
links card) and `memory migrate [--root <dir>]`, routed from `experts.js` the way the autopilot
commands are. The migration is a pure function too, `migrateTexts(memoryMdText, topicals)`, which
returns the new texts; the command wraps it with the file system and the harvest card calls it with
blobs. It writes a header into each topical from its current memory.md line: a backticked term
that contains `/` or `*` goes to `paths`; a bare file name with no slash (`gate.js`), any other
backticked term and the plain cue phrases go to `keywords`; the purpose text becomes `description`;
a "Last updated" line in the body becomes `updated:` and is removed. The marked block replaces the
linked entries where the first one stood; every other line of memory.md keeps its place. It
prints what it changed; it changes nothing outside memory.md and `memory/`. A project that is not
migrated makes `memory check` warn and exit 0.

A version that passes this card's tests is on the branch uw/parked/memory-index/index, as
`experts/memory.js` with `evals/experts/memory.test.js`. Reuse it: the file moves to `lib/memory.js`,
and `experts.js` and the test require it from there.

### Card links

New `lib/links.js` with a pure `brokenLinks(files: { [path]: text }, exists: (path) => bool)` and
a CLI `links [--root <dir>]`. `memory check` calls it for the scope in Decisions. Header path globs
that match no tracked file are printed as warnings and do not change the exit code.

### Card match

The matching is a pure function in `lib/memory.js`; `matchingTopicals` in `autopilot.js` calls it.
It reads the topicals' headers and matches as Decisions says,
falling back to today's parser per topical without a header. It returns topicals in a stable order:
path matches first, then keyword matches, each by path. It also returns how each one matched, which
the budget card uses. It reads memory from `memory_root:` when the plan sets it, else the project
root.

### Card budget

The new pack logic (merging, required or pointer, sizes, the budget and the drop order) is pure
code in a new `lib/pack.js`, which `pack` in `autopilot.js` calls. `pack` lists each file once (merging the reasons), marks a plan-cited document required only when
the card's own section, tests or paths name it (all of them when the plan has no per-card
sections) and lists the rest as pointers, counts the size of each counted entry and of the pack,
applies the budget (default 15,000) and the drop order from Decisions, writes
`Pack size: about N tokens (budget M)` and any "not loaded (budget)" entries into context.md, and
ends with the do-not-load list. Its result gains `tokens`, `budget`, `dropped` and `overBudget`. The
run (`run.js`) sends one notice for a card whose required entries alone are over budget, and
`runReport` shows the pack size per card. The card's handoff records the measured pack of each card
of this plan, before and after.

### Card harvest

The proposal schema gains, for `destination: memory`, `description`, `paths`, `keywords` (required
when the file does not exist) and `add_paths`, `add_keywords` (optional, for an existing topical).
The header writing and the cue merging are pure functions in `lib/memory.js`.
`harvestBranch` writes the header for a new topical, merges the added cue terms into an existing
one, sets `updated:`, adds the text under `## Key decisions` when present, puts all memory proposals
and the regenerated memory.md in one commit, and refuses a proposal that names memory.md. Before
the proposals, when the project is not migrated, it makes the migration commit (`migrateTexts` on
blobs), also when there are no proposals. The last commit's message carries the conflict note. The
schema also gains `remove_paths`. The harvest step (both scripts) has the harvester run
`memory check` first and use its warnings. The
same schema change in `phases/run.js`. `.cursor-plugin/ultimate-workflow/commands/harvest.md` (interactive): after the accepted
proposals are applied, run `memory index`, then `memory check`. `.cursor-plugin/ultimate-workflow/agents/uw-harvester.md`: propose the header
for a new topical; never edit memory.md.

### Card gate

`experts.js` gathers the memory evidence (`memory check` on the commit's root) before the
documentation-only skip in `commitEvidence`, when the commit includes a file in the scope.
The evidence holds the problems now and the problems at `HEAD` (the comparison is a pure function in
`lib/memory.js`); `gates.js` `commitGate` (or a
sibling predicate the commit path already calls) denies only for the new ones, with the problems
and `node experts/experts.js memory index` / the broken links, and passes the old ones on as
warnings. It also runs when no expert is installed. `hooks/gate.js` passes the plan's
`memory_root:`. The autopilot's `card-commit` regenerates a stale index and adds memory.md to the
card's commit, and refuses only for a new broken link or an invalid header. `run-start` runs
`memory check` and returns its findings as warnings; `runReport` shows them.

### Card docs

Both memory-template.md copies (byte-identical), `.cursor-plugin/ultimate-workflow/skills/the-ultimate-workflow-guidelines/references/memory-protocol.md`, the bootstrap skill (seed
memory.md with empty markers), the workflow skill and its `rules/*.mdc` mirror where they describe
the index. The memory guide gains: the header, "never edit between the markers", how a project is
migrated (its first harvest), and the conflict resolution. `.cursor-plugin/ultimate-workflow/phases/run.md`
gains one line: name the documents a card must read in that card's own section. Run
`memory migrate` on this repo's payload and review the result; replace the two
`mirrors.test.js` memory tests with one that runs `memory check --root .cursor-plugin/ultimate-workflow`.
CHANGELOG 4.8.0 entry, version 4.8.0 in `plugin.json` and `marketplace.json`, and the per-commit
load check from the CHANGELOG release steps.

## Tests

Command: `node --test ".cursor-plugin/ultimate-workflow/hooks/**/*.test.js" "evals/**/*.test.js" mirrors.test.js`

### index: generated memory index from topical headers

- A header with `description`, inline `paths: [a/**, b.js]`, a block list of `keywords` and `updated`
  parses to those values; CRLF and LF files parse the same.
- Rejected, each with its line and reason: no `description`; neither paths nor keywords; a nested
  map deeper than `read_when`; an unknown key; an unclosed header; a tab-indented list.
- `renderIndex` keeps everything outside the markers byte for byte, including a hand-written
  non-link entry, and rewrites only between them.
- No markers yet: `renderIndex` appends the marked block at the end and changes nothing else.
- The output is sorted by path, uses the file's line endings, and a second run on its own output is
  a no-op (byte-identical).
- A topical whose header is invalid is not indexed and `memory check` names it and exits 1.
- Not migrated: a project whose topicals have no headers and whose memory.md has no markers makes
  `memory check` print "not migrated" warnings and exit 0. A project with some topicals migrated
  and some not also exits 0, and the index lists only the migrated ones between the markers.
- A header after a BOM parses.
- Migration of a cue: `hooks/**` goes to paths, a bare `gate.js` goes to keywords, a quoted phrase
  goes to keywords whole.
- Migration keeps every line of memory.md that is not a linked entry in its place; the marked block
  stands where the first linked entry stood.
- `migrateTexts` reads nothing from disk.
- `memory check` fails on: a topical missing from the index, an index line for a file that does not
  exist, a hand-edited line between the markers. It passes on a freshly generated index.
- `memory migrate` on a copy of this repo's payload: every linked entry gets a header, the
  non-link research entry stays outside the markers, `memory check` passes afterwards, and a
  second `migrate` changes nothing.
- `renderIndex` reads nothing from disk: it works on an empty temp folder given text only.

### links: link check for the entry and memory files

- A relative markdown link to a missing file is reported with file and line; to an existing file
  passes; `[x](./a.md#part)` and `[x](a.md?x=1)` resolve to a.md; a percent-encoded or
  angle-bracketed path resolves.
- `https://...`, `#anchor`, `{placeholder}` links and anything inside a fenced block are not
  checked.
- An `@AGENTS.md` import line in `CLAUDE.md` is checked; a missing target fails.
- A link relative to a file in `memory/` resolves from that folder, not from the root.
- A header path glob that matches no tracked file is printed as a warning and the exit code stays 0.
- `memory check` fails when a link is broken even if the index is current, and passes when both are
  fine.
- Files outside the scope (for example a `docs/` page with a broken link) are not checked.

### match: cards pick topicals from the headers

- A card whose path is `hooks/lib/gates.js` matches a topical with `paths: [hooks/**]`; a card whose
  path glob is `hooks/**` matches a topical with `paths: [hooks/lib/gates.js]`.
- A keyword phrase (`a gate is not firing`) matches when it appears in a carried item; a keyword
  matches as a whole word only (`gate` does not match `gateway`).
- The keyword `gate.js` matches a card whose path is `hooks/gate.js`, and does not match
  `hooks/mygate.js`.
- Header paths are relative to the memory root: with `memory_root: sub/dir`, a topical with
  `paths: [hooks/**]` matches a card whose path is `sub/dir/hooks/x.js` and not one whose path is
  `hooks/x.js`.
- A topical with no header still matches through its memory.md cue, as today.
- A topical that is in `memory/` but missing from memory.md is still matched from its header.
- With `memory_root: sub/dir` in the plan's front matter, topicals are read from `sub/dir/memory/`
  and returned as paths from the project root; without it, from the root, as today. On this repo,
  a card whose paths are under `.cursor-plugin/ultimate-workflow/hooks/` gets the hooks-and-gates topical.
- Order is stable: path matches first, then keyword matches, each sorted by path; each result says
  how it matched.
- Behaviour against today, measured: for the eval fixture cards and five cards written against this
  repo's own areas (hooks, phases, mirrors, install, context), the new matcher returns every topical
  the old one did after `migrate`, or the test lists each extra one with the reason. No topical the
  old matcher returned is lost.

### budget: pack size, budget and do-not-load list

- Size is characters divided by 4 over the listed line ranges only: a 400-character range in a
  4,000-character file counts 100.
- A file listed for two reasons (the plan cites `AGENTS.md`, and it is the project rules) appears
  once, with both reasons.
- `AGENTS.md` and `CLAUDE.md` are listed as "read only if not already in your context", and their
  size is not counted toward the budget.
- A document the plan cites but the card's section, tests and paths do not name is listed as a
  one-line pointer and is not counted; one the card names is required and counted.
- A plan with no per-card section at all: every cited document is required for every card, as
  today (the calc fixture's packs list the same documents before and after).
- On this plan, the measured pack of every card except docs no longer carries the workflow skill
  as required, and each card's counted size is under 15,000 and smaller than the 2026-11-10 measure
  (about 22,500 tokens).
- The default budget is 15,000. Under budget: nothing is dropped and the pack states its size and
  the budget.
- Over budget: only topicals are dropped, keyword-only ones before path-matched ones, and among
  those the one with the fewest matches first; each dropped entry appears as "not loaded (budget)".
- Plan sections, the card's tests, the documents the card names, pointers, handoffs, the parked
  diagnosis and the journal are never dropped, whatever the budget.
- Required entries alone over budget: `pack` returns `ok: true` with `overBudget: true`, the run
  sends exactly one notice naming the card and the size, and the card goes on (no park).
- `pack_budget:` in the plan's front matter overrides the default; a non-number is ignored with a
  warning.
- Every pack ends with the do-not-load list.
- `runReport` shows the pack size for each card.

### harvest: harvest writes headers and regenerates the index

- A proposal for a new `memory/<new-topic>.md` with description, paths and keywords: on `uw/harvest/<f>` the
  file starts with that header, memory.md lists it, and both are in one commit.
- A new-topical proposal without `description`, or without both paths and keywords, is refused with
  a reason and nothing is committed.
- A proposal for an existing topical with `add_paths` merges the paths into its header without
  duplicates, sets `updated:` to the harvest date, and adds the text under `## Key decisions`.
- An existing topical with no `## Key decisions` gets the text at the end.
- Two memory proposals and a gotcha: the memory files and memory.md are one commit, `CLAUDE.md`
  another.
- A proposal naming memory.md is refused with a reason.
- A project that is not migrated: the first commit on the harvest branch is the migration (every
  topical has a header, memory.md has the markers, `memory check` passes on that commit's tree),
  and the proposals follow in later commits.
- A project that is not migrated and a harvest with no proposals: the branch is still made, with
  the migration commit alone. A migrated project with no proposals makes no branch, as today.
- A migrated project gets no migration commit.
- `remove_paths` removes the named globs from an existing topical's header; removing the last cue
  of a topical is refused with a reason.
- The last harvest commit's message says how to resolve a conflict in memory.md (take either
  side, run `memory index`).
- Two harvest branches from the same tip, each adding a topical, merged one after the other: after
  resolving memory.md either way and running `memory index`, both topicals are listed and
  `memory check` passes.
- Both harvest scripts tell the harvester to run `memory check` and use its warnings (the prompt
  holds the command).
- The working tree and the current branch are unchanged after `harvest-branch`.
- The proposal schemas in `phases/harvest.js` and `phases/run.js` are equal (parsed from the files).
- `.cursor-plugin/ultimate-workflow/commands/harvest.md` names `memory index` and `memory check` after the proposals are applied.

### gate: commit refused on a stale index or a broken link

- A commit that stages only `memory/<new-topic>.md` with a stale memory.md is denied, and the message names
  `memory index`. (Today this commit is skipped as documentation only.)
- A commit that stages only `AGENTS.md` with a broken link is denied, and the message names the file,
  line and target.
- A commit that edits `AGENTS.md` and leaves a link that was already broken at `HEAD` is allowed,
  and the broken link is returned as a warning. The same commit adding a second broken link is
  denied for the new one only.
- A broken link that only moved to another line is not new.
- A project that is not migrated is never denied for its index.
- With no expert installed, a stale index is still denied.
- With `memory_root:` in the active plan, the gate checks that folder's memory.
- A commit with a current index and no broken links is not denied by this rule.
- A commit that touches none of the files in scope does not run the memory check at all.
- An internal error in the memory check allows the commit (fail open).
- `card-commit` on a migrated project whose card changed a topical's header: the commit holds the
  regenerated memory.md and the card is committed, not refused.
- `card-commit` refuses a card that adds a broken link or an invalid header, with the gate's
  message; it does not refuse for a link already broken at `HEAD`.
- `run-start` on a project with a stale index and a broken link returns both as warnings and
  `ok: true`; `runReport` shows them.
- `gates.js` still reads no files: the predicate is tested with evidence objects only.

### docs: templates, protocol, migration of this repo, release

- The two memory-template.md copies are byte-identical, and both show the header and the markers.
- `memory check --root .cursor-plugin/ultimate-workflow` passes on this repo, run from
  `mirrors.test.js`.
- Every topical in this repo's `memory/` has a header, and the research entry is still outside the
  markers.
- The bootstrap skill seeds memory.md with empty markers, and `state.js`'s handoff check still
  passes on the seeded file.
- The memory guide names the header, the markers rule, the first-harvest migration and the conflict
  resolution; the run guide says to name a card's documents in its section.
- The rules mirror and the skill say the same thing about the index (the existing mirror tests pass).
- `plugin.json` and `marketplace.json` say 4.8.0; the CHANGELOG has a 4.8.0 entry.
- The full suite passes; every changed `.js` file parses at its own commit.

## Order and versions

index, links, match, budget, harvest, gate, docs, one at a time (several share `autopilot.js` and
`experts.js`). One release, 4.8.0.

## Risks

- **Packs grow.** Keywords now match all the card's text, not just its title. The budget card caps it,
  and the match card measures the difference.
- **Migration loses a cue.** A phrase that splits badly into paths and keywords could stop matching.
  The match card's behaviour test catches it before release.
- **The gate becomes noisy.** It runs only when a file in scope is in the commit, blocks only for
  problems that commit introduces, and its message carries the fixing command.
- **A card misses a document it needed**, because the plan cited it only in a shared section. The
  document is still in the pack as a pointer with its summary, and plans with no per-card sections
  keep today's behaviour.
- **The migration writes a poor cue** in someone's project. It arrives as a commit on the harvest
  branch, which the owner reads before merging, and the old matcher's results are the test's floor.
- **A later card runs out of room in `experts/`.** About 4,700 bytes are left for glue. The rule in
  Decisions tells the card to move the function it is changing into `lib/`; the full suite fails on
  the budget test if it does not.
- **The plan file is gitignored** (`PLAN-*.md`). It must be committed with `git add -f` before the run,
  or the run cannot commit card statuses into it (`commitPlan` refuses an ignored path; a tracked file
  is not ignored).

## Run status

- Date: 2026-11-11
- Run branch: uw/run/memory-index
- Cards: 2 committed, 1 parked, 4 blocked, 1 fixed-in-round
- Harvest: uw/harvest/memory-index
- Report: .ultimate-workflow/run/memory-index/report.md
