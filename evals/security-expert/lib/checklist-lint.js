'use strict';

// Structural lint for the security expert's core checklist. It rejects the specific
// ways a checklist goes wrong; it cannot say the checklist is good. Each rule exists
// because of a defect found in the upstream file or named by a test-plan critic.
// Returns a list of problem strings, empty when clean.

// The rules every expert shares (the result form, the confidence scale, untrusted input) live
// once, in experts/protocol.md. A review reference holds only what is specific to its domain,
// and restating a protocol rule is refused, because two copies drift.
const REQUIRED = ['Scope', 'Method', 'Categories', 'Severity here', 'Do not report'];
const PROTOCOL_SECTIONS = ['Result', 'Confidence', 'Untrusted input'];

function sections(text) {
  const out = {};
  const parts = text.split(/^## /m);
  for (const part of parts.slice(1)) {
    const nl = part.indexOf('\n');
    const title = (nl === -1 ? part : part.slice(0, nl)).trim();
    out[title] = nl === -1 ? '' : part.slice(nl + 1);
  }
  return out;
}

function bullets(body) {
  return body.split(/\r?\n/).filter((l) => /^\s*(?:[-*]|\d+\.)\s+\S/.test(l));
}

// What an expert must NOT exclude, and what its Scope and Method must say, depend on the domain,
// so they come from a profile. The security profile is the default.
const SECURITY_PROFILE = {
  exclusionTerms: /prompt|markdown|outdated|third-party|dependenc|\.github|workflow|agent|skill|hook|\bmcp\b/i,
  scopeMustMention: ['callers'],
  // Every security finding is a path from something untrusted to a harmful place.
  shapeWords: ['source', 'sink'],
};
// A domain whose findings are not source-to-sink paths (craft, architecture) has no extra shape
// words: the evidence standard is the protocol's.
const GENERIC_PROFILE = { exclusionTerms: null, scopeMustMention: [], shapeWords: [] };

function lintChecklist(text, profile = SECURITY_PROFILE) {
  const problems = [];
  const s = sections(text);

  for (const name of REQUIRED) {
    if (!(name in s)) problems.push(`missing section: ${name}`);
  }
  if (!Object.keys(s).some((t) => /^One finding/.test(t))) problems.push('missing section: One finding, and one candidate dropped');
  for (const name of PROTOCOL_SECTIONS) {
    if (name in s) problems.push(`section "${name}" restates experts/protocol.md; remove it, the protocol is its one home`);
  }
  if (/\b8 or above\b/i.test(text)) problems.push('the report threshold is the protocol\'s; do not restate it');
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (/confiden|\bsure\b|certain|cutoff|threshold/i.test(sentence) && (/\b0\.\d+\b/.test(sentence) || /\d+\s*%/.test(sentence))) {
      problems.push(`a second confidence scale appears ("${sentence.trim().slice(0, 60)}"): the protocol has the only one`);
    }
  }

  const demanding = [
    [/at least one (finding|issue|vulnerabilit)/i, 'demands at least one finding'],
    [/always (report|flag|find|raise)/i, 'says to always report something'],
    [/err(or)? on the side of (reporting|flagging|caution)/i, 'tells the reviewer to err toward reporting'],
    [/never (return|report|output) (an )?(empty|nothing)/i, 'forbids an empty result'],
  ];
  for (const [re, why] of demanding) {
    if (re.test(text)) problems.push(`a sentence ${why}: an empty result must stay a valid answer`);
  }

  if (profile.exclusionTerms) {
    for (const line of bullets(s['Do not report'] || '')) {
      if (profile.exclusionTerms.test(line)) problems.push(`the exclusion list covers something that is in scope here: "${line.trim().slice(0, 80)}"`);
    }
  }

  if (/^!/m.test(text) || text.includes('!`')) problems.push('inline shell injection (! lines) is not allowed');

  let prev = 0;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^(\d+)\.\s/);
    if (m) {
      const n = Number(m[1]);
      if (n !== prev + 1 && n !== 1) problems.push(`list numbering jumps or repeats at "${line.trim().slice(0, 40)}"`);
      prev = n;
    } else if (line.trim() !== '' && !/^\s+\S/.test(line)) {
      prev = 0;
    }
  }

  if (!/\bstop\b/i.test(s.Method || '')) problems.push('the Method must say when to stop: a path that cannot be completed is a suspicion');
  for (const w of profile.shapeWords || []) {
    if (!(s.Method || '').toLowerCase().includes(w)) problems.push(`the Method must mention "${w}"`);
  }
  for (const word of profile.scopeMustMention) {
    if (!new RegExp(word, 'i').test(s.Scope || '')) problems.push(`the Scope section must mention ${word}`);
  }
  for (const line of (s.Categories || '').split(/\r?\n/).filter((l) => /^- \*\*/.test(l))) {
    if (!/\bnot when\b/i.test(line)) problems.push(`a category has no counter-case on its line ("Not when ..."): "${line.slice(0, 60)}"`);
  }
  const sev = s['Severity here'] || '';
  for (const level of ['high', 'medium', 'low']) if (!new RegExp(`\\b${level}\\b`, 'i').test(sev)) problems.push(`the Severity here section must define ${level}`);

  return problems;
}

module.exports = { lintChecklist, sections, SECURITY_PROFILE, GENERIC_PROFILE };
