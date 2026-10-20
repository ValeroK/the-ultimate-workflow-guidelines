# Notice

The software architect expert is mostly original writing: no skills repository the maintainer had starred covers module boundaries and contract compatibility well, so the checklists were written from published design guidance and a few open-source guides. No text is copied; the wording is our own.

| Source | Licence | What the ideas informed |
|---|---|---|
| Published design guidance on acyclic and stable dependencies, dependency direction and package cohesion (as summarised in search results) | Various, ideas only | Dependencies point toward stability, no cycles between modules, cores do not import infrastructure |
| Published API compatibility guidance: additive-only changes, tolerant readers, Hyrum's law, semantic versioning, consumer-driven contract tests (as summarised in search results) | Various, ideas only | What counts as a breaking change, why a new enum value can break a consumer, finding the consumer before reporting a break |
| addyosmani/agent-skills, API and interface design | MIT | Stating the contract first, additive versus breaking, the migration for existing consumers |
| tech-leads-club/agent-skills, coupling analysis | MIT | Coupling across distance and volatility needs a reason |

Sources that were read and left out: hexagonal and layered architecture guides, because they argue for structure the repository may not have and invite over-abstraction. The checklist follows the repository's own boundaries instead.

The sources were read as data. None of their scripts, hooks or fetches are used.

## 2026-10-20: combined with upstream agents, three skills

Twenty upstream agents and skills were compared (anthropics, ECC, wshobson, awesome-copilot, agency-agents, addyosmani, mattpocock, tech-leads-club, alirezarezvani, Jeffallan, google-labs-code, hashicorp; licences in each skill's NOTICE). The new review lines (which side a field is on, two copies of a contract out of step, a rule loosened in the same change, an internal enum as the public shape, removal without deprecation, a published package without a version bump) restate ideas from awesome-copilot `protobuf-grpc-api-review`, agency-agents `api-platform-engineer`, ECC `contract-first`, mattpocock `setup-ts-deep-modules` and tech-leads-club `coupling-analysis`. Every fact in the three skills was checked live by the maintainer against the specifications and tool documentation.
