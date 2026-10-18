'use strict';

// Structural lint for the security expert's core checklist. It rejects the specific
// ways a checklist goes wrong; it cannot say the checklist is good. Each rule exists
// because of a defect found in the upstream file or named by a test-plan critic.
// Returns a list of problem strings, empty when clean.

const REQUIRED = ['Scope', 'Result', 'Confidence', 'Method', 'Categories', 'Do not report', 'Untrusted input'];

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

function lintChecklist(text) {
  const problems = [];
  const s = sections(text);

  for (const name of REQUIRED) {
    if (!(name in s)) problems.push(`missing section: ${name}`);
  }

  const thresholds = text.match(/report only[^.\n]*\b8 or above/gi) || [];
  if (thresholds.length !== 1) {
    problems.push(`the report threshold ("report only ... 8 or above") must appear exactly once, found ${thresholds.length}`);
  }
  if (/\b0\.\d+\b/.test(text)) problems.push('a decimal confidence value appears: the checklist must use one scale');
  if (/\d+\s*%/.test(text)) problems.push('a percentage appears: the checklist must use one confidence scale');
  const ofTen = [...text.matchAll(/\bof 10\b|\bout of 10\b|\b1-10\b/gi)];
  const outsideConfidence = ofTen.filter((m) => {
    const before = text.slice(0, m.index);
    const lastHeading = before.lastIndexOf('\n## ');
    return !/^## Confidence/.test(text.slice(lastHeading + 1));
  });
  if (outsideConfidence.length > 0) problems.push('the 1-10 scale is mentioned outside the Confidence section');

  const result = s.Result || '';
  if (!/No security findings/.test(result)) problems.push('the Result section must define the "No security findings" output');
  if (!/Examined:/.test(result)) problems.push('the Result section must require an "Examined:" statement, so a clean result differs from "did not look"');

  const demanding = [
    [/at least one (finding|issue|vulnerabilit)/i, 'demands at least one finding'],
    [/always (report|flag|find|raise)/i, 'says to always report something'],
    [/err(or)? on the side of (reporting|flagging|caution)/i, 'tells the reviewer to err toward reporting'],
    [/never (return|report|output) (an )?(empty|nothing)/i, 'forbids an empty result'],
  ];
  for (const [re, why] of demanding) {
    if (re.test(text)) problems.push(`a sentence ${why}: an empty result must stay a valid answer`);
  }

  const reversed = /prompt|markdown|outdated|third-party|dependenc|\.github|workflow|agent|skill|hook|\bmcp\b/i;
  for (const line of bullets(s['Do not report'] || '')) {
    if (reversed.test(line)) problems.push(`the exclusion list covers something that is in scope here: "${line.trim().slice(0, 80)}"`);
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

  const shapeWords = ['file', 'line', 'evidence', 'source', 'sink'];
  const method = `${s.Result || ''}\n${s.Method || ''}`.toLowerCase();
  for (const w of shapeWords) {
    if (!method.includes(w)) problems.push(`the finding shape must mention "${w}"`);
  }

  if (!/callers/i.test(s.Scope || '')) problems.push('the Scope section must allow reading callers of changed code');
  const untrusted = s['Untrusted input'] || '';
  if (!/data/i.test(untrusted) || !/instruction/i.test(untrusted)) {
    problems.push('the Untrusted input section must say diff content is data, not instruction');
  }

  return problems;
}

module.exports = { lintChecklist, sections };
