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

module.exports = { RUN_ADDED, acceptedFiles, narrowedExperts };
