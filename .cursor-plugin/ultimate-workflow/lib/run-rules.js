'use strict';

// Pure rules of the unattended run (PLAN-run-fixes.md). No file is read and no experts/ file is
// required here: experts.js requires this one, and a require the other way round would hand it a
// half-built exports object.

// The cards the run writes itself. They are left out of the confirmed hash, so they never narrow G6
// on their own word.
const RUN_ADDED = /^(findings|fixup)(-\d+)?$/i;

// A card's `experts: none` is the empty list.
const expertsOf = (card) => (card.experts.length === 1 && card.experts[0].toLowerCase() === 'none' ? [] : card.experts);

/** The files a card was accepted for (`accepted:` run field), in the plan text. */
function acceptedFiles(planText, name) {
  const want = String(name).trim().toLowerCase();
  const out = [];
  let inCard = false;
  for (const line of String(planText).split(/\r?\n/)) {
    const item = /^[-*]\s+([A-Za-z0-9][A-Za-z0-9._-]*):/.exec(line);
    if (item) inCard = item[1].toLowerCase() === want;
    else if (line.trim() !== '' && !/^[ \t]/.test(line)) inCard = false;
    const field = inCard && /^[ \t]+accepted:\s*(.*)$/i.exec(line);
    if (field) out.push(...field[1].split(',').map((p) => p.trim().replace(/\\/g, '/')).filter(Boolean));
  }
  return out;
}

/**
 * The experts G6 asks for when card `name` is being committed, or null when the card cannot narrow
 * the union of the cards that cover the changed files (the caller then keeps that union).
 *   - every changed file must be the card's own: under its paths or accepted for it;
 *   - a card of the plan gives its own `experts` field;
 *   - a card the run added gives that field plus the experts of every plan card covering the changed
 *     files, and is null when some file has no such card or such a card has no field;
 *   - an expert outside `valid` makes it null.
 * `covers(paths, file)` is the project's glob match.
 */
function narrowedExperts({ cards, name, changed, accepted, covers, valid }) {
  const card = cards.find((c) => c.name.toLowerCase() === String(name).toLowerCase());
  if (!card || card.experts === undefined) return null;
  if (!changed.every((f) => accepted.includes(f) || (card.paths.length > 0 && covers(card.paths, f)))) return null;
  const experts = new Set(expertsOf(card));
  if (RUN_ADDED.test(card.name)) {
    const planCards = cards.filter((c) => !RUN_ADDED.test(c.name));
    for (const f of changed) {
      const covering = planCards.filter((c) => c.paths.length > 0 && covers(c.paths, f));
      if (covering.length === 0 || covering.some((c) => c.experts === undefined)) return null;
      for (const c of covering) for (const n of expertsOf(c)) experts.add(n);
    }
  }
  if (![...experts].every(valid)) return null;
  return { experts: [...experts], cards: [card.name] };
}

const LAST_SUFFIX = 99;

/**
 * The first of `base`, `base-2`, ... `base-99` that `taken(name)` says is free. A `taken` that throws
 * (a git error) counts as taken, so a failure never hands out a name that may be in use.
 */
function freeName(base, taken) {
  for (let n = 1; n <= LAST_SUFFIX; n++) {
    const name = n === 1 ? base : `${base}-${n}`;
    let used = true;
    try {
      used = taken(name);
    } catch {
      // counts as taken
    }
    if (!used) return { ok: true, name };
  }
  return { ok: false, reason: `no free name: ${base} to ${base}-${LAST_SUFFIX} are all taken` };
}

const squash = (s) => String(s).replace(/\s+/g, ' ').trim();

/**
 * The card a repeated `card-add --free-name` call returns instead of adding a second one: in the name
 * family of `base` (`base`, `base-2`, ...), not committed, with the same title and the same carried
 * text. Text is compared as `addCard` writes it. `cards` come from `cards.parseCards`.
 */
function reusableCard(cards, base, title, carried) {
  const family = new RegExp(`^${String(base).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(-\\d+)?$`, 'i');
  const want = carried.map(squash).filter(Boolean).join(';');
  return cards.find((c) => family.test(c.name) && !c.committed && !/^committed\b/.test(c.status || '') && c.title === squash(title) && c.carried.join(';') === want) || null;
}

/**
 * A park reason for one plan line: on one line, no semicolon (it would end the field), at most
 * REASON_KEEP characters of the reason, cut at the last word end (a hard cut when there is no space,
 * never inside a surrogate pair), followed by `tail`, which says where the whole text is.
 */
const REASON_KEEP = 240;
function shortReason(reason, tail) {
  const flat = squash(reason).replace(/;/g, ',');
  if (flat.length <= REASON_KEEP) return `${flat} (${tail})`;
  const space = flat.lastIndexOf(' ', REASON_KEEP);
  let end = space > 0 ? space : REASON_KEEP;
  const last = flat.charCodeAt(end - 1);
  if (last >= 0xd800 && last <= 0xdbff) end -= 1;
  return `${flat.slice(0, end).trim()} ... (${tail})`;
}

/**
 * What a failed `git apply --3way` printed, read for the user: the files in conflict, or, when it
 * names none, its last lines (the first ones say which files applied cleanly). Git's wording is
 * read with LC_ALL=C.
 */
const CONFLICT_TAIL = 5;
function conflictOf(output) {
  const all = String(output || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const files = [];
  for (const l of all) {
    const m = /^Applied patch to '(.+)' with conflicts\.$/.exec(l) || /^error: patch failed: (.+):\d+$/.exec(l) || /^error: (.+): patch does not apply$/.exec(l) || /^U (.+)$/.exec(l);
    if (m && !files.includes(m[1])) files.push(m[1]);
  }
  if (files.length > 0) return { files, text: `conflict in ${files.join(', ')}` };
  return { files, text: all.slice(-CONFLICT_TAIL).join(' / ') || 'git apply printed nothing' };
}

/**
 * What each card cost, from the agents the Workflow output lists (`{ label, tokens, usage? }`). A
 * card's agents are those labelled `<card>:...` and, for its fix round, `<card>-fix:...` (the retry
 * labels start the same way); the name is matched whole, and a card that is itself named `x-fix`
 * keeps its own labels. `tokens` is input + cache write + output when the host gives the split, else
 * the one number it gives; `cacheRead` is null when no split was given. A card with no number at all
 * is left out, so the caller shows "unknown" and never 0.
 */
function cardTokens(cardNames, agents) {
  const names = new Set(cardNames);
  const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const out = {};
  for (const a of agents || []) {
    const prefix = String((a && a.label) || '').split(':')[0];
    const owner = names.has(prefix) ? prefix : prefix.endsWith('-fix') && names.has(prefix.slice(0, -4)) ? prefix.slice(0, -4) : null;
    if (!owner) continue;
    const u = a.usage && typeof a.usage === 'object' ? a.usage : null;
    const total = u ? num(u.input) + num(u.cacheWrite) + num(u.output) : typeof a.tokens === 'number' ? a.tokens : null;
    if (total === null) continue;
    const row = out[owner] || (out[owner] = { tokens: 0, cacheRead: null });
    row.tokens += total;
    if (u && typeof u.cacheRead === 'number') row.cacheRead = (row.cacheRead || 0) + u.cacheRead;
  }
  for (const k of Object.keys(out)) if (out[k].tokens === 0) delete out[k];
  return out;
}

module.exports = { RUN_ADDED, acceptedFiles, narrowedExperts, freeName, reusableCard, REASON_KEEP, shortReason, CONFLICT_TAIL, conflictOf, cardTokens };
