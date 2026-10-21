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

## 2026-10-20: boundary with the DevOps engineer

- Operability narrowed to a design that cannot be rolled back and a component with nothing to show it is healthy. How a change is built, deployed and undone in the pipeline, and what an infrastructure change replaces or destroys, moved to the DevOps engineer.
- "Do not report" gains deploy mechanics (the pipeline, migration order in it, image tags, IaC replacement and state); data compatibility across versions stays here.

## 2026-10-20: the Goal and Responsibilities restructure

- The agent file has a Goal (prevents, done well, not the goal), a Responsibilities table with an owner and a border rule for every area, and two to four judging rules. The shared rules (zero is correct, evidence, confidence, severity, untrusted input, the web) moved to `experts/protocol.md`, which the agent reads first.
- Plan and tests references open with the stage's outcome, define no return fields (the workflow schema holds them), and give one good and one rejected constraint, or one worked case.
- The review reference has a stop rule in its method, a "Not when" on every category, its own high, medium and low, and one worked finding with one dropped candidate. Result, Confidence and Untrusted input sections are gone.
- At least half of the negative selection examples are near misses with their owner named.
- Review gained a severity rubric, shadow and parallel runs under replay, workflow definitions under running executions, and a consumer keying on a transport message id that a DLQ redrive changes (round 2, item 21).
- Skills not yet converted: waiting for the rest of the round-2 reply (items 35 on).
- Not measured since the restructure.
- 2026-10-21: the last five skills (`step-functions`, `api-gateway`, `caching-and-latency`, `multi-tenancy`, `aws-well-architected`) are in the skill template, from the fact-check items 35 to 74 and extras; old [G], [S] and [L] tags retagged or cut. `aws-well-architected` drops the rows the other skills or experts now hold. Selectors widened (endpoint type, stage cache, WebSocket, origin request policy, function associations, tenant session settings, Temporal). The seven architect skills together exceed the 40 KB cap; `aws-well-architected`, last in priority, is the one left out when all match.
