'use strict';

// Cards in a plan (PLAN-run-records.md, W5).
//
// A plan split into cards lists them in a `## Cards` section, one bullet per card:
//
//   - 8a: Command Deck routes
//     paths: dashboard/src/app/skills/**, README.md
//     carried: an item left over from the card before; another
//     experts: [frontend, quality]
//     depends: 8
//     parked: uw/parked/re-wash/8a; verification failed 3 times
//     committed: 1a2b3c4
//     status: committed 1a2b3c4
//
// The name is matched whole, so `8` is not `8a`. `paths` are globs relative to the project root and
// bound what the card may change; `carried` lists work handed over from an earlier card; `depends`
// names the cards that must be committed first (4.7.0, the autopilot run). `parked` and `committed`
// are the run's state, written by `experts.js park` and `experts.js card-commit`, never by hand; so is
// `status`, every transition of the card (see STATUS below). A command
// writes the entry (`experts.js card-add`), `brief --card` reads it, and `scope` compares the files
// git says changed with `paths`. Nothing here reads a file or runs git: the caller passes text in.

const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const ITEM = /^[-*]\s+([A-Za-z0-9][A-Za-z0-9._-]*):(?:\s+(.*))?$/;
const FIELD = /^[ \t]+(paths|carried|experts|depends|parked|committed|status):\s*(.*)$/i;
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;

const lines = (text) => String(text || '').split(/\r?\n/);
const eolOf = (text) => (String(text).includes('\r\n') ? '\r\n' : '\n');
const split = (value, sep) => value.split(sep).map((s) => s.trim()).filter(Boolean);
// `experts: [a, b]` or `experts: a, b`; `[]` (or nothing after the colon) is the empty list, a decision
// of its own and not the same as no field at all.
const expertList = (value) => split(value.replace(/^\[|\]$/g, ''), ',');

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
      const key = field[1].toLowerCase();
      if (key === 'paths') cur.paths.push(...split(field[2], ','));
      else if (key === 'experts') cur.experts = expertList(field[2]);
      else if (key === 'depends') cur.depends = [...(cur.depends || []), ...split(field[2], ',')];
      else if (key === 'parked') {
        const at = field[2].indexOf(';');
        cur.parked = { branch: (at === -1 ? field[2] : field[2].slice(0, at)).trim(), reason: at === -1 ? '' : field[2].slice(at + 1).trim() };
      } else if (key === 'committed') cur.committed = field[2].trim();
      else if (key === 'status') cur.status = field[2].trim();
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
function addCard(planText, { name, title, paths = [], carried = [], experts = null, depends = [] }) {
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
  if (Array.isArray(experts)) item.push(`  experts: [${experts.join(', ')}]`);
  const d = depends.map((x) => String(x).trim()).filter(Boolean);
  const badDep = d.find((x) => !NAME.test(x) || x.toLowerCase() === String(name).toLowerCase());
  if (badDep) throw new Error(`card ${name} cannot depend on "${badDep}": a dependency is another card's name`);
  if (d.length) item.push(`  depends: ${d.join(', ')}`);

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
 * The plan text with one field of one card set (or removed, with `value` null), in the plan's own
 * line endings. `carried` appends to what is there; every other field is replaced. The run writes
 * `parked` and `committed` this way, so the Cards section stays the state a resumed run reads.
 * Throws, changing nothing, when there is no such card.
 */
const SETTABLE = ['parked', 'committed', 'carried', 'depends', 'status'];

/**
 * A card's `status:` line, the run's state as the plan shows it. Written by code on every transition
 * (`card-status`, `card-commit`, `park`, `unpark`, `run-start`), never by an agent:
 *   pending | running | running (resumed) | resumed | committed <sha> | fixed-in-round <sha>
 *   | parked <branch>; <reason> | blocked by <card>
 * A run that dies inside a card leaves it at `running`, which `run-start --resume` reports.
 */
const STATUS = /^(pending|running(?: \(resumed\))?|resumed|committed(?: [0-9a-f]{7,40})?|fixed-in-round(?: [0-9a-f]{7,40})?|parked \S+(?:; .*)?|blocked by [A-Za-z0-9][A-Za-z0-9._-]*)$/;
function checkStatus(value) {
  const v = String(value || '').replace(/\s+/g, ' ').trim();
  if (!STATUS.test(v)) throw new Error(`card status "${v}" is not one of: pending, running, running (resumed), resumed, committed <sha>, fixed-in-round <sha>, parked <branch>; <reason>, blocked by <card>`);
  return v;
}
/** The status's first word, for counting: `parked`, `committed`, `blocked`, ... */
const statusKind = (value) => String(value || '').trim().split(/[ ;]/)[0] || 'none';
function setField(planText, name, key, value) {
  if (!SETTABLE.includes(key)) throw new Error(`a card field set by the run is one of ${SETTABLE.join(', ')}, not "${key}"`);
  const all = lines(planText);
  const range = cardsRange(all);
  const want = String(name).trim().toLowerCase();
  let at = -1;
  if (range) {
    for (let i = range.start; i < range.end; i++) {
      const m = ITEM.exec(all[i]);
      if (m && m[1].toLowerCase() === want) {
        at = i;
        break;
      }
    }
  }
  if (at === -1) throw new Error(`no card "${name}" in the plan's Cards section`);
  let end = at + 1;
  while (end < range.end && (FIELD.test(all[end]) || (/^[ \t]/.test(all[end]) && all[end].trim() !== ''))) end++;
  const clean = value === null || value === undefined ? null : String(value).replace(/\s+/g, ' ').trim();
  const idx = [];
  for (let i = at + 1; i < end; i++) {
    const f = FIELD.exec(all[i]);
    if (f && f[1].toLowerCase() === key) idx.push(i);
  }
  if (key === 'carried' && clean !== null) {
    const prev = idx.length ? FIELD.exec(all[idx[0]])[2].trim() : '';
    const next = [...split(prev, ';'), ...split(clean, ';')].filter((x, i, xs) => xs.indexOf(x) === i);
    if (idx.length) all.splice(idx[0], idx.length, `  carried: ${next.join('; ')}`);
    else all.splice(end, 0, `  carried: ${next.join('; ')}`);
  } else if (clean === null || clean === '') {
    for (const i of idx.reverse()) all.splice(i, 1);
  } else if (idx.length) {
    all.splice(idx[0], idx.length, `  ${key}: ${clean}`);
  } else {
    all.splice(end, 0, `  ${key}: ${clean}`);
  }
  return all.join(eolOf(planText));
}

/**
 * The changed files that no path of the card covers. `makeRegExp` is the project's glob matcher
 * (`*` within a segment, `**/` across folders); a path ending in `/**` or `/` covers everything
 * below it.
 */
function covers(paths, file, makeRegExp) {
  return paths.map(cleanPath).some((g) => {
    if (g.endsWith('/**')) {
      const dir = g.slice(0, -3);
      return file === dir || file.startsWith(`${dir}/`);
    }
    if (g.endsWith('/')) return file.startsWith(g);
    return makeRegExp(g).test(file);
  });
}

function outOfScope(files, paths, makeRegExp) {
  return files.map(cleanPath).filter((f) => !covers(paths, f, makeRegExp));
}

module.exports = { parseCards, findCard, cardText, headingCardText, addCard, setField, outOfScope, covers, cleanPath, checkStatus, statusKind, NAME };
