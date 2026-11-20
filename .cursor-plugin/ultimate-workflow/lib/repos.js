'use strict';

// One plan for several repositories (5.2.0).
//
// The plan lives in the main repository. Its header names the others:
//
//     repos: demo=../project-status-demo, api=../api
//
// and a card path in another repository carries its name: `demo:src/lib/**`. A path with no prefix is in the main
// repository. A file of another repository is named the same way everywhere (`demo:src/lib/a.js`), so the rules that
// compare a card's paths with the files it changed (experts/cards.js `covers`) work on these names as they are.
//
// Each repository can have its own commands in the header: `test_command@demo`, `test_related_command@demo`.
//
// This file reads the header, checks the places, and runs one function for each repository. It requires no other file
// of the plugin except experts/cards.js (the one reading of a path's prefix) and hooks/lib/state.js (the front matter).

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { splitPath, NAME } = require('../experts/cards.js');

const fwd = (p) => String(p).replace(/\\/g, '/');

/** The header's `repos:` line: `{ list: [{ name, place }], problems }`. No line is no repository. */
function declared(planText) {
  const data = require('../hooks/lib/state.js').parseFrontMatter(planText).data || {};
  const raw = data.repos === undefined || data.repos === null ? '' : String(data.repos).trim();
  const list = [];
  const problems = [];
  if (!raw || raw === '[]') return { list, problems };
  for (const entry of raw.replace(/^\[|\]$/g, '').split(',').map((s) => s.trim()).filter(Boolean)) {
    const at = entry.indexOf('=');
    const name = (at === -1 ? entry : entry.slice(0, at)).trim();
    const place = at === -1 ? '' : entry.slice(at + 1).trim().replace(/^["']|["']$/g, '');
    if (!NAME.test(name)) problems.push(`repos entry "${entry}": the name must be letters, digits, dot, dash or underscore`);
    else if (!place) problems.push(`repos entry "${entry}": it has no place (write ${name}=<folder>)`);
    else if (list.some((r) => r.name.toLowerCase() === name.toLowerCase())) problems.push(`repos entry "${entry}": the name ${name} is given two times`);
    else list.push({ name, place });
  }
  return { list, problems };
}

const real = (p) => {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
};
const same = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b);
const inside = (child, parent) => {
  const r = path.relative(parent, child);
  return r !== '' && !r.startsWith('..') && !path.isAbsolute(r);
};

/**
 * The repositories of a plan, the main one first: `{ repos: [{ name, dir, place }], problems }`. `cwd` is the main
 * repository (the folder of the plan). A place must exist, be the top of a git repository, and not be the main
 * repository, inside it, around it, or inside another declared one.
 */
function resolve(cwd, planText) {
  const { list, problems } = declared(planText);
  const main = { name: '', dir: real(cwd), place: '.' };
  const repos = [main];
  for (const r of list) {
    const dir = real(path.resolve(cwd, r.place));
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      problems.push(`repository ${r.name}: the folder ${fwd(r.place)} does not exist`);
      continue;
    }
    const top = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: dir, encoding: 'utf8' });
    if (top.status !== 0 || !same(real(top.stdout.trim()), dir)) {
      problems.push(`repository ${r.name}: ${fwd(r.place)} is not the top folder of a git repository`);
      continue;
    }
    const clash = repos.find((o) => same(o.dir, dir) || inside(dir, o.dir) || inside(o.dir, dir));
    if (clash) {
      problems.push(`repository ${r.name}: ${fwd(r.place)} is the same folder as ${clash.name || 'the main repository'}, or one is inside the other`);
      continue;
    }
    repos.push({ name: r.name, dir, place: r.place });
  }
  return { repos, problems };
}

/** The names of the repositories a card's paths are in: '' is the main one. */
function ofCard(card) {
  const out = [];
  for (const p of (card && card.paths) || []) {
    const { repo } = splitPath(p);
    if (!out.includes(repo)) out.push(repo);
  }
  return out;
}

/** The names the cards use, the main one first when a card uses it. */
function usedBy(cards) {
  const out = [];
  for (const c of cards || []) for (const r of ofCard(c)) if (!out.includes(r)) out.push(r);
  return out.sort((a, b) => (a === '' ? -1 : b === '' ? 1 : 0));
}

/** The folder of a file named with or without a prefix, or null when the plan does not declare its repository. */
function fileOf(repos, named) {
  const { repo, path: p } = splitPath(named);
  const r = repos.find((x) => x.name === repo);
  return r ? path.join(r.dir, p) : null;
}

/** A header key for one repository: `test_command` for the main one, `test_command@demo` for another. */
const keyFor = (key, repo) => (repo ? `${key}@${repo}` : key);

module.exports = { declared, resolve, ofCard, usedBy, fileOf, keyFor, splitPath };
