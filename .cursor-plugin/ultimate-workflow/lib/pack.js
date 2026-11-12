'use strict';

// The size, budget and do-not-load logic of a card's context pack (PLAN-memory-index, card budget).
// Pure: entries in, text and numbers out. `pack` in experts/autopilot.js collects the entries (it
// reads the files) and calls assemble.
//
// An entry is { path, why, optional, role, chars, how, matches }. role is
//   required     read and counted: the plan's sections, the card's tests, the documents it names
//   conditional  AGENTS.md and CLAUDE.md: read only if not already in context, not counted
//   pointer      a cited document the card does not name: one line, not counted, never dropped
//   topical      a memory file: counted, the only kind dropped when over budget

const DEFAULT_BUDGET = 15000;
const ROLE_ORDER = ['conditional', 'required', 'topical', 'pointer'];

const tokensOf = (chars) => Math.ceil(chars / 4);

/** The budget from the plan's front matter value: { budget, warning } (warning when it is not a positive number). */
function budgetOf(value) {
  if (value === undefined || value === '') return { budget: DEFAULT_BUDGET };
  if (/^\d+$/.test(String(value).trim()) && Number(value) > 0) return { budget: Number(value) };
  return { budget: DEFAULT_BUDGET, warning: `pack_budget "${value}" is not a positive number: using ${DEFAULT_BUDGET}` };
}

/** A document the plan cites is required for the card when the plan has no per-card sections, or the card's section, tests or paths name it. */
function citedRole(doc, { perCard, namedByText, namedByPaths }) {
  return !perCard || namedByText.includes(doc) || namedByPaths ? 'required' : 'pointer';
}

// One entry per file: the reasons joined, the role that reads most strictly wins.
function merge(entries) {
  const byPath = new Map();
  for (const e of entries) {
    const had = byPath.get(e.path);
    if (!had) {
      byPath.set(e.path, { ...e, why: [e.why] });
      continue;
    }
    had.why.push(e.why);
    had.optional = had.optional && e.optional;
    if (ROLE_ORDER.indexOf(e.role) < ROLE_ORDER.indexOf(had.role)) Object.assign(had, { role: e.role, chars: e.chars });
    if (e.how && !had.how) Object.assign(had, { how: e.how, matches: e.matches });
  }
  return [...byPath.values()];
}

const countsToward = (e) => e.role === 'required' || e.role === 'topical';
const sizeOf = (list) => tokensOf(list.filter(countsToward).reduce((n, e) => n + e.chars, 0));

// Keyword and cue matches go before path matches; among path matches the fewest matches goes first.
const dropRank = (a, b) => (a.how === 'path') - (b.how === 'path') || (a.matches || 0) - (b.matches || 0) || (a.path < b.path ? -1 : 1);

/**
 * The pack text and its numbers. Over budget, topicals are dropped (and nothing else) until the
 * pack fits; if it still does not, overBudget is true and the pack stays as it is.
 */
function assemble({ title, intro, entries, mayChange, budget, warnings = [] }) {
  const merged = merge(entries);
  const dropped = [];
  let kept = merged;
  for (const e of merged.filter((x) => x.role === 'topical').sort(dropRank)) {
    if (sizeOf(kept) <= budget) break;
    dropped.push(e.path);
    kept = kept.filter((x) => x !== e);
  }
  const tokens = sizeOf(kept);
  const reason = (e) => [...e.why, ...(e.role === 'conditional' ? ['read only if not already in your context'] : []), ...(e.role === 'pointer' ? ['cited by the plan, read only if your work touches it'] : [])].join('; ');
  const body = [
    title,
    '',
    intro,
    '',
    ...kept.map((e) => `- ${e.path}${e.optional ? ' (if present)' : ''}: ${reason(e)}`),
    '',
    `Files this card may change: ${mayChange}`,
    '',
    `Pack size: about ${tokens} tokens (budget ${budget})${tokens > budget ? '; the required entries alone are over budget' : ''}`,
    ...(dropped.length ? ['', 'Not loaded (budget), read one only if your work needs it:', ...dropped.map((p) => `- ${p}: not loaded (budget)`)] : []),
    '',
    "Do not load: other cards' folders (except the handoffs listed above), memory topicals not listed above, the plan outside the listed line ranges, other PLAN-*.md files.",
    '',
  ].join('\n');
  return { body, tokens, budget, dropped, overBudget: tokens > budget, warnings };
}

module.exports = { DEFAULT_BUDGET, budgetOf, citedRole, assemble };
