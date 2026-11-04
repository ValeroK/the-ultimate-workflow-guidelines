'use strict';

// Cards in a plan (PLAN-run-records.md, W5).
//
// A plan split into cards lists them in a `## Cards` section, one bullet per card:
//
//   - 8a: Command Deck routes
//     paths: dashboard/src/app/skills/**, README.md
//     carried: an item left over from the card before; another
//
// The name is matched whole, so `8` is not `8a`. `paths` are globs relative to the project root and
// bound what the card may change; `carried` lists work handed over from an earlier card. A command
// writes the entry (`experts.js card-add`), `brief --card` reads it, and `scope` compares the files
// git says changed with `paths`. Nothing here reads a file or runs git: the caller passes text in.

const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const ITEM = /^[-*]\s+([A-Za-z0-9][A-Za-z0-9._-]*):(?:\s+(.*))?$/;
const FIELD = /^[ \t]+(paths|carried):\s*(.*)$/i;
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;

const lines = (text) => String(text || '').split(/\r?\n/);
const eolOf = (text) => (String(text).includes('\r\n') ? '\r\n' : '\n');
const split = (value, sep) => value.split(sep).map((s) => s.trim()).filter(Boolean);

/** The first `## Cards` heading's line range: [first line after it, line after the last of its content). */
function cardsRange(all) {
  const at = all.findIndex((l) => {
    const m = HEADING.exec(l);
    return m && m[2].toLowerCase() === 'cards';
  });
  if (at === -1) return null;
  const level = HEADING.exec(all[at])[1].length;
  let end = all.length;
  for (let i = at + 1; i < all.length; i++) {
    const m = HEADING.exec(all[i]);
    if (m && m[1].length <= level) {
      end = i;
      break;
    }
  }
  return { heading: at, start: at + 1, end };
}

/** Every card in the plan's Cards section, in order. No section, no cards. */
function parseCards(planText) {
  const all = lines(planText);
  const range = cardsRange(all);
  if (!range) return [];
  const out = [];
  let cur = null;
  for (let i = range.start; i < range.end; i++) {
    const line = all[i];
    const item = ITEM.exec(line);
    if (item) {
      cur = { name: item[1], title: (item[2] || '').trim(), paths: [], carried: [] };
      out.push(cur);
      continue;
    }
    if (!cur) continue;
    const field = FIELD.exec(line);
    if (field) {
      if (field[1].toLowerCase() === 'paths') cur.paths.push(...split(field[2], ','));
      else cur.carried.push(...split(field[2], ';'));
      continue;
    }
    if (line.trim() !== '' && !/^[ \t]/.test(line)) cur = null;
  }
  return out;
}

/** The card with this whole name (case does not matter), or null. */
function findCard(planText, name) {
  const want = String(name).trim().toLowerCase();
  return parseCards(planText).find((c) => c.name.toLowerCase() === want) || null;
}

/** What a card gives the briefs and the skill selection: its title, its paths and what it carries. */
function cardText(card) {
  return [
    `Card ${card.name}: ${card.title}`,
    card.paths.length ? `Files: ${card.paths.join(', ')}` : '',
    ...card.carried.map((c) => `Carried: ${c}`),
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * A plan with no Cards section but a "Card 8a" heading, as plans were written before: the text under
 * the heading whose name is exactly the card's. `8` does not pick up `Card 8a`.
 */
function headingCardText(planText, name) {
  const all = lines(planText);
  const escaped = String(name).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const want = new RegExp(`^card\\s+${escaped}(?![A-Za-z0-9])`, 'i');
  const at = all.findIndex((l) => {
    const m = HEADING.exec(l);
    return m && want.test(m[2]);
  });
  if (at === -1) return null;
  const level = HEADING.exec(all[at])[1].length;
  let end = all.length;
  for (let i = at + 1; i < all.length; i++) {
    const m = HEADING.exec(all[i]);
    if (m && m[1].length <= level) {
      end = i;
      break;
    }
  }
  return all.slice(at, end).join('\n');
}

const cleanPath = (p) => String(p).trim().replace(/\\/g, '/').replace(/^\.\//, '');

/**
 * The plan text with one more card, in the plan's own line endings. Creates the Cards section at the
 * end when there is none. Throws, changing nothing, on a bad name, no paths, a path outside the
 * project, or a name already taken.
 */
function addCard(planText, { name, title, paths = [], carried = [] }) {
  if (!NAME.test(String(name || ''))) throw new Error(`card name "${name}" must be letters, digits, dot, dash or underscore, with no spaces or colon`);
  const t = String(title || '').replace(/\s+/g, ' ').trim();
  if (!t) throw new Error('a card needs a --title');
  const ps = paths.map(cleanPath).filter(Boolean);
  if (ps.length === 0) throw new Error(`card ${name} needs --paths: the globs it may change, relative to the project root`);
  const bad = ps.find((p) => p.startsWith('/') || /^[A-Za-z]:/.test(p) || p.split('/').includes('..'));
  if (bad) throw new Error(`path "${bad}" must be relative to the project root and stay inside it`);
  if (findCard(planText, name)) throw new Error(`card ${name} is already in the plan`);

  const eol = eolOf(planText);
  const item = [`- ${name}: ${t}`, `  paths: ${ps.join(', ')}`];
  const c = carried.map((x) => String(x).replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (c.length) item.push(`  carried: ${c.join('; ')}`);

  const all = lines(planText);
  const range = cardsRange(all);
  if (!range) {
    const body = String(planText).replace(/(\r?\n)*$/, '');
    return `${body}${eol}${eol}## Cards${eol}${eol}${item.join(eol)}${eol}`;
  }
  let at = range.end;
  while (at > range.start && all[at - 1].trim() === '') at--;
  if (at === range.start) all.splice(at, 0, '', ...item);
  else all.splice(at, 0, ...item);
  return all.join(eol);
}

/**
 * The changed files that no path of the card covers. `makeRegExp` is the project's glob matcher
 * (`*` within a segment, `**/` across folders); a path ending in `/**` or `/` covers everything
 * below it.
 */
function outOfScope(files, paths, makeRegExp) {
  const globs = paths.map(cleanPath);
  const covers = (file) =>
    globs.some((g) => {
      if (g.endsWith('/**')) {
        const dir = g.slice(0, -3);
        return file === dir || file.startsWith(`${dir}/`);
      }
      if (g.endsWith('/')) return file.startsWith(g);
      return makeRegExp(g).test(file);
    });
  return files.map(cleanPath).filter((f) => !covers(f));
}

module.exports = { parseCards, findCard, cardText, headingCardText, addCard, outOfScope, NAME };
