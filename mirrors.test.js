'use strict';

// The mirror check.
//
// Two hosts read the same guidance through different mechanisms, so some files
// are hand-copies. The README already carried a note listing the one deliberate
// divergence -- and an UNDOCUMENTED one crept in anyway, a closing line that
// drifted out of SKILL.md unnoticed for weeks.
//
// That is the whole argument for this file: a documented divergence list
// without a check is a comment, not a control. Every exception below is a
// literal with a reason attached, so an entry nobody can justify stands out.
//
// There is no exception table at the moment, deliberately. One existed holding
// zero exceptions, and its only test asserted a string literal in this file
// against itself -- machinery for a case that had not arisen. Reintroduce it
// when a real divergence needs recording, not before.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = __dirname;
// Shippable plugin payload. Lives under .cursor-plugin/ so Cursor's
// marketplace sparse-checkout (which only keeps /.cursor-plugin/ and
// /.claude-plugin/) actually materializes rules/agents/skills/commands.
const PLUGIN = path.join('.cursor-plugin', 'ultimate-workflow');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const lines = (p) => read(p).split(/\r?\n/).length;
const pread = (p) => read(path.join(PLUGIN, p));
const plines = (p) => pread(p).split(/\r?\n/).length;
const pjoin = (...parts) => path.join(PLUGIN, ...parts);

/** Resolve a backtick path from an always-on index: plugin-relative or repo-root. */
function resolveIndexRef(ref, fromPluginRule) {
  if (fromPluginRule) return pjoin(ref);
  // Repo AGENTS.md may use the plugin prefix or a short path (legacy).
  if (ref.startsWith('.cursor-plugin/') || ref.startsWith('research/') || ref.startsWith('PRD-')) {
    return path.join(root, ref);
  }
  if (fs.existsSync(path.join(root, ref))) return path.join(root, ref);
  return pjoin(ref);
}

function headings(text) {
  return text
    .split(/\r?\n/)
    .filter((l) => /^#{2,3} /.test(l))
    .map((l) => l.trim());
}

// --- the always-on pair ----------------------------------------------------
// AGENTS.md and the alwaysApply rule are the two files loaded on every turn,
// one per host. They should carry the same shape, because they answer the same
// question: what does this agent need before it knows what it is doing?
//
// AGENTS.md rather than CLAUDE.md: Cursor reads AGENTS.md natively and Claude
// Code reads only CLAUDE.md, which is now a bare `@AGENTS.md` import. One
// source of truth, two hosts, no hand-copied body.

test('the two always-on indexes cover the same sections', () => {
  const claude = headings(read('AGENTS.md'));
  const cursor = headings(pread('rules/the-ultimate-workflow-guidelines.mdc'));

  const core = ['## Principles', '## Workflow', '## When to skip', '## Where things live', '## Hard constraints', '## Gotchas'];
  for (const h of core) {
    assert.ok(claude.includes(h), `CLAUDE.md is missing ${h}`);
    assert.ok(cursor.includes(h), `the Cursor rule is missing ${h}`);
  }
});

test('both always-on files state the same hard constraints', () => {
  for (const f of ['AGENTS.md', path.join(PLUGIN, 'rules/the-ultimate-workflow-guidelines.mdc')]) {
    const t = read(f);
    assert.match(t, /no `package.json`/i, `${f} lost the dependency constraint`);
    assert.match(t, /no emojis in code/i, `${f} lost the emoji constraint`);
    assert.match(t, /node --test/, `${f} lost the verify command`);
  }
});

// --- the ratchet -----------------------------------------------------------
// Always-on context is paid for every turn whether relevant or not. It does not
// stay thin on its own; something has to push back. See memory/context-boundary.md.

test('CLAUDE.md stays a thin index', () => {
  const n = lines('CLAUDE.md');
  assert.ok(n <= 70, `CLAUDE.md is ${n} lines; the cap is 70. Move content to a memory/ topical instead of raising this.`);
});

test('the Cursor always-on rule stays thin', () => {
  const n = plines('rules/the-ultimate-workflow-guidelines.mdc');
  assert.ok(n <= 90, `the Cursor rule is ${n} lines; the cap is 90.`);
});

// --- the duplicated template ----------------------------------------------

test('the two memory-template copies are byte-identical', () => {
  const a = pread('skills/project-bootstrap-guidelines/references/memory-template.md');
  const b = pread('skills/the-ultimate-workflow-guidelines/references/memory-template.md');
  assert.equal(
    a,
    b,
    'The two memory-template.md copies have drifted. Do NOT fix this by deleting one: release-skills.yml zips each skill directory independently, so a cross-skill path breaks a single-skill install. See memory/mirrors.md.'
  );
});

// --- routing integrity -----------------------------------------------------
// A thin index is only useful if its pointers resolve. A dead pointer in
// always-on context is worse than no pointer: it costs tokens every turn and
// sends the reader nowhere.

test('every file the always-on indexes point at actually exists', () => {
  const indexes = [
    { file: 'AGENTS.md', fromPlugin: false },
    { file: path.join(PLUGIN, 'rules/the-ultimate-workflow-guidelines.mdc'), fromPlugin: true },
  ];
  for (const { file, fromPlugin } of indexes) {
    const text = read(file);
    const refs = [
      ...text.matchAll(
        /`((?:\.cursor-plugin\/ultimate-workflow\/)?(?:memory|skills|research|hooks|workflows|agents)\/[^`]+?\.(?:md|js)|PRD-[^`]+?\.md)`/g
      ),
    ]
      .map((m) => m[1])
      .filter((r) => !r.includes('*'));
    assert.ok(refs.length > 0, `${file} points at nothing, which defeats an index`);
    for (const r of refs) {
      let target;
      if (r.startsWith('.cursor-plugin/') || r.startsWith('research/') || r.startsWith('PRD-')) {
        target = path.join(root, r);
      } else {
        target = resolveIndexRef(r, fromPlugin);
      }
      assert.ok(fs.existsSync(target), `${file} points at ${r}, which does not exist (tried ${target})`);
    }
  }
});

test('every memory.md entry points at a file that exists', () => {
  const idx = pread('memory.md');
  const refs = [...idx.matchAll(/\]\(([^)]+\.md)\)/g)].map((m) => m[1]);
  assert.ok(refs.length >= 4, 'memory.md should index the topicals');
  for (const r of refs) {
    const target = r.startsWith('research/') ? path.join(root, r) : pjoin(r);
    assert.ok(fs.existsSync(target), `memory.md points at ${r}, which does not exist`);
  }
});

test('every memory.md entry carries a Read when cue', () => {
  const idx = pread('memory.md');
  const entries = idx.split(/\r?\n/).filter((l) => /^- \[/.test(l));
  assert.ok(entries.length >= 4);
  for (const e of entries) {
    assert.match(e, /\*\*Read when\*\*/, `an index entry has no "Read when" cue, so nothing will retrieve it: ${e.slice(0, 70)}`);
  }
});

// --- the write-isolation invariant ----------------------------------------

test('exactly one agent can write, and it is the implementer', () => {
  const dir = pjoin('agents');
  const writers = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .filter((f) => {
      const t = fs.readFileSync(path.join(dir, f), 'utf8');
      const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(t);
      return fm && /tools:.*\b(Write|Edit)\b/.test(fm[1]);
    });
  assert.deepEqual(writers, ['uw-implementer.md'], `expected only uw-implementer to have write tools, got ${writers.join(', ')}`);
});

test('every read-only agent carries the Cursor readonly key too', () => {
  const dir = pjoin('agents');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md') && x !== 'uw-implementer.md')) {
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(fs.readFileSync(path.join(dir, f), 'utf8'));
    assert.match(fm[1], /readonly:\s*true/, `${f} restricts tools for Claude Code but not writes for Cursor`);
  }
});

test('the implementer never gains readonly', () => {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(pread('agents/uw-implementer.md'));
  assert.doesNotMatch(fm[1], /readonly/, 'uw-implementer must stay writable -- it is the only phase that changes the repository');
});

// --- the command surface -----------------------------------------------------
//
// `workflows/*.js` are scripts for the Workflow tool, not a slash-command
// surface. `commands/*.md` is what makes `/ultimate-workflow:plan` -- advertised
// in the README, SKILL.md, and both always-on indexes -- actually exist. A
// command with no script, or a script with no command, is an advertised feature
// that is not there, which is the exact defect class this session kept finding.

const PHASES = ['plan', 'tests', 'build', 'review', 'harvest'];

test('every advertised phase has both a command and a script', () => {
  for (const p of PHASES) {
    assert.ok(fs.existsSync(pjoin('commands', `${p}.md`)), `no command for /${p}`);
    assert.ok(fs.existsSync(pjoin('workflows', `${p}.js`)), `no script for /${p}`);
  }
});

test('no command points at a script that does not exist', () => {
  const dir = pjoin('commands');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    const m = /workflows\/([a-z-]+)\.js/.exec(text);
    if (!PHASES.includes(f.replace(/\.md$/, ''))) {
      // A prompt-only command such as /handoff runs no script, by design: it is
      // user-triggered and has nothing to orchestrate. It still has to be a real
      // command, which the front-matter test below covers.
      assert.equal(m, null, `${f} is not a phase but names a workflow script`);
      continue;
    }
    assert.ok(m, `${f} never names a workflow script`);
    assert.ok(
      fs.existsSync(pjoin('workflows', `${m[1]}.js`)),
      `${f} points at workflows/${m[1]}.js, which does not exist`
    );
  }
});

test('no script is left without a command to invoke it', () => {
  const scripts = fs
    .readdirSync(pjoin('workflows'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => f.replace(/\.js$/, ''));
  for (const s of scripts) {
    assert.ok(
      fs.existsSync(pjoin('commands', `${s}.md`)),
      `workflows/${s}.js has no command, so nothing can reach it`
    );
  }
});

test('each command declares a description, or the plugin lists it blank', () => {
  const dir = pjoin('commands');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(fs.readFileSync(path.join(dir, f), 'utf8'));
    assert.ok(fm, `${f} has no front matter`);
    assert.match(fm[1], /description:\s*\S/, `${f} has no description`);
  }
});

test('the phase count in the prose matches the number of phases that exist', () => {
  // "Five phases" appears in the README, both manifests, and both indexes.
  // If a sixth lands, this is the thing that notices.
  assert.equal(PHASES.length, 5);
  for (const rel of ['README.md', 'CLAUDE.md']) {
    const t = read(rel);
    if (/\bfive phases\b/i.test(t) || /\bFive phases\b/.test(t)) {
      assert.equal(fs.readdirSync(pjoin('workflows')).filter((f) => f.endsWith('.js')).length, 5,
        `${rel} says five phases`);
    }
  }
});

// --- Cursor's retrieval mechanism -------------------------------------------
//
// On Claude Code a topical is reached through its Read-when cue in memory.md.
// Cursor does not act on that pointer; its dynamic-context mechanism is an
// alwaysApply: false rule selected by description. So each topical needs a
// matching on-demand rule or it is simply unreachable on that host -- which it
// was, silently, until v3.0.0. These checks keep the two sets in step.

function topicals() {
  return fs
    .readdirSync(pjoin('memory'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));
}

function onDemandRules() {
  return fs
    .readdirSync(pjoin('rules'))
    .filter((f) => f.startsWith('uw-') && f.endsWith('.mdc'));
}

test('every memory topical has an on-demand Cursor rule to reach it', () => {
  for (const t of topicals()) {
    const rule = pjoin('rules', `uw-${t}.mdc`);
    assert.ok(
      fs.existsSync(rule),
      `memory/${t}.md has no rules/uw-${t}.mdc, so Cursor can never retrieve it`
    );
  }
});

test('no on-demand rule points at a topical that does not exist', () => {
  for (const f of onDemandRules()) {
    const text = fs.readFileSync(pjoin('rules', f), 'utf8');
    const m = /memory\/([a-z-]+)\.md/.exec(text);
    assert.ok(m, `${f} never names a topical, so it carries no content`);
    assert.ok(
      fs.existsSync(pjoin('memory', `${m[1]}.md`)),
      `${f} points at memory/${m[1]}.md, which does not exist`
    );
  }
});

test('on-demand rules are on-demand, and carry a selection cue', () => {
  for (const f of onDemandRules()) {
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(fs.readFileSync(pjoin('rules', f), 'utf8'));
    assert.ok(fm, `${f} has no front matter`);
    assert.match(fm[1], /alwaysApply:\s*false/, `${f} is always-on, which defeats the point of moving it`);
    // The description IS the retrieval trigger on Cursor. A vague one does not fire.
    const desc = /description:\s*(.+)/.exec(fm[1]);
    assert.ok(desc, `${f} has no description`);
    assert.ok(
      desc[1].trim().length > 60,
      `${f} has a description too vague to select on: "${desc[1].trim()}"`
    );
  }
});

test('the on-demand rules point at their topical rather than copying it', () => {
  // A fifth hand-maintained copy of the same prose is exactly the drift the
  // rest of this file exists to prevent.
  for (const f of onDemandRules()) {
    const rule = fs.readFileSync(pjoin('rules', f), 'utf8');
    const m = /memory\/([a-z-]+)\.md/.exec(rule);
    const topical = fs.readFileSync(pjoin('memory', `${m[1]}.md`), 'utf8');
    assert.ok(
      rule.length < topical.length,
      `${f} is longer than the topical it points at -- it has become a copy`
    );
  }
});

// --- the public site --------------------------------------------------------
//
// docs/index.html is what the README calls the "Visual walkthrough", and it
// drifted an entire major version without anything noticing: it still said
// "two-skill plugin" and "the two workflows" after the five phases shipped,
// still told readers CLAUDE.md "mirrors skill 1's body" (the precise thing v3
// stopped doing), and still printed an install command for a plugin name that
// was renamed two releases earlier -- so following the page verbatim failed.
//
// It is a mirror of the README in everything but format, so it belongs here.

const SITE = 'docs/index.html';

test('the site names every phase, and the count matches the scripts', () => {
  const t = read(SITE);
  for (const p of PHASES) {
    assert.match(t, new RegExp(`<code>${p}</code>`), `the site never mentions the ${p} phase`);
  }
  const scripts = fs.readdirSync(pjoin('workflows')).filter((f) => f.endsWith('.js'));
  assert.equal(scripts.length, PHASES.length, 'a phase was added or removed without updating the site');
});

test('the site does not advertise an install command for the old plugin name', () => {
  // The plugin name namespaces everything it ships, so a stale one is not a
  // cosmetic error -- the command fails.
  const t = read(SITE);
  const canonical = JSON.parse(pread('.claude-plugin/plugin.json')).name;
  const installs = [...t.matchAll(/\/plugin install ([\w-]+)/g)].map((m) => m[1]);
  assert.ok(installs.length > 0, 'the site no longer documents how to install');
  for (const name of installs) {
    assert.equal(name, canonical, `the site installs "${name}", but the manifest name is "${canonical}"`);
  }
});

test('the site and the README claim the same hosts', () => {
  const site = read(SITE);
  const readme = read('README.md');
  for (const host of ['Claude Code', 'Cursor', 'Codex CLI', 'Gemini CLI', 'Claude Desktop']) {
    assert.ok(readme.includes(host), `README stopped naming ${host}`);
    // The site may abbreviate in its table, so match the distinctive word.
    const key = host.split(' ')[0];
    assert.ok(site.includes(key), `the site never names ${host}, which the README promises`);
  }
});

test('the site does not still describe the always-on files as body copies', () => {
  // This is the claim that was actively harmful: a reader following it
  // re-inlines the skill body into CLAUDE.md and undoes the restructure.
  const t = read(SITE);
  assert.doesNotMatch(t, /Mirrors skill 1's body/i, 'the site still says CLAUDE.md mirrors the skill body');
  assert.doesNotMatch(t, /Same body content/i, 'the site still says the Cursor rules are body copies');
});

test('no plan file is tracked outside internal/', () => {
  // Broader than the docs/ check below, and it had to be: PLAN-graph-native.md
  // was committed before .gitignore could matter -- an ignore rule does not
  // apply to an already-tracked file -- so it shipped inside the v3.0.0 plugin
  // ZIP, the artifact every Desktop and offline Cursor user downloads. The
  // docs/ guard did not see it because it was at the repo root.
  const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
    .split(String.fromCharCode(10))
    .filter(Boolean);
  const stray = tracked.filter(
    // Case-sensitive on purpose: the working artifact is `PLAN-<feature>.md`,
    // while `references/plan-template.md` is a shipped template and belongs in
    // the ZIP. An /i match conflates the two.
    (p) => /(^|\/)PLAN-.+\.md$/.test(p) && !p.startsWith('internal/')
  );
  assert.deepEqual(
    stray,
    [],
    `tracked plan files outside internal/ ship in the release ZIP: ${stray.join(', ')}`
  );
});

test('nothing under docs/ is an internal plan file', () => {
  // GitHub Pages serves docs/. Working notes are candid by design and are not
  // written to be read by strangers, so the publish root is the wrong home.
  const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
    );
  for (const f of walk(path.join(root, 'docs'))) {
    assert.doesNotMatch(
      path.basename(f),
      /^PLAN-.+\.md$/i,
      `${path.relative(root, f)} would be published by GitHub Pages; internal/plans/ is its home`
    );
  }
});

// --- Cursor / Claude install materialization --------------------------------
//
// Cursor marketplace clones of this repo use a cone sparse-checkout that keeps
// only root files plus /.cursor-plugin/ and /.claude-plugin/. A plugin whose
// rules/agents/skills/commands lived at the repo root looked installed and was
// empty. The shippable tree now lives under .cursor-plugin/ultimate-workflow/
// so the cone includes it. These checks pin that invariant without running
// Cursor or zip(1).

const CURSOR_SPARSE_INCLUDED_PREFIXES = ['.claude-plugin/', '.cursor-plugin/'];

function cursorSparseIncludes(relPosix) {
  const n = relPosix.replace(/\\/g, '/');
  // Root files (no slash) are included by /* ; directories only if under a prefix.
  if (!n.includes('/')) return true;
  return CURSOR_SPARSE_INCLUDED_PREFIXES.some((p) => n === p.slice(0, -1) || n.startsWith(p));
}

const REQUIRED_PLUGIN_FILES = [
  '.claude-plugin/plugin.json',
  '.cursor-plugin/plugin.json',
  'skills/the-ultimate-workflow-guidelines/SKILL.md',
  'skills/project-bootstrap-guidelines/SKILL.md',
  'rules/the-ultimate-workflow-guidelines.mdc',
  'agents/uw-explorer.md',
  'agents/uw-implementer.md',
  'commands/plan.md',
  'commands/build.md',
  'memory.md',
  'memory/mirrors.md',
  'hooks/hooks.json',
  'workflows/plan.js',
];

test('the plugin root is under a Cursor sparse-included prefix', () => {
  const pluginPosix = PLUGIN.replace(/\\/g, '/');
  assert.ok(
    cursorSparseIncludes(pluginPosix + '/agents/uw-explorer.md'),
    `${pluginPosix} is outside Cursor's marketplace sparse cone; /add-plugin would ship an empty plugin`
  );
});

test('every required plugin file survives the Cursor sparse cone', () => {
  for (const rel of REQUIRED_PLUGIN_FILES) {
    const full = path.join(PLUGIN, rel).replace(/\\/g, '/');
    assert.ok(fs.existsSync(path.join(root, PLUGIN, rel)), `missing ${full}`);
    assert.ok(
      cursorSparseIncludes(full),
      `${full} would be stripped by Cursor marketplace sparse-checkout`
    );
  }
});

test('both marketplaces point at the nested plugin, not github-of-self root', () => {
  const claude = JSON.parse(read('.claude-plugin/marketplace.json'));
  const cursor = JSON.parse(read('.cursor-plugin/marketplace.json'));
  const cSrc = claude.plugins[0].source;
  const uSrc = cursor.plugins[0].source;
  assert.equal(typeof cSrc, 'string', 'Claude marketplace must use a relative path source after the nest');
  assert.equal(typeof uSrc, 'string', 'Cursor marketplace must use a relative path source after the nest');
  assert.match(String(cSrc), /ultimate-workflow/, `Claude source is ${cSrc}`);
  assert.match(String(uSrc), /ultimate-workflow/, `Cursor source is ${uSrc}`);
  assert.notEqual(cSrc, './', 'Claude source must not be marketplace root');
  assert.ok(
    fs.existsSync(path.join(root, String(cSrc).replace(/^\.\//, ''), '.claude-plugin/plugin.json')),
    `Claude source ${cSrc} has no plugin.json`
  );
  assert.ok(
    fs.existsSync(path.join(root, String(uSrc).replace(/^\.\//, ''), '.cursor-plugin/plugin.json')),
    `Cursor source ${uSrc} has no plugin.json`
  );
});

test('simulated release ZIP from the plugin root includes the Cursor payload', () => {
  // release-skills.yml zips the plugin directory. Membership ~= git ls-files
  // under PLUGIN, minus paths that would be excluded if present.
  const tracked = execFileSync('git', ['ls-files', '-z', PLUGIN], { cwd: root })
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .map((p) => p.replace(/\\/g, '/'));
  const pluginPrefix = PLUGIN.replace(/\\/g, '/') + '/';
  const members = tracked
    .filter((p) => p.startsWith(pluginPrefix))
    .map((p) => p.slice(pluginPrefix.length));
  for (const rel of REQUIRED_PLUGIN_FILES) {
    assert.ok(
      members.includes(rel.replace(/\\/g, '/')),
      `release ZIP would omit ${rel}`
    );
  }
  assert.ok(!members.some((m) => /(^|\/)PLAN-.+\.md$/.test(m)), 'release ZIP must not contain PLAN-*.md');
  assert.ok(!members.includes('AGENTS.md'), 'AGENTS.md is repo dogfood, not the plugin always-on');
});

// --- shipped links -----------------------------------------------------------
//
// The v3.0.1 restructure moved the payload to .cursor-plugin/ultimate-workflow/
// and broke three references inside it: memory.md linked a research summary that
// is not shipped, context-boundary.md pointed at a memory-protocol.md path that
// no longer resolved, and memory-protocol.md named `references/memory-template.md`
// while sitting inside `references/` itself.
//
// All three resolved fine from the repo root, so nobody working here could see
// them. They were dead only for someone who had installed the plugin -- which is
// the one reader who cannot report the problem.

const PAYLOAD = path.join(root, '.cursor-plugin', 'ultimate-workflow');

// A placeholder is not a link.
const PLACEHOLDER = /[<>]/;

// Files a TEMPLATE tells the USER to create in their own project. They are
// examples, not our files, and will never exist here.
const TEMPLATE_EXAMPLES = new Set([
  'memory/auth.md', 'memory/db.md', 'memory/gotchas.md',
  'memory/api.md', 'memory/testing.md', 'memory/deploy.md',
]);

// Without both filters this check reports 34 false positives and gets deleted by
// whoever sees it fail next. That is the failure mode it is designed against.

function shippedDocs(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) shippedDocs(p, acc);
    else if (/\.(md|mdc)$/i.test(e.name)) acc.push(p);
  }
  return acc;
}

function pathRefs(text) {
  const out = new Set();
  for (const m of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) out.add(m[1]);
  for (const m of text.matchAll(/`([^`\n]+)`/g)) {
    const v = m[1].trim();
    if (v.includes('/') && /\.(md|mdc|js|json|html)$/i.test(v) && !v.includes(' ')) out.add(v);
  }
  return [...out]
    .map((r) => r.split('#')[0].trim())
    .filter((r) => r && !/^(https?:|mailto:|#|\$\{)/.test(r))
    .filter((r) => !r.includes('*'))
    .filter((r) => !PLACEHOLDER.test(r))
    .filter((r) => !TEMPLATE_EXAMPLES.has(r))
    // A leading-dot directory is packaging or runtime, never shipped content:
    // `.claude-plugin/` and `.cursor-plugin/` are the repo's marketplace
    // catalogs (cursor-install.md says so on the line above), and
    // `.ultimate-workflow/` is the heartbeat directory inside the USER's
    // project. That last one resolved here only by accident -- this repo has a
    // heartbeat file from dogfooding, which is exactly the kind of coincidence
    // that turns a check into a liar.
    .filter((r) => !r.startsWith('.'));
}

test('no shipped file points at a path that exists only outside the payload', () => {
  const offenders = [];

  for (const file of shippedDocs(PAYLOAD)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const ref of pathRefs(text)) {
      const fromOwnDir = fs.existsSync(path.resolve(path.dirname(file), ref));
      const fromPayload = fs.existsSync(path.join(PAYLOAD, ref));
      if (fromOwnDir || fromPayload) continue;

      // Anything that resolves NOWHERE is a finding, not just paths left behind
      // by the move.
      //
      // The first version of this check only flagged refs that still resolved at
      // the repo root, on the theory that those were the move's leftovers. Then
      // reintroducing a real defect failed to turn it red: two of the three
      // findings it was written for pointed at paths that existed under no root
      // at all. A guard that passes against the bug it was built for is worse
      // than none, because it certifies the thing it cannot see.
      const whereItDoesResolve = fs.existsSync(path.join(root, ref))
        ? ' (resolves at the repo root -- left behind by the payload move)'
        : ' (resolves nowhere)';
      offenders.push(`${path.relative(root, file)} -> ${ref}${whereItDoesResolve}`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `these resolve for a contributor and are dead for an installed user:\n  ${offenders.join('\n  ')}`
  );
});
