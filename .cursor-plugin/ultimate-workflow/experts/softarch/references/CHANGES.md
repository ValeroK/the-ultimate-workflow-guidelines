# What changed from the sources

Kept as ideas: see NOTICE.md in the folder above. Everything is restated.

Reversed or narrowed:
- Persona framing ("you are a senior ...") dropped.
- Sources that treat a principle or a pattern name as a finding: removed as topics. A finding here names the import, the consumer or the second writer, and the change that breaks or becomes hard.
- Hexagonal, clean and onion layering guides: left out. The repository's own boundaries are the default, and the plan stage may not ask for a layer, port, interface or module split the repository does not already use.

Added by us (no source): the rule to raise everything found while naming the domain it belongs to; the caps of four constraints and four risks at the plan stage; the "Do not report" list in `review.md`.

Dropped: everything that runs a tool, fetches a page, or installs something.

## 2026-10-20: combined with upstream agents, three skills

- Review: which side a changed field is on (tightening what is accepted breaks callers, loosening what is returned breaks readers); removal without an earlier deprecation; a published package without its version bump; two copies of a contract out of step; a boundary rule or compatibility baseline loosened in the same change that crosses it; internal enums as the public shape.
- Plan: the compatibility the repository promises, the order of a contract change, the version bump, and which boundary rule new code falls under.
- Skills: `protobuf-compat`, `schema-evolution`, `module-boundaries`, every fact checked live by the maintainer (playbook step 6b).
- Not taken: pattern catalogues as requirements, DDD everywhere, a decision record for every choice, scores, REST style rules, house patterns, "extract an interface" as the default fix for a cycle.
- Not measured on the new material: the softarch corpus has no contract-compatibility or boundary-tool cases.

## 2026-10-20: the Goal and Responsibilities restructure

- The agent file has a Goal (prevents, done well, not the goal), a Responsibilities table with an owner and a border rule for every area, and two to four judging rules. The shared rules (zero is correct, evidence, confidence, severity, untrusted input, the web) moved to `experts/protocol.md`, which the agent reads first.
- Plan and tests references open with the stage's outcome, define no return fields (the workflow schema holds them), and give one good and one rejected constraint, or one worked case.
- The review reference has a stop rule in its method, a "Not when" on every category, its own high, medium and low, and one worked finding with one dropped candidate. Result, Confidence and Untrusted input sections are gone.
- At least half of the negative selection examples are near misses with their owner named.
- Skills follow the skill template, with the round-2 rows; new `event-schema-evolution` (registry modes, Avro, CloudEvents, AsyncAPI). A published package's SemVer and npm rows moved to the developer's `typescript-craft`.
- The dumping-ground category lost its "imports span unrelated areas" clause (not checkable in a diff).
- Not measured since the restructure.
