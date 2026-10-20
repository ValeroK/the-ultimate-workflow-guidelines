# What changed from the sources

Kept as ideas: see NOTICE.md in the folder above. Everything is restated.

Reversed or narrowed:
- Persona framing ("you are a senior ...") dropped.
- Sources that treat a principle or a framework name as a finding: removed as topics. A finding here needs a stated cost and a path.
- Advice that argues for structure, regions, replicas or layers without a workload reason: dropped. The system's own conventions come first.

Added by us (no source): the calibration to workload criticality; the rule to raise everything found while naming the domain it belongs to; the cap of four constraints at the plan stage; the "Do not report" lists.

Dropped: everything that runs a tool, fetches a page, or installs something.

## 2026-10-20: combined with upstream architect agents

Compared 19 upstream architect, SRE, FinOps and migration agents and skills (ECC, awesome-copilot, wshobson, buildwithclaude, awslabs aidlc, anthropics, agency-agents, Jeffallan, alirezarezvani; see NOTICE.md).

- Review, new categories: a synchronous call cycle between services; a remote call per item; a budget the parts cannot fit (timeout behind a shorter deadline, pool times instances above the database limit); a write to two places with no way back; two versions reading the same messages or records during a rolling deploy; moving existing data without a check; replay with side effects.
- Review, method: a claim is not evidence; resolve every named resource in the infrastructure files; mask quoted secrets.
- Plan, new questions: the numbers the design depends on (ask once, then state the assumption), the simplest design and why more is needed, blast radius, one owner per fact, consistency per read, how existing data moves, one-way doors, the reliability cost of a cost cut and the cost of a new data path; budget and team readiness as user questions.
- Boundaries with softarch: import cycles, module contracts and data owners stay the software architect's.
- Not taken: high availability or multi-region by default, microservice rules applied everywhere, a decision record for every choice, fixed latency or uptime numbers, diagrams as deliverables, dual writes as a migration pattern.
- Not measured: the architect corpus is saturated.
