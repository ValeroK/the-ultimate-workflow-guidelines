# Software architect expert: sources, what was combined, and its skills

The software architect (`softarch`) owns how code components relate inside one codebase: module boundaries, dependency direction, cycles, public contracts and their compatibility (function signatures, API descriptions, event and message schemas, protobuf, GraphQL, published packages), and which module owns which data. It joins at plan and review. Runtime topology and messages across services during a deploy are the architect's; craft inside a function is the developer's; infrastructure code is the DevOps engineer's.

This is the first expert built with the playbook's step 6b: the claims were sent to the maintainer, checked live, and only then written into the skills.

## 1. The upstream sources compared

Twenty were read on 2026-10-20 (licences in each skill's `NOTICE.md`). Most are pattern catalogues (hexagonal, clean, DDD, CQRS) or scaffolds; only one reviews a contract change the way a diff reviewer must.

| Source | What it was good for | Why not more |
|---|---|---|
| awesome-copilot `protobuf-grpc-api-review` and two references | The best source: read the compatibility target first, renames that break name-based encodings, reservations, guards against false positives | Protobuf only |
| agency-agents `api-platform-engineer` | A safe-against-breaking table by direction; Deprecation and Sunset headers | Persona |
| ECC `contract-first` | One authoritative artifact per boundary, generated types, no storage row as the contract | Prescribes a house workflow |
| mattpocock `setup-ts-deep-modules` | dependency-cruiser entry-point rules and "prove the rules bite", which became the loosened-rule check | In progress upstream |
| tech-leads-club `coupling-analysis`, `modular-design-principles` | Internal enums shared outward, reach-through persistence, leaky exports | Scores and balance numbers |
| wshobson `monorepo-management`, `monorepo-architect` | Phantom workspace dependencies, Nx tags | Catalogues |
| alirezarezvani `api-design-reviewer` | A breaking-change list, and the trap it shows: "making required fields optional" without saying which side | Script wrapper |
| anthropics `architecture-critic`, `type-design-analyzer` | Nothing new (we already had "a comment is not behaviour"); type invariants are the developer's | |
| addyosmani `api-and-interface-design` | Already credited: Hyrum's law, addition over modification | |

Not taken: pattern catalogues as requirements, absolute rules such as "no direct cross-module imports", DDD tactics everywhere, a decision record for every choice, scores and grades, REST style rules without a repository convention, house patterns, policy numbers (two live versions, six months' notice), and "extract an interface" as the default fix for a cycle.

## 2. What changed in the expert

- **Review:** a broken contract now says which side the changed field is on (tightening what is accepted breaks callers, loosening what is returned breaks readers), and includes a removal with no earlier deprecation and a published package without its version bump. Two new categories: two copies of a contract out of step (the schema against the committed generated client or types), and a boundary rule or compatibility baseline loosened in the same change that crosses it. A leaking boundary now names internal enums and published schemas.
- **Plan:** the compatibility the repository promises, the order of a contract change (contract, provider, consumers, removal last), the version bump, and which boundary rule new code falls under.

## 3. The skills

| Skill | What it holds | Review selector | Plan |
|---|---|---|---|
| `protobuf-compat` | Field numbers and names, reserved, Editions syntax, types across wire and ProtoJSON, oneofs, presence, enums, gRPC paths, AIP-180, Buf categories | `files: *.proto, buf.yaml, buf.gen.yaml, buf.lock` | offered |
| `schema-evolution` | OpenAPI and JSON Schema by direction, oasdiff's breaking list (defaults, response properties, widened constraints), 3.0 against 3.1, 64-bit integers in JSON, GraphQL nullability and removals, generated copies, deprecation headers | API description and GraphQL files; `added:` an `openapi:` line, a GraphQL `type Query {`, a JSON Schema `$schema` | offered |
| `event-schema-evolution` | Confluent and Glue registry modes, transitive checks, Avro defaults, aliases, enum defaults and promotions, CloudEvents `dataschema` and `type`, AsyncAPI 2.x and 3.x | `files: *.avsc, *.avdl, asyncapi.*`; `added:` registry modes and CloudEvents attributes | offered |
| `module-boundaries` | Go `internal`, `/vN` and `linkname`, Node `exports`, TypeScript resolution and `noEmitOnError`, pnpm workspace files and ranges, Nx constraints, dependency-cruiser severities, import-linter alerting and external packages, Java `exports` and `opens`, ArchUnit freezing | boundary tool configs, `tsconfig*.json`, `module-info.java`, `project.json`; `added:` `/internal/`, `"exports":`, tag constraints, ArchUnit rules | offered |

Each skill follows the skill template (Goal, First establish the target, rule tables, Not a finding). Each fact says where it comes from: **[R]** the maintainer's live check of the specification or tool documentation (2026-10-20, rounds 1 and 2, and prompt 3b), **[T]** a third-party source, unchecked (one GraphQL row), **[O]** our own reasoning. Round 2: `docs/research/softarch-round2-2026-10-20.md`.

**What the check changed.** Four claims came back narrower than drafted, and the skills say so: widening an integer type is safe on the binary wire but breaking in ProtoJSON, in generated code, under Buf `FILE` and under AIP-180; `string` to `bytes` is unsafe in ProtoJSON; AIP-180 and Buf `FILE` refuse any move into or out of a `oneof`, even a new one; and the Java split-package rule depends on how the layer maps modules to class loaders. import-linter has five contract types, not three. Ten extra facts were added, among them the reserved field range 19,000 to 19,999, Edition 2024's naming style, OpenAPI 3.1's numeric `exclusiveMinimum`, and SemVer's minor bump for a deprecation. Record: `docs/research/softarch-2026-10-20.md`.

**Version axes.** Before reporting, the reviewer reads which version is in play: proto2, proto3 or an edition; OpenAPI 3.0 or 3.1; TypeScript's `moduleResolution`; the GraphQL specification year; the repository's Buf category.

**Version rules moved.** A published package's SemVer and npm ranges are the developer's (`typescript-craft`), since its consumers are outside the repository; pnpm `workspace:` rules are in `module-boundaries`.

## Routed to other experts

| Expert | Items |
|---|---|
| Architect | Order of readers and writers during a deploy, rollback and replay, gRPC deadlines and retry codes, streaming limits, idempotency, service boundaries, GraphQL federation |
| DevOps | Terraform module variables and outputs, CI for affected packages, release tooling for `workspace:` |
| Quality | A consumer regression ledger, contract tests (Pact), whether a schema-diff gate can fail |
| Developer | Type invariants inside a module, shallow modules (`simplification`), branded ids (`typescript-craft`) |
| Security | Per-method authorization, exposed reflection and debug endpoints, remote `$ref` resolution |

## Not measured

The softarch corpus showed weak evidence for the first version and has no contract-compatibility or boundary-tool cases. Proposed first cases: a removed proto field with no `reserved`; an `int64` to `int32` change on a service with JSON clients; a response property made nullable in OpenAPI; a GraphQL argument made non-null with no default; a new import across Nx projects in the same diff as an `allow` entry for it.
