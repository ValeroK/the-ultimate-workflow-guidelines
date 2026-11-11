'use strict';

// The link check for the entry and memory files (PLAN-memory-index, card links): relative markdown
// links and `@path` import lines in AGENTS.md, CLAUDE.md, memory.md and memory/**/*.md.
// brokenLinks is pure (texts and an exists callback); the rest wraps it with the file system.

const fs = require('node:fs');
const path = require('node:path');

const LINK = /\[[^\]]*\]\((<[^>]*>|[^)\s]*)(?:\s+"[^"]*")?\)/g;
const IMPORT = /^@(\S+)$/;
const FENCE = /^\s*(```|~~~)/;
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

// The file part of a link target, or null when the target is not a file to check.
function fileTarget(raw) {
  const target = raw.replace(/^<(.*)>$/, '$1');
  if (!target || target.startsWith('#') || target.startsWith('/') || target.includes('{') || SCHEME.test(target)) return null;
  const file = target.replace(/[?#].*$/, '');
  if (!file) return null;
  try {
    return decodeURIComponent(file);
  } catch {
    return file;
  }
}

/**
 * Broken links in { [path]: text } as [{ file, line, target }]. A target resolves from the folder of
 * the file that holds it; exists(path) is asked with a normalized path relative to the root.
 */
function brokenLinks(files, exists) {
  const broken = [];
  for (const [file, text] of Object.entries(files)) {
    let fence = null;
    text.split(/\r?\n/).forEach((line, i) => {
      const f = FENCE.exec(line);
      if (f) {
        fence = fence === null ? f[1] : fence === f[1] ? null : fence;
        return;
      }
      if (fence) return;
      const raws = [...line.matchAll(LINK)].map((m) => m[1]);
      const imp = IMPORT.exec(line.trim());
      if (imp) raws.push(imp[1]);
      for (const raw of raws) {
        const target = fileTarget(raw);
        if (target && !exists(path.posix.join(path.posix.dirname(file), target))) broken.push({ file, line: i + 1, target });
      }
    });
  }
  return broken;
}

// Every file under dir as a path relative to root with forward slashes, skipping .git and node_modules.
function listFiles(root, dir = '') {
  const out = [];
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(root, rel));
    else out.push(rel);
  }
  return out;
}

// The texts of the files in scope that exist under root, keyed by their path from root.
function scopeFiles(root, all = listFiles(root)) {
  const files = {};
  for (const f of all) {
    if (f === 'AGENTS.md' || f === 'CLAUDE.md' || f === 'memory.md' || (f.startsWith('memory/') && f.endsWith('.md'))) {
      files[f] = fs.readFileSync(path.join(root, f), 'utf8');
    }
  }
  return files;
}

// The broken links of a project as printable lines, one per link.
function projectLinkErrors(root, all = listFiles(root)) {
  return brokenLinks(scopeFiles(root, all), (p) => fs.existsSync(path.join(root, p))).map((b) => `${b.file}:${b.line}: broken link to ${b.target}`);
}

/** `links [--root <dir>]`: prints the broken links and returns the exit code. */
function cli(argv, cwd, write, fail) {
  const at = argv.indexOf('--root');
  const root = path.resolve(cwd, at >= 0 ? argv[at + 1] || fail('--root needs a folder') : '.');
  const errors = projectLinkErrors(root);
  for (const e of errors) write(`error: ${e}\n`);
  write(errors.length ? `links: ${errors.length} broken link(s)\n` : 'links: ok\n');
  return errors.length ? 1 : 0;
}

module.exports = { brokenLinks, listFiles, projectLinkErrors, cli };
