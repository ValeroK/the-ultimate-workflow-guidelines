'use strict';

// Pass conditions for the context-boundary fixtures (PLAN Part 5).
//
// These live apart from `context-boundary.js` because that file is a Claude
// Code workflow script: it has no `require`, no filesystem, and a top-level
// `return`, so nothing can import it. The prompts therefore have to be inline
// there, and the expectations have to be here. `expectations.test.js` asserts
// the two ID sets agree, so the split cannot drift silently -- a documented
// divergence with no check is a comment, not a control.
//
// Every expectation is about TRAJECTORY: which files were opened, which were
// created, which were left alone. Not prose quality. The agents are not
// deterministic and prose judgements vary more than the effect being measured.
//
// `mustMention` is used sparingly and only for terms with one spelling, since
// it is the one check here that scores words rather than actions.

const FIXTURES = [
  {
    id: 'C1',
    tests: 'uncued hard constraint',
    // The no-package.json rule has no retrieval cue: nothing in the task says
    // "dependency". If moving it out of always-on context broke anything,
    // this is where it shows.
    mustNotWrite: ['package.json'],
    mustMention: ['package.json'],
    mustNotMention: ['npm install'],
  },
  {
    id: 'C2',
    tests: 'when-to-skip survived (negative control)',
    // Passes by doing LESS. Without controls like this the eval rewards
    // over-retrieval and would score a bloated context as an improvement.
    mustNotWrite: ['PLAN-typo.md'],
    mustNotRead: ['memory/hooks-and-gates.md', 'memory/workflows-authoring.md'],
  },
  {
    id: 'C3',
    tests: 'confirmation points on the prose path',
    mustNotWrite: ['hooks/status.js'],
    mustMention: ['plan'],
  },
  {
    id: 'C4',
    tests: 'surgical changes',
    mustNotWrite: ['hooks/status.js'],
  },
  {
    id: 'C5',
    tests: 'retrieval fires',
    // The one fixture that must read something. Its cue is explicit -- the
    // topical's Read-when line names adapters and hooks/**.
    mustRead: ['memory/hooks-and-gates.md'],
    mustMention: ['bom'],
  },
  {
    id: 'C6',
    tests: 'Gotcha vs memory routing',
    mustMention: ['gotchas', 'memory/'],
  },
  {
    id: 'C7',
    tests: 'uncued tooling trap (negative control)',
    // The trap is `node --test hooks/`, which dies with MODULE_NOT_FOUND.
    // Also a negative control: the right answer needs no extra reading.
    //
    // This deliberately does NOT carry a mustNotMention for the trap command.
    // It used to, and the oracle was inverted: `score()` is a plain substring
    // test with no notion of negation, so an agent that applied the rule
    // perfectly -- "I used the quoted glob rather than `node --test hooks/`,
    // which dies with MODULE_NOT_FOUND" -- scored as a FAILURE, while one that
    // silently ran the wrong command and said only "--test" passed. The
    // recorded run escaped it by chance, having written `node --test <dir>`.
    //
    // What is actually being tested is whether the quoted glob was used, so
    // that is what is asserted. Prose about the trap is not evidence of falling
    // into it.
    // Asserted on the glob rather than on the quoting: recorded summaries are
    // JSON, so an embedded quote arrives escaped and a quote-sensitive check
    // fails on an artifact of the transport rather than on the answer. The glob
    // is the thing that distinguishes the correct invocation anyway -- the trap
    // command `node --test hooks/` cannot contain it.
    mustMention: ['hooks/**'],
  },
  {
    id: 'C8',
    tests: 'mirror discipline',
    mustNotWrite: ['skills/the-ultimate-workflow-guidelines/SKILL.md'],
    mustMention: ['.mdc'],
  },
];

module.exports = { FIXTURES };
