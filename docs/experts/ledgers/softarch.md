# Extraction ledger: softarch

Audited 2026-10-20. Sources: 41 read, 1 unreachable, 3 with no file to audit. Items: 356 (159 taken, 79 routed, 96 rejected, 22 missing). Today's rows: 78 keep, 25 cut, 7 merge. A further 3 vendor-documentation sets were audited through the maintainer's fact-check record (`docs/research/softarch-2026-10-20.md`), not re-fetched.

Scope: the expert's `NOTICE.md` and `CHANGES.md`, the NOTICE of `protobuf-compat`, `schema-evolution` and `module-boundaries`, `docs/experts/softarch.md`, the research record, and every upstream file saved in the scratchpad folder `upstream-softarch/raw/` (fetched at HEAD on 2026-10-20). The expert NOTICE says "twenty upstream agents and skills were compared"; the saved folder holds 41 files, all listed below. Seven of them were skimmed by keyword in the earlier session and again here (marked "skimmed"). Nothing was run; every file was read as data.

Prompt 3b (pending) will add `event-schema-evolution` (Avro, schema registries, CloudEvents, AsyncAPI). Items that belong there are routed to it by name, not proposed here.

## 1. Sources

| Source (repo, path) | Cited by | Read from | Items found | Taken | Routed | Rejected | Missing |
|---|---|---|---|---|---|---|---|
| Protobuf documentation set: protobuf.dev guides, field_presence.md, buf.build breaking rules, aip.dev/180, grpc `doc/PROTOCOL-HTTP2.md` | `protobuf-compat` NOTICE | maintainer's record 2026-10-20 | 22 | 20 | 0 | 1 | 1 |
| Schema documentation set: OpenAPI 3.0.3/3.1.0, json-schema.org, GraphQL spec Oct 2021, oasdiff, semver.org, node-semver, pnpm, RFC 8594, RFC 9745 | `schema-evolution` NOTICE | maintainer's record 2026-10-20 | 18 | 18 | 0 | 0 | 0 |
| Boundary documentation set: go.dev, nodejs.org, typescriptlang.org, JLS ch. 7, import-linter, dependency-cruiser, nx.dev, archunit.org, pnpm | `module-boundaries` NOTICE | maintainer's record 2026-10-20 | 18 | 18 | 0 | 0 | 0 |
| graphql-inspector rule reference (the-guild.dev) | `schema-evolution` NOTICE | unreachable (record: "not reached") | - | - | - | - | - |
| "A secondary summary of graphql-inspector's rules" | `schema-evolution` NOTICE | no file to audit (no file or URL named) | - | - | - | - | - |
| Published design guidance on dependency direction (search results) | expert NOTICE | no file to audit | - | - | - | - | - |
| Published API compatibility guidance (search results) | expert NOTICE | no file to audit | - | - | - | - | - |
| github/awesome-copilot `skills/protobuf-grpc-api-review/SKILL.md` | expert NOTICE (dated), `protobuf-compat` NOTICE | saved copy | 31 | 13 | 9 | 5 | 4 |
| github/awesome-copilot `skills/protobuf-grpc-api-review/references/protobuf-compatibility.md` | `protobuf-compat` NOTICE | saved copy | 26 | 10 | 2 | 7 | 7 |
| github/awesome-copilot `skills/protobuf-grpc-api-review/references/grpc-contract-review.md` | `protobuf-compat` NOTICE | saved copy | 18 | 5 | 10 | 1 | 2 |
| msitarzewski/agency-agents `engineering/engineering-api-platform-engineer.md` | expert NOTICE (dated), `schema-evolution` NOTICE | saved copy | 19 | 7 | 3 | 8 | 1 |
| affaan-m/ECC `skills/contract-first/SKILL.md` | expert NOTICE (dated), `schema-evolution` NOTICE | saved copy | 20 | 11 | 5 | 3 | 1 |
| addyosmani/agent-skills `skills/api-and-interface-design/SKILL.md` | expert NOTICE, `schema-evolution` NOTICE | saved copy | 15 | 3 | 5 | 7 | 0 |
| alirezarezvani/claude-skills `engineering/skills/api-design-reviewer/SKILL.md` | `schema-evolution` NOTICE | saved copy | 12 | 5 | 1 | 5 | 1 |
| mattpocock/skills `skills/in-progress/setup-ts-deep-modules/SKILL.md` | expert NOTICE (dated), `module-boundaries` NOTICE | saved copy | 11 | 3 | 1 | 7 | 0 |
| wshobson/agents `plugins/developer-essentials/skills/monorepo-management/SKILL.md` | `module-boundaries` NOTICE | saved copy | 9 | 3 | 3 | 2 | 1 |
| wshobson/agents `plugins/developer-essentials/agents/monorepo-architect.md` | `module-boundaries` NOTICE | saved copy | 5 | 2 | 2 | 1 | 0 |
| tech-leads-club/agent-skills `.../(architecture)/modular-design-principles/SKILL.md` | `module-boundaries` NOTICE | saved copy | 22 | 9 | 6 | 6 | 1 |
| tech-leads-club/agent-skills `.../(architecture)/coupling-analysis/SKILL.md` | expert NOTICE, `module-boundaries` NOTICE | saved copy | 13 | 4 | 3 | 5 | 1 |
| anthropics/claude-plugins-official `plugins/code-modernization/agents/architecture-critic.md` | `docs/experts/softarch.md` | saved copy | 8 | 3 | 5 | 0 | 0 |
| anthropics/claude-plugins-official `plugins/pr-review-toolkit/agents/type-design-analyzer.md` | `docs/experts/softarch.md` | saved copy | 2 | 0 | 1 | 1 | 0 |
| anthropics/claude-plugins-official `plugins/feature-dev/agents/code-architect.md` | digest only | saved copy | 3 | 2 | 0 | 1 | 0 |
| affaan-m/ECC `skills/module-regression/SKILL.md` | digest only | saved copy | 3 | 1 | 1 | 1 | 0 |
| affaan-m/ECC `skills/architecture-decision-records/SKILL.md` | digest only | saved copy | 3 | 1 | 0 | 1 | 1 |
| affaan-m/ECC `agents/code-architect.md` | digest only | saved copy | 2 | 2 | 0 | 0 | 0 |
| affaan-m/ECC `agents/type-design-analyzer.md` | digest only | saved copy | 1 | 0 | 1 | 0 | 0 |
| affaan-m/ECC `skills/api-design/SKILL.md` (skimmed) | digest only | saved copy | 5 | 1 | 1 | 3 | 0 |
| affaan-m/ECC `skills/hexagonal-architecture/SKILL.md` (skimmed) | digest only | saved copy | 3 | 1 | 1 | 1 | 0 |
| github/awesome-copilot `skills/refactor-plan/SKILL.md` | digest only | saved copy | 3 | 1 | 2 | 0 | 0 |
| github/awesome-copilot `agents/api-architect.agent.md` | digest only | saved copy | 2 | 0 | 1 | 1 | 0 |
| github/awesome-copilot `agents/repo-architect.agent.md` | digest only | saved copy | 1 | 0 | 0 | 1 | 0 |
| mattpocock/skills `skills/engineering/improve-codebase-architecture/SKILL.md` | digest only | saved copy | 5 | 1 | 1 | 2 | 1 |
| alirezarezvani/claude-skills `engineering/skills/monorepo-navigator/SKILL.md` | digest only | saved copy | 7 | 1 | 3 | 3 | 0 |
| alirezarezvani/claude-skills `engineering-team/skills/senior-architect/SKILL.md` (skimmed) | digest only | saved copy | 6 | 2 | 1 | 3 | 0 |
| wshobson/agents `plugins/backend-development/skills/architecture-patterns/SKILL.md` | digest only | saved copy | 3 | 1 | 1 | 1 | 0 |
| wshobson/agents `plugins/backend-development/agents/backend-architect.md` (skimmed) | digest only | saved copy | 3 | 1 | 2 | 0 | 0 |
| wshobson/agents `plugins/backend-development/agents/graphql-architect.md` (skimmed) | digest only | saved copy | 4 | 1 | 2 | 1 | 0 |
| wshobson/agents `plugins/backend-development/skills/api-design-principles/SKILL.md` | digest only | saved copy | 3 | 2 | 0 | 1 | 0 |
| wshobson/agents `plugins/comprehensive-review/agents/architect-review.md` | digest only | saved copy | 1 | 0 | 0 | 1 | 0 |
| msitarzewski/agency-agents `engineering/engineering-software-architect.md` | digest only | saved copy | 6 | 4 | 0 | 2 | 0 |
| google-labs-code/design.md `.agents/skills/typed-service-contracts/SKILL.md` | digest only | saved copy | 3 | 0 | 2 | 1 | 0 |
| hashicorp/agent-skills `plugins/terraform/skills/refactor-module/SKILL.md` | digest only | saved copy | 1 | 0 | 1 | 0 | 0 |
| tech-leads-club/agent-skills `.../evolutionary-modular-architecture/SKILL.md` | digest only | saved copy | 6 | 1 | 1 | 4 | 0 |
| tech-leads-club/agent-skills `.../modular-decomposition/SKILL.md` | digest only | saved copy | 2 | 0 | 1 | 1 | 0 |
| tech-leads-club/agent-skills `.../tactical-ddd/SKILL.md` | digest only | saved copy | 3 | 0 | 1 | 2 | 0 |
| Jeffallan/claude-skills `skills/api-designer/SKILL.md` (skimmed) | digest only | saved copy | 3 | 1 | 0 | 2 | 0 |
| Jeffallan/claude-skills `skills/architecture-designer/SKILL.md` (skimmed) | digest only | saved copy | 2 | 1 | 0 | 1 | 0 |
| ChrisWiles/claude-code-showcase `.claude/skills/graphql-schema/SKILL.md` (no licence) | digest only | saved copy | 3 | 0 | 0 | 3 | 0 |

"Digest only": compared in the earlier session (`upstream-softarch/digest.md`) and covered by the NOTICE's repo list, but not named in any NOTICE or in `docs/experts/softarch.md`.

## 2. Items, per source

Value test numbers: 1 non-obvious, 2 checkable, 3 sourced, 4 not covered elsewhere. "n/a" for routed items.

### Protobuf documentation set (via the maintainer's record)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Changing a field's number is unsafe (claim 1) | taken | `protobuf-compat`, "Field numbers and names" | pass (borderline 1) |
| Deleted numbers never reused; `reserved` makes protoc refuse (2) | taken | `protobuf-compat`, same section | pass |
| Reserve the name too, for ProtoJSON and text format (3) | taken | same | pass |
| New field safe; ProtoJSON readers without ignore-unknown reject it (4) | taken | same | pass |
| int32/uint32/int64/uint64/bool wire-compatible, breaking in ProtoJSON, generated code, FILE, AIP-180 (5) | taken | "Types and cardinality" | pass |
| string/bytes: binary-safe while UTF-8, unsafe in ProtoJSON (6) | taken | same | pass |
| oneof moves; AIP-180 and Buf FILE/PACKAGE refuse any move (7) | taken | same | pass |
| Type change across wire encodings breaks (8) | taken | same | fails 1 |
| proto3 has no `required` (9) | taken | same | fails 4 (protoc refuses the keyword) |
| proto3 `optional` from 3.15; Editions presence default (10) | taken | same | pass |
| proto3 first enum value is 0; closed enums exempt (11) | taken | "Enums" | fails 4 (protoc refuses) |
| Open versus closed enums; Go all open, Dart all closed (12) | taken | "Enums" | pass |
| New enum value wire-safe; breaks ProtoJSON, closed enums, exhaustive switches (13) | taken | "Enums" | pass |
| ProtoJSON encodes names; `json_name` keeps old name (14) | taken | "Field numbers and names" | pass |
| Reserved-name quoting by syntax (15) | taken | same | fails 4 (protoc refuses the wrong form) |
| Buf categories FILE, PACKAGE, WIRE_JSON, WIRE; FILE default (16) | taken | "First, find which compatibility" | pass |
| gRPC path is `/package.Service/Method` (17) | taken | "Field numbers and names" | pass |
| AIP-180 list: defaults, behaviour, file moves, length limits (18) | taken | "Types and cardinality" | pass |
| AIP-180: changing a resource name format is breaking (18, part) | missing | `protobuf-compat`, new row: a changed `google.api.resource` `pattern` [R] | pass |
| Field numbers 19,000 to 19,999 reserved (extra) | taken | "Field numbers and names" | fails 4 (protoc refuses) |
| ProtoJSON refuses null in repeated fields (extra) | rejected | a runtime payload property, not visible in a `.proto` diff | fails 2 |
| Edition 2024 enforces STYLE2024 naming (extra) | taken | "Editions" | the rejection part fails 4; the rename consequence passes |

### Schema documentation set (via the maintainer's record)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| OAS 3.0 `nullable`; 3.1 type arrays with "null" (19) | taken | `schema-evolution`, OpenAPI note | pass |
| Absent `additionalProperties` accepts unlisted; `unevaluatedProperties` can restrict (20) | taken | OpenAPI table | pass |
| `deprecated: true` on operations, parameters, headers, schemas (21) | taken | OpenAPI table | pass |
| oasdiff: required request property, removed response property, path removed without deprecation are breaking; Info after sunset (22) | taken | OpenAPI table | pass |
| GraphQL output field removal, non-null to nullable break (23, secondary) | taken | "GraphQL" [S] | pass on 1, 2; 3 needs a primary |
| Argument or input made non-null without default breaks (24) | taken | "GraphQL" | pass |
| Inspector: union member, enum value, interface removal; enum add dangerous (25, secondary) | taken | "GraphQL" [S] | as 23 |
| `@deprecated` on arguments and input fields from Oct 2021 (26) | taken | "GraphQL" | pass |
| Non-null argument with default may be omitted; explicit null rejected (27) | taken | "GraphQL" | pass |
| Sunset header RFC 8594 (28) | taken | "Deprecation over HTTP" | pass |
| Deprecation header RFC 9745, date form (29) | taken | same | pass |
| SemVer major zero (30) | taken | "Published packages" | pass |
| `^0.2.3` and `^0.0.3` ranges (31) | taken | same | pass |
| pnpm replaces `workspace:` on pack and publish (45) | taken | same | pass |
| OAS 3.0 `exclusiveMinimum` boolean, 3.1 number (extra) | taken | OpenAPI note | pass |
| SemVer minor bump for a deprecation (extra) | taken | "Published packages" | pass |
| oasdiff Info for removal after deprecation and sunset (22, part) | taken | OpenAPI table | pass |
| `unevaluatedProperties: false` restricts like `additionalProperties: false` (20, part) | taken | OpenAPI table | pass |

### Boundary documentation set (via the maintainer's record)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Go v2+ needs `/vN`; v0 and v1 must not (32) | taken | `module-boundaries`, "Go" | pass |
| Go `internal` import rule (33) | taken | "Go" | rule fails 4 (compiler); the move-out consequence passes |
| Node `exports` refuses unlisted subpaths (34) | taken | "Node and TypeScript" | pass |
| TypeScript honours `exports` only under node16, nodenext, bundler (35) | taken | same | pass |
| Project references need `composite`; cycles are an error (36) | taken | same | fails 4 (tsc refuses) |
| JPMS `exports` and `opens` (37) | taken | "Java modules" | pass |
| Split packages: a module may not read two exporting the same package (38) | taken | same | fails 4 (javac and the launcher refuse) |
| import-linter's five contract types (39) | taken | "Python: import-linter" | fails 2 (locator fact) |
| import-linter config files (40) | taken | same | fails 2 (locator fact) |
| dependency-cruiser regex paths and `$1` (41) | taken | "dependency-cruiser" | fails 2 (locator fact) |
| dependency-cruiser `circular: true`, type-only exclusion (42) | taken | same | pass |
| Nx depConstraints, deep imports, `allow` bypasses (43) | taken | "Nx" | pass |
| ArchUnit FreezingArchRule reports only new violations (44) | taken | "Java modules and ArchUnit" | pass |
| `composite` forces `declaration`, needs every file included (extra) | taken | "Node and TypeScript" | fails 4 (tsc refuses) |
| import-linter layers required unless parenthesised (extra) | taken | "Python" | fails 2 (locator fact) |
| import-linter errors on unmatched `ignore_imports` (extra) | taken | "Python" | pass |
| Nx `notDependOnLibsWithTags` whole tree, `onlyDependOnLibsWithTags` direct only (extra) | taken | "Nx" | pass |
| `node16`/`nodenext` require extensions on relative ESM imports (record, TS page) | taken | "Node and TypeScript" | fails 4 (tsc refuses) |

### github/awesome-copilot `skills/protobuf-grpc-api-review/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Establish the encodings in use (binary, ProtoJSON, text) before judging | taken | `protobuf-compat`, "First, find which compatibility" | pass |
| Messages persisted in databases, queues, logs or events widen the envelope | routed | `event-schema-evolution` (3b); architect "Two versions at once" | n/a |
| Clients outside the repository that release on their own | taken | `review.md` scope (consumer outside the repository) | pass |
| Syntax or edition, and the generated runtimes | taken | `protobuf-compat`, first paragraph | pass |
| HTTP/JSON transcoding exposes names | taken | `protobuf-compat`, ProtoJSON and path rows | pass |
| Schema registries expose the contract | routed | `event-schema-evolution` (3b) | n/a |
| Reflection and service config expose the contract | routed | security (reflection exposure) | n/a |
| Deployment order, rollback window, mixed-version duration | routed | architect, "Two versions at once" | n/a |
| Never judge compatibility from the new schema alone | rejected | a diff reviewer always has both sides | fails 1 |
| Inventory by fully qualified symbol, including package options and namespaces | missing | `protobuf-compat`, new row on file options (see section 4, item 7) | pass |
| Ignore formatting-only changes once descriptors are unchanged | rejected | generic; a reviewer does not flag whitespace | fails 1 |
| Four dimensions: binary, named formats, generated source, behaviour | taken | `protobuf-compat`, the three targets; behaviour routed below | pass |
| Behaviour dimension: status codes, retries, deadlines, authorization, streaming | routed | architect (`failure-handling`), security | n/a |
| Mixed-version paths (old writer to new reader and back, reserialize, rollback, stored data) | routed | architect, "Two versions at once" | n/a |
| Readers before writers; keep the old field until rollback closes | routed | architect | n/a |
| Run `buf breaking` or the build | rejected | the expert is read-only | fails 2 |
| Inspect generated code only where the repository commits it | taken | `review.md`, "Two copies of a contract out of step" | pass |
| Search call sites for exhaustive switches, JSON names, method paths | taken | `protobuf-compat` enum row ("find a consumer's switch") | pass |
| Look for descriptor baselines before proposing a new mechanism | taken | `review.md` loosened-rule category; repository-first rule | pass |
| Do not claim a check passed unless it ran | taken | protocol, "Say what you could not check" | pass |
| Verdict classes (compatible, rollout-dependent, breaking, insufficient context) | rejected | our result shape is the schema's | fails 4 |
| Finding format with a "dimension" field | rejected | format; the protocol and schema hold it | fails 4 |
| Tag reuse and corrupting changes rank highest | missing | `review.md`, "Severity here" | pass |
| Compatibility matrix and targeted tests in the report | routed | quality | n/a |
| Never reuse an enum number; reserve deleted enum numbers and names | missing | `protobuf-compat`, "Enums" (section 4, item 5) | pass |
| Type and cardinality changes are migrations even when wire-compatible | taken | "Types and cardinality" (types only; cardinality is missing, see next file) | pass |
| Prefer additive evolution: add, migrate, deprecate, remove | taken | `plan.md`, contract order | pass |
| Retries need idempotency; deadlines on production RPCs | routed | architect, `failure-handling` | n/a |
| Do not demand streaming, retries, health checks or transcoding | taken | agent rule "A principle is not a finding" | pass |
| Do not flag a new optional field only because old clients ignore it | missing | `protobuf-compat`, "Not a finding" | pass |
| Do not demand reservations for fields that never shipped | taken | `protobuf-compat`, "When it does not apply" column | pass |

### github/awesome-copilot `references/protobuf-compatibility.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Changing a field number, reusing a number, into an existing oneof, type with another encoding | taken | `protobuf-compat` | pass |
| Reusing a deleted enum number | missing | same as the SKILL item above | pass |
| An apparently unused tag may still be in logs, queues, rollback artifacts | taken | `protobuf-compat`, reserved row | pass |
| Field to extension with the same number and type is wire-safe | rejected | rare proto2 construct; no reviewer error mode | fails 1 |
| Single-field oneof to an explicit-presence field is wire-safe | taken | covered by the AIP-180/Buf any-oneof-move row | pass |
| sint32 and sint64 interchangeable, not with plain ints | rejected | breaking under the default FILE target anyway; the type-change rows cover it | fails 4 |
| fixed32 and sfixed32 (and 64) differ only in signedness | rejected | same reason | fails 4 |
| Embedded message and bytes interchangeable on the wire | rejected | same reason | fails 4 |
| Enum and integer types interchangeable on the wire | rejected | same reason; JSON form changes too | fails 4 |
| Singular and repeated (strings, bytes, messages): last value kept or messages merged | missing | `protobuf-compat`, "Types and cardinality" has no cardinality row (section 4, item 3) | pass |
| Packed numeric repeated fields are not interchangeable with singular | missing | same row | pass |
| A map and its repeated entry message are wire-equivalent; duplicates and order lost | missing | same row (section 4, item 4) | pass |
| Six-step replacement of a shipped field | routed | architect (rollout order); the "new number, new name" part is taken in `plan.md` | n/a |
| Do not reserve a number while the field is still declared | rejected | protoc refuses | fails 4 |
| Implicit to explicit presence changes generated API and default meaning | taken | "Types and cardinality" [T] | pass |
| An implicit-presence scalar cannot tell unset from default in an update API | missing | `protobuf-compat`, new row: a new update-request scalar without presence or field mask [T] | pass |
| Adding a member to an existing oneof: old clients drop it when they set a known member and reserialize | missing | `protobuf-compat`, oneof row (section 4, item 10) | pass |
| Removing a oneof member loses which member was set | taken | covered by the removed-field and reserved rows | pass |
| Never add a required field (proto2) | missing | `protobuf-compat`, presence row (section 4, item 6) | pass |
| Do not change explicit proto2 defaults | taken | AIP-180 "changing a default" row | pass |
| Keep a zero `_UNSPECIFIED` first value | taken | "Enums" | fails 4 (buf lint `ENUM_ZERO_VALUE_SUFFIX`) |
| New enum value may break exhaustive switches | taken | "Enums" | pass |
| Enum aliases: add the new alias after the old; stage a rename | rejected | needs `allow_alias`, rare; the serializer behaviour is unconfirmed | fails 3 |
| ProtoJSON: names are data, unknown fields dropped, new names fail old parsers, `json_name` changes the schema | taken | ProtoJSON rows | pass |
| HTTP transcoding exposes names over a binary transport | taken | ProtoJSON and path rows | pass |
| Stored JSON needs historical payloads in tests; the verification matrix | routed | quality | n/a |

### github/awesome-copilot `references/grpc-contract-review.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Package, service and method form the identity; renaming breaks clients and routing | taken | `protobuf-compat`, gRPC path row | pass |
| The same rename breaks authorization policy maps keyed by path | routed | security | n/a |
| Changing a method's request or response message type is breaking | missing | `protobuf-compat`, new row (section 4, item 1); planned in the digest, not written | pass |
| Changing the streaming mode is breaking | missing | same row (section 4, item 2) | pass |
| Moving a service to another package | taken | gRPC path row | pass |
| Add a new method, migrate, deprecate, then remove | taken | `plan.md`, contract order | pass |
| Deadlines: none by default, propagate the remaining deadline, stop work on cancel | routed | architect | n/a |
| Retries and idempotency; a response header commits the RPC | routed | architect, `failure-handling` | n/a |
| Status codes are part of the API; changing an established code | taken | `review.md`, "A broken contract" (status code) | pass |
| The meaning of each status code | rejected | tutorial | fails 1 |
| Do not hide domain failures behind UNKNOWN or INTERNAL | routed | developer, `failure-handling` | n/a |
| Streaming: ordering, half-close, backpressure, size limits, resume | routed | architect | n/a |
| Per-method authorization, transport security, credential logging | routed | security | n/a |
| Bounds on request size, fan-out, repeated fields | routed | security, architect | n/a |
| Reflection, health and debug endpoints exposed only as intended | routed | security | n/a |
| Behaviour: pagination tokens, ordering, filters, consistency guarantees | taken | `review.md`, "changed meaning", "event ordering or semantics" | pass |
| Default limits, quotas, server-side timeouts | routed | architect | n/a |
| Targeted verification (old client against new server) | routed | quality | n/a |

### msitarzewski/agency-agents `engineering-api-platform-engineer.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Additive is safe; changing or removing a relied-on thing breaks | taken | `review.md`, "A broken contract" | fails 1 alone; the direction rule carries it |
| Consistent naming, dates, IDs, pagination, error shape | rejected | REST style without a repository convention | fails 1 |
| Deprecation runway with `Deprecation` and `Sunset` headers | taken | `schema-evolution`, "Deprecation over HTTP" | pass |
| A 200 with an error body is a bug | rejected | REST style; developer's at most | fails 4 |
| Rate-limit headers, 429 with `Retry-After` | routed | architect (`api-gateway`) | n/a |
| SDKs and docs generated from the spec | taken | `review.md`, "Two copies of a contract out of step" | pass |
| Idempotency keys on creates | routed | architect | n/a |
| Validate the whole OpenAPI document; unresolved `$ref` | rejected | a validator or linter enforces it | fails 4 |
| Safe/breaking table: optional response field, optional request parameter, relaxed validation safe | taken | `schema-evolution`, direction rule | pass |
| New enum value safe only if clients tolerate unknowns | taken | `review.md`, "Do not report" | pass |
| Changing a default behaviour is breaking | missing | `schema-evolution`, new row on a changed request `default` (section 4, item 12) | pass |
| Changing the error structure or status meaning is breaking | taken | `review.md`, "A broken contract" | pass |
| Major version in the path; no minor churn | rejected | choice of versioning scheme, left out by NOTICE | fails 1 (opinion) |
| Runway of 6 to 12 months | rejected | policy number | fails 2 |
| Monitor remaining usage per consumer before sunset | rejected | operations, not visible in a diff | fails 2 |
| Spec-diff in CI blocks breaking changes | routed | quality (can the gate fail); the loosened baseline is taken in `review.md` | n/a |
| Spectral-style linting | rejected | a linter enforces it | fails 4 |
| GraphQL: additive by default, field deprecation | taken | `schema-evolution`, "GraphQL" | pass |
| Authentication patterns per consumer | rejected | security's | fails 4 |

### affaan-m/ECC `skills/contract-first/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| One canonical, version-controlled artifact per boundary | taken | `plan.md`, contracts question (also quality `plan.md`, "Contracts": see section 3) | pass |
| The same shape kept in a wiki, a mock and provider code | taken | `review.md`, two copies (hand-written duplicate) | pass |
| Contract content is data; `$ref` only from allowlisted paths | routed | security | n/a |
| Generators pinned, least privilege | routed | security, devops | n/a |
| The artifact states names, required, nullability, defaults, enums, errors, versioning | taken | `plan.md`, contracts question | pass |
| Database columns and internal classes stay out of the contract | taken | `review.md`, "A leaking boundary" | pass |
| Name consumers, provider owner and approver | taken | agent rule "Find the other side" (approver part rejected: process) | pass |
| A task-oriented response instead of several calls | rejected | design opinion; chatty calls are the architect's | fails 2 |
| Identifiers that must stay strings: a large integer loses precision in JavaScript readers | missing | `schema-evolution`, new row (section 4, item 14) | pass |
| Semantic constraints (null except when cancelled) documented | rejected | not checkable in a diff | fails 2 |
| Generated types over hand-written copies | taken | `review.md`, two copies | pass |
| A cast hides incompatible runtime data; validate at serialization | routed | quality, developer | n/a |
| A driver that rounds an unsafe integer before conversion | routed | developer (data expert when built) | n/a |
| Verify every path: sandbox, errors, empty, nullable, flags | routed | quality | n/a |
| No consumer uses undocumented fields | rejected | not checkable statically | fails 2 |
| Change order: proposal, contract, regenerate, implement, verify | taken | `plan.md`, contract order | pass |
| Do not repurpose an existing field for a breaking change | taken | `plan.md` ("changing the meaning of a value breaks") | pass |
| `select *` returned as the response leaks storage | taken | `review.md`, "A leaking boundary" | pass |
| A serializer rename with no contract change breaks even with green tests | taken | `review.md`, two copies and broken contract | pass |
| No contract machinery for a single-module boundary changed atomically | taken | `schema-evolution` "Does not apply"; `review.md` "Do not report" | pass |

### addyosmani/agent-skills `skills/api-and-interface-design/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Hyrum's law: ordering and timing become contract | taken | `review.md`, "changed meaning", "event ordering or semantics" | pass |
| Hyrum's law: error message text becomes contract | rejected | which consumer parses the text cannot be shown | fails 2 |
| One-version rule, diamond dependencies | routed | developer, `dependency-discipline` | n/a |
| Contract first | taken | `plan.md`, "state the contract first" | fails 1 alone |
| One error strategy everywhere | rejected | style | fails 1 |
| Status code mapping table | rejected | tutorial | fails 1 |
| Validate at system edges; third-party responses untrusted | routed | security, developer | n/a |
| Prefer addition over modification | taken | `review.md`, `plan.md` | fails 1 alone |
| Predictable naming conventions | rejected | style | fails 1 |
| Honouring an idempotency key (intent-derived, atomic claim, payload hash, in-flight, retention against the DLQ) | routed | architect, `failure-handling`, `aws-messaging` | n/a |
| REST resources, pagination, filtering, PATCH | rejected | REST style, left out by NOTICE | fails 1 |
| Discriminated unions for variants | routed | developer, `typescript-craft` | n/a |
| Input and output types separated | rejected | design opinion; the direction rule covers the compatibility side | fails 4 |
| Branded IDs | routed | developer, `typescript-craft` | n/a |
| "Internal APIs need contracts too" | rejected | heavier by default; an internal consumer changed in the same diff is not broken | fails 1 |

### alirezarezvani/claude-skills `engineering/skills/api-design-reviewer/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Run a linter, a breaking-change detector and a scorecard | rejected | runs tools; scores | fails 2 |
| Naming, methods, URL structure conventions | rejected | REST style | fails 1 |
| Breaking: endpoint removal, field removal or rename, type change, new required field, status code change | taken | `schema-evolution`, `review.md` | pass |
| Versioning strategies (URL, header, media type, query) | rejected | choice of scheme, left out | fails 1 |
| Pagination, error format, auth, rate limits, HATEOAS, caching, security headers | rejected | style; rate limits and auth are other experts' | fails 4 |
| "Making required fields optional" listed as safe, side unstated | taken | `schema-evolution`, "Direction decides" (the trap) | pass |
| Adding response fields is safe | taken | `schema-evolution` (by direction) | pass |
| A new response property breaks a strict client when the response schema is closed | missing | `schema-evolution`, OpenAPI table (section 4, item 13) [O] | pass |
| Modifying error response formats is breaking | taken | `review.md`, error shape | pass |
| Changing URL structure is breaking | taken | `schema-evolution`, removed path | pass |
| Required OpenAPI components | rejected | a validator enforces it | fails 4 |
| Idempotent methods | routed | architect | n/a |

### mattpocock/skills `skills/in-progress/setup-ts-deep-modules/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Root files are entry points; every subfolder is private | rejected | a house convention, not a rule the repository has | fails 1 (opinion) |
| Intra-package freedom through dependency-cruiser `$1` groups | taken | `module-boundaries`, "dependency-cruiser" | pass |
| Tests only through entry points | rejected | house rule; testing is quality's | fails 4 |
| No cycles rule | taken | `module-boundaries`, `circular: true` | pass |
| Barrel files discouraged | rejected | opinion | fails 1 |
| Merge into an existing config, never overwrite | rejected | a setup step; the expert writes nothing | fails 2 |
| Boundary check wired into the umbrella CI command | routed | devops (is it run), quality (can it fail) | n/a |
| Prove the rules bite (pass, fail, pass) | taken | inverted into the loosened-rule check, `review.md` | pass |
| Packages flat, no nested packages | rejected | house rule | fails 1 |
| `.cjs` config so `module.exports` loads in a `"type": "module"` repo | rejected | the tool fails loudly when it cannot load its config | fails 1 |
| Document the convention and point the agent file at it | rejected | process | fails 2 |

### wshobson/agents `skills/monorepo-management/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| pnpm reads workspace members only from `pnpm-workspace.yaml` | missing | `module-boundaries`, "Node and TypeScript" (section 4, item 15): a new package outside the globs resolves from the registry | pass |
| Turborepo 2 renamed `pipeline` to `tasks` | routed | devops (the build fails loudly anyway) | n/a |
| Keep the package graph acyclic | taken | `review.md`, "A cycle" | pass |
| Phantom dependencies | taken | `module-boundaries`, undeclared workspace import | pass |
| Incorrect cache inputs | routed | devops | n/a |
| Over-sharing and under-sharing | rejected | opinion | fails 2 |
| Changesets for versioning and publishing | taken | `schema-evolution`, changeset marked patch | pass |
| Lock versions across the workspace | routed | developer, `dependency-discipline` | n/a |
| Shared configs centralised | rejected | opinion | fails 2 |

### wshobson/agents `agents/monorepo-architect.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Tags for dependency constraints | taken | `module-boundaries`, "Nx" | pass |
| Clear project boundaries; focused shared libraries | taken | `review.md`, "A dumping ground" | pass |
| Affected detection for CI | routed | devops | n/a |
| Remote caching | routed | devops | n/a |
| Code ownership rules | rejected | process | fails 2 |

### tech-leads-club/agent-skills `modular-design-principles/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| A small, stable public surface | taken | `review.md`, "A leaking boundary" | pass |
| No hidden shared mutable state across boundaries | missing | `review.md`, "Two owners for the data": a module mutating another's exported global or singleton [O] | pass |
| Resources tunable per module | routed | architect | n/a |
| Cross-module interaction through documented contracts | taken | `plan.md`, contracts | fails 1 alone |
| Dependencies through interfaces for replaceability | rejected | heavier by default; `plan.md` forbids new interfaces the repository does not use | fails 1 |
| Deployment independence | routed | architect | n/a |
| Each module owns its persistent state | taken | `review.md`, "Two owners for the data" | pass |
| Observability per module | routed | observability expert (planned) | n/a |
| Failure containment | routed | architect | n/a |
| Duplicate global definitions that diverge | taken | `review.md`, two copies | pass |
| Same name for different things across modules | rejected | naming | fails 2 |
| Reach-through persistence | taken | `review.md`, "Two owners for the data" | pass |
| One persistence layer that registers every store | rejected | opinion; the repository's convention decides | fails 1 |
| Business rules in transport adapters | rejected | a layering ideal the repository may not follow | fails 1 |
| Adapters calling storage directly | rejected | same reason | fails 1 |
| Writes across boundaries with no transaction owner | routed | architect, "A write to two places" | n/a |
| Leaky exports (repositories, internal services) | taken | `review.md`, "A leaking boundary" | pass |
| Facades that are not thin | rejected | opinion | fails 2 |
| Six-criteria split test; fewer boundaries by default | taken | `plan.md` ("the burden is on adding structure") | pass |
| Enriched event payloads instead of chatty calls | routed | architect; `event-schema-evolution` (3b) | n/a |
| A shared "utils" area that becomes the coupling point | taken | `review.md`, "A dumping ground" | pass |
| Infrastructure types leaking into core | taken | `review.md`, "Dependency direction" | pass |

### tech-leads-club/agent-skills `coupling-analysis/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Reflection into another module's private members; monkey-patching internals | missing | `review.md`, "A leaking boundary" names private paths and underscore names but not reflection or patching [O] | pass |
| A service reading another service's database | routed | architect (between services); inside one codebase it is taken as "Two owners" | n/a |
| Depending on another module's internal file or config layout | taken | `review.md`, "reaches into another module's internals" | pass |
| Sequential and transactional functional coupling | routed | architect | n/a |
| The same business rule duplicated in two modules | routed | developer, `simplification` | n/a |
| "Remember to update X" comments as evidence | rejected | a comment proves nothing (protocol) | fails 2 |
| Internal domain model returned through the public interface | taken | `review.md`, "A leaking boundary" | pass |
| Internal enum shared externally | taken | `review.md`, "A leaking boundary" | pass |
| Connascence of position (tuples) | rejected | opinion | fails 2 |
| A dedicated DTO per use case | rejected | heavier by default | fails 1 |
| Strength, distance, volatility scores and the balance formula | rejected | scores | fails 2 |
| Git co-change analysis | rejected | runs tools | fails 2 |
| Different teams raise the distance | taken | `review.md` scope: a consumer you cannot see is reported as such | pass |

### anthropics `code-modernization/agents/architecture-critic.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Skeptical stance toward the proposal | taken | `review.md` ("A skeptic will try to refute") | pass |
| A service boundary should match a domain seam | routed | architect | n/a |
| Unstated non-functional requirements; failure traced end to end | routed | architect | n/a |
| The data migration story | routed | architect, "Moving existing data" | n/a |
| Legacy structure leaking through a translation | routed | developer | n/a |
| An abstraction with one implementation and no second use | taken | `review.md`, "Do not report" | pass |
| Tests that only exercise code paths | routed | quality | n/a |
| A comment is not behaviour | taken | protocol, "Evidence" | pass |

### anthropics `pr-review-toolkit/agents/type-design-analyzer.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Type invariants, encapsulation, construction-time validation | routed | developer | n/a |
| 1-10 ratings on four axes | rejected | scores | fails 2 |

### anthropics `feature-dev/agents/code-architect.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Find existing patterns with file and line before designing | taken | `review.md`, method step 1; `plan.md`, "Where it lives" | pass |
| Decide on one approach without presenting options | rejected | conflicts with the template's one-way-choice rule (alternatives named) | fails 1 |
| Build sequence | taken | `plan.md`, contract order | pass |

### affaan-m/ECC `skills/module-regression/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| A ledger of each module's downstream consumers and acceptance command | routed | quality | n/a |
| Derive consumers from the dependency graph; mark unverified edges | taken | agent rule "Find the other side"; protocol "Say what you could not check" | pass |
| The verdict is the exit code | rejected | the expert cannot run commands | fails 2 |

### affaan-m/ECC `skills/architecture-decision-records/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Do not record trivial decisions | taken | template, "When the plan makes a one-way choice" | pass |
| A superseded ADR links its replacement | rejected | process | fails 2 |
| A change that contradicts an accepted ADR without superseding it | missing | `plan.md` question; `review.md` "Against the repository's structure" [O] | pass |

### affaan-m/ECC `agents/code-architect.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| No speculative abstractions unless the repository uses them | taken | `plan.md` rules | pass |
| Order by dependency: types and interfaces first | taken | `plan.md`, contract order | pass |

### affaan-m/ECC `agents/type-design-analyzer.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Illegal states unrepresentable; escape hatches | routed | developer | n/a |

### affaan-m/ECC `skills/api-design/SKILL.md` (skimmed)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| REST naming, status codes, pagination, filtering | rejected | REST style | fails 1 |
| At most two active versions; six months' notice | rejected | policy numbers | fails 2 |
| 410 Gone after the sunset date | rejected | policy; RFC 8594 does not require it | fails 3 |
| Changing the authentication method is breaking | routed | security | n/a |
| Non-breaking and breaking lists | taken | `schema-evolution` | fails 1 alone |

### affaan-m/ECC `skills/hexagonal-architecture/SKILL.md` (skimmed)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Domain entities importing ORM, web framework or SDK types | taken | `review.md`, "Dependency direction" (only where the repository layers) | pass |
| Ports, adapters and a composition root as the layout | rejected | a layering ideal (CHANGES: hexagonal guides left out) | fails 1 |
| Unit tests with fake ports | routed | quality | n/a |

### github/awesome-copilot `skills/refactor-plan/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Sequence: contracts, implementations, callers, tests, cleanup | taken | `plan.md`, contract order | pass |
| Rollback steps for the riskiest phases | routed | devops, architect | n/a |
| Verification between phases | routed | quality | n/a |

### github/awesome-copilot `agents/api-architect.agent.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Service, manager and resilience layers | rejected | house pattern | fails 1 |
| Circuit breaker, bulkhead, throttling, backoff | routed | architect | n/a |

### github/awesome-copilot `agents/repo-architect.agent.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Scaffolding for agent-config folders | rejected | off-topic | fails 4 |

### mattpocock/skills `skills/engineering/improve-codebase-architecture/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| The deletion test for shallow modules | routed | developer, `simplification` (already held) | n/a |
| One adapter is a hypothetical seam, two are real | taken | `review.md`, "Do not report" (interface for one implementation) | pass |
| ADRs record decisions a review should not re-litigate | missing | same item as ECC ADR above | pass |
| Hot spots from `git log` | rejected | runs tools | fails 2 |
| HTML report with diagrams | rejected | output format | fails 2 |

### alirezarezvani/claude-skills `engineering/skills/monorepo-navigator/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| `workspace:*` breaks a plain publish | taken | `schema-evolution`, pnpm row | pass |
| `--filter` affected packages in CI | routed | devops | n/a |
| Turbo `inputs` tuned | routed | devops | n/a |
| A package tsconfig extending a base that sets `rootDir`/`outDir` | routed | developer, `typescript-craft` (paths resolve from the defining config; unverified) | n/a |
| `git filter-repo` for migrations | rejected | process | fails 2 |
| Per-package agent files | rejected | process | fails 2 |
| A types-only package with no runtime code | rejected | opinion | fails 1 |

### alirezarezvani/claude-skills `engineering-team/skills/senior-architect/SKILL.md` (skimmed)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Circular dependencies between modules | taken | `review.md`, "A cycle" | pass |
| Layer violations | taken | `review.md`, "Dependency direction" | pass |
| "Extract a shared interface" to break a cycle | rejected | CHANGES: not the default fix | fails 1 |
| Large file, consider splitting | rejected | `review.md`, "Do not report" (size) | fails 1 |
| Coupling score 0-100 and scripts | rejected | scores; runs tools | fails 2 |
| Outdated packages and CVEs | routed | security, developer `dependency-discipline` | n/a |

### wshobson/agents `skills/architecture-patterns/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| A layer cycle from importing a concrete adapter instead of the port | taken | `review.md`, "A cycle" | pass |
| Clean, hexagonal and DDD catalogue | rejected | pattern catalogue | fails 1 |
| In-memory adapters in tests | routed | quality | n/a |

### wshobson/agents `agents/backend-architect.md` (skimmed)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Event schema evolution: backward and forward compatibility | routed | `event-schema-evolution` (3b) | n/a |
| API versioning and deprecation | taken | `schema-evolution` | fails 1 alone |
| Resilience patterns, event-driven catalogue | routed | architect | n/a |

### wshobson/agents `agents/graphql-architect.md` (skimmed)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Federation and subgraph composition | routed | architect | n/a |
| Query complexity, depth limiting, persisted queries, DataLoader | routed | performance expert (planned), security | n/a |
| Breaking-change detection on the schema | taken | `schema-evolution`, "GraphQL" | pass |
| Usage analytics before removing a field | rejected | operations, not visible in a diff | fails 2 |

### wshobson/agents `skills/api-design-principles/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| REST naming, methods, versioning styles | rejected | REST style | fails 1 |
| GraphQL `@deprecated` for gradual migration | taken | `schema-evolution`, "GraphQL" | pass |
| API structure should not mirror the database schema | taken | `review.md`, "A leaking boundary" | pass |

### wshobson/agents `comprehensive-review/agents/architect-review.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| A catalogue of patterns and platforms | rejected | catalogue | fails 1 |

### msitarzewski/agency-agents `engineering-software-architect.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Patterns are tools, not badges | taken | agent rule "A principle is not a finding" | pass |
| Inner domain policies must not depend on frameworks | taken | `review.md`, "Dependency direction" | pass |
| Name the trade-off; present two options | taken | template, one-way-choice rule | pass |
| Prefer reversible decisions | taken | template, one-way-choice rule | pass |
| Controllers calling repositories directly is a smell | rejected | a layering ideal unless the repository uses it | fails 1 |
| ADR for every decision | rejected | CHANGES: not a record for every choice | fails 1 |

### google-labs-code `typed-service-contracts/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Spec and handler with Zod; handlers never throw | rejected | house pattern | fails 1 |
| A path-traversal refinement on input | routed | security | n/a |
| Errors as a discriminated union | routed | developer, `failure-handling` | n/a |

### hashicorp/agent-skills `terraform/skills/refactor-module/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Module variables and outputs as a contract; `moved` blocks; state migration | routed | devops, `terraform-change-safety` | n/a |

### tech-leads-club `evolutionary-modular-architecture/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Each module writes only its own tables | taken | `review.md`, "Two owners for the data" | pass |
| No direct cross-module imports | rejected | absolute rule (CHANGES) | fails 1 |
| Every vendor behind a port and ACL | rejected | heavier by default | fails 1 |
| Retry only idempotent operations | routed | architect | n/a |
| Flat-by-aggregate folders | rejected | house pattern | fails 1 |
| Boundary validation scripts | rejected | runs tools | fails 2 |

### tech-leads-club `modular-decomposition/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| A five-pattern decomposition pipeline | rejected | process, not a diff check | fails 2 |
| Duplicated domain logic across components | routed | developer, `simplification` | n/a |

### tech-leads-club `tactical-ddd/SKILL.md`

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Anemic domain models | rejected | DDD everywhere (CHANGES) | fails 1 |
| Reference other aggregates by ID | rejected | opinion | fails 1 |
| One transaction per aggregate | routed | architect (data expert when built) | n/a |

### Jeffallan/claude-skills `skills/api-designer/SKILL.md` (skimmed)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Lint and mock the spec with CLI tools | rejected | runs tools; a linter enforces it | fails 2 |
| Naming, RFC 7807, pagination everywhere | rejected | style | fails 1 |
| Do not expose implementation details in the API | taken | `review.md`, "A leaking boundary" | fails 1 alone |

### Jeffallan/claude-skills `skills/architecture-designer/SKILL.md` (skimmed)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Do not over-engineer for hypothetical scale | taken | `review.md`, "Do not report" (hypothetical consumers) | pass |
| ADRs for all significant decisions | rejected | a record for every choice | fails 1 |

### ChrisWiles/claude-code-showcase `.claude/skills/graphql-schema/SKILL.md` (no licence: nothing may be taken)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Never inline `gql` literals; always use generated hooks | rejected | house rule; no licence | fails 1 |
| Run codegen after editing `.gql` (generated files not hand-edited) | rejected | no licence; the idea is already held from ECC as "two copies" | fails 4 |
| `onError` required on every mutation | rejected | house rule; no licence | fails 1 |

## 3. Today's rows, value test

"Merge" names the one home the row should keep. "Move" means the row stays but changes section under the new template.

### `protobuf-compat`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| protobuf-compat | Scope paragraph (rollout to architect, retries, authorization to security) | keep | becomes Goal "Not for" |
| protobuf-compat | First, find the compatibility promised: Buf categories, AIP-180 equals FILE, `buf.yaml`, JSON exposure, published code, syntax line | keep | move to "First, establish the target" |
| protobuf-compat | Changing a field's number is unsafe | merge with the reserved row | fails 1 alone; its "does not apply" (never shipped) is the value |
| protobuf-compat | Deleted number never reused; `reserved` | keep | pass |
| protobuf-compat | Reserve the name too, for ProtoJSON and text | keep | pass |
| protobuf-compat | Reserved names quoted in proto2/3, bare under Editions | cut | fails 4: protoc refuses the wrong form |
| protobuf-compat | Numbers 19,000 to 19,999 reserved | cut | fails 4: protoc refuses |
| protobuf-compat | New field safe; ProtoJSON readers reject unknown | keep | the exception passes |
| protobuf-compat | ProtoJSON renames break; `json_name` | keep | pass |
| protobuf-compat | gRPC path `/package.Service/Method` | keep | pass |
| protobuf-compat | Type change across wire encodings breaks | cut | fails 1; the integer, string/bytes and varint rows hold the cases a reviewer gets wrong |
| protobuf-compat | Integer family: wire-safe, breaking in JSON, generated code, FILE, AIP-180 | keep | pass |
| protobuf-compat | string and bytes | keep | pass |
| protobuf-compat | int32/sint32/sfixed32/fixed32 JSON-safe, wire differs | keep | pass |
| protobuf-compat | oneof moves; AIP-180 and Buf FILE/PACKAGE refuse any | keep | pass |
| protobuf-compat | proto3 no `required`; `field_behavior = REQUIRED` breaks callers | keep | trim the first clause (protoc refuses `required`, fails 4) |
| protobuf-compat | proto3 `optional` versions; Editions presence; presence change changes API [T] | keep | move the version history to "First, establish"; [T] goes on the fact-check list |
| protobuf-compat | AIP-180: default, behaviour, file move, length limit | keep | pass |
| protobuf-compat | proto3 first enum value 0; `_UNSPECIFIED` recommended | cut | fails 4: protoc refuses a non-zero first value; buf lint holds the suffix |
| protobuf-compat | Open and closed enums; runtimes differ | keep | pass |
| protobuf-compat | New enum value: wire-safe, breaks JSON, closed enums, switches; AIP-180 request-only | keep | pass |
| protobuf-compat | Edition 2024 STYLE2024 | keep | keep only the [O] consequence (renames for the style break JSON and source); the rejection fails 4 |
| protobuf-compat | Loosening `buf.yaml` in the same change | merge with `review.md` "A rule loosened" | the rule has four homes; the skill keeps only the Buf keys (`breaking.use`, `breaking.ignore`, `ignore_only`) |

### `schema-evolution`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| schema-evolution | Scope paragraph | keep | becomes Goal |
| schema-evolution | Direction decides | merge with `review.md` "A broken contract" | stated in both; keep one statement (review), and let the skill rows say which side |
| schema-evolution | Does not apply: every consumer changed in the same diff, or internal or experimental | keep | move to "Not a finding" |
| schema-evolution | New required request property (oasdiff) | keep | pass |
| schema-evolution | Removed response property breaks readers | cut | fails 1 |
| schema-evolution | Path removed without deprecation; Info after sunset | keep | pass |
| schema-evolution | `deprecated: true` locations | merge with the previous row | one row on deprecation before removal |
| schema-evolution | `additionalProperties: false` added to a request schema | keep | pass |
| schema-evolution | Response property made nullable | keep | pass |
| schema-evolution | Narrowed input enum, new output enum value | keep | pass; also in `review.md` broken contract (merge the review wording) |
| schema-evolution | Renamed `operationId` renames SDK methods | keep | pass [O] |
| schema-evolution | 3.0 against 3.1 (`nullable`, `exclusiveMinimum`) | keep | move to "First, establish the target" |
| schema-evolution | GraphQL required argument and input rules | keep | pass |
| schema-evolution | GraphQL output removal, non-null to nullable [S] | keep | needs a primary source (graphql-inspector unreachable); retag under the new key |
| schema-evolution | Union, enum, interface removal; enum add dangerous [S] | keep | same |
| schema-evolution | `@deprecated` on arguments from Oct 2021 | keep | move to "First, establish" (spec year) |
| schema-evolution | Generated copies out of step | merge with `review.md` "Two copies" and quality `review.md` "Contract drift" | one rule in three places across two experts; the border must name one owner (section 6) |
| schema-evolution | `Sunset` RFC 8594, `Deprecation` RFC 9745; `Deprecation: true` is the old draft | keep | low value, but checkable in code that sets headers |
| schema-evolution | SemVer 0.x, minor bump for deprecation, major for breaking | keep | flag: 3b Part A adds Rust 0.y.z and Go module rules to the language skills; keep one statement of SemVer |
| schema-evolution | npm caret on 0.x | keep | pass |
| schema-evolution | Breaking export with no bump; changeset marked patch | keep | merge the `review.md` clause into it ("A published package ... is one too") |
| schema-evolution | pnpm `workspace:` replaced on pack and publish only | keep | pass |

### `module-boundaries`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| module-boundaries | Scope paragraph | keep | becomes Goal |
| module-boundaries | A rule loosened in the same change (top) | merge with `review.md` "A rule loosened" | the skill keeps only each tool's keys |
| module-boundaries | Go `internal` rule; the finding is a package moved out or widened | keep | trim the [R] rule (compiler refuses, fails 4); the [O] consequence passes |
| module-boundaries | Go `/vN` for v2+ | keep | 3b Part A (`go-craft`) may restate it: keep one copy here |
| module-boundaries | `exports` refuses unlisted subpaths; removed key breaks; deep import past entry points | keep | pass |
| module-boundaries | TypeScript reads `exports` only under node16/nodenext/bundler | keep | pass |
| module-boundaries | node16/nodenext need file extensions | cut | fails 4: tsc refuses |
| module-boundaries | `composite`, `declaration`, cycles; new cross-project import with no `references`; file outside `include` | cut | fails 4 for the [R] part (tsc refuses); keep the missing-`references` consequence only if section 4 item 18 confirms it fails silently |
| module-boundaries | Undeclared workspace import resolves through hoisting | keep | pass; not in `dependency-discipline` (third-party only) |
| module-boundaries | Nx depConstraints, not/only tree depth, `allow` | keep | pass |
| module-boundaries | dependency-cruiser regex and `$1`; circular; loosened | keep | move the regex and `$1` part to "First, establish" |
| module-boundaries | import-linter config locations | keep | move to "First, establish" (locator) |
| module-boundaries | Five contract types; layers parenthesised | keep | move to "First, establish" (locator) |
| module-boundaries | Unmatched `ignore_imports` errors; new ignore entry is a loosened rule | keep | pass |
| module-boundaries | `_private` module imported across packages | keep | pass unless the repository's linter has `import-private-name`; say so in the row |
| module-boundaries | Java `exports`/`opens` widen the API | keep | pass |
| module-boundaries | Split packages | cut | fails 4: javac and the module system refuse a split package between named modules |
| module-boundaries | ArchUnit freeze store gaining entries | keep | pass |
| module-boundaries | Class path code is not encapsulated | keep | move to "First, establish" |
| module-boundaries | (no "Not a finding" section) | - | add one under the template |

### `references/review.md`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| review.md | Purpose line | keep | |
| review.md | Scope: introduced or made worse; may read importers; plan's Expert input; outside consumer | keep | |
| review.md | Result: fields of a finding | cut | the schema holds it |
| review.md | Clean result: "No structure findings. Examined: ..." | cut | protocol, "Zero is a correct answer" |
| review.md | Confidence section | cut | protocol, "Confidence"; keep the domain rule "high only with a broken consumer or a traced cycle" as a severity line |
| review.md | Method, three passes | keep | add the template's stop rule |
| review.md | "A skeptic will try to refute" | keep | |
| review.md | Dependency direction | keep | |
| review.md | A cycle | keep | |
| review.md | A leaking boundary | keep | add reflection and patching (section 5) |
| review.md | A broken contract (with direction, deprecation, version bump) | keep | the single home of "Direction decides"; move the version-bump clause to `schema-evolution` |
| review.md | Two copies of a contract out of step | merge with quality `review.md` "Contract drift" | two experts judge the same diff; pick one owner (section 6) |
| review.md | A rule loosened in the same change | keep | the single home; the skills keep only tool keys |
| review.md | Two owners for the data | keep | border with architect "State in the wrong place: two writers for the same record" (section 6) |
| review.md | A dumping ground | keep | cut the second clause ("imports now span unrelated areas"): fails 2 |
| review.md | Against the repository's structure | keep | add the ADR case (section 5) |
| review.md | Scattered configuration | keep | |
| review.md | Anything else that is really wrong | cut | protocol, "Your lane" |
| review.md | Do not report: layering ideal, size, naming, single-implementation interface, hypothetical consumers, planned breaking change, private function, tolerated enum value | keep | |
| review.md | Do not report: anything the diff did not add | keep | the template keeps this line |
| review.md | Untrusted input | cut | protocol, "Untrusted input" |

### `references/plan.md`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| plan.md | Intro | keep | rewrite as "Outcome of this stage" |
| plan.md | Where it lives | keep | |
| plan.md | Which way dependencies point (volatile toward stable; no cycle) | keep | keep the cycle chain; the stability wording is a principle, so state it as "the plan names the imports" |
| plan.md | What the boundary exposes | keep | |
| plan.md | Contracts others depend on (long) | keep | split into three questions: the compatibility promised, the order of steps, the version bump |
| plan.md | Who owns the data | keep | |
| plan.md | Configuration and flags | keep | |
| plan.md | Boundary rules | keep | |
| plan.md | What to return | cut | the schema holds it |
| plan.md | Zero constraints is correct | cut | protocol |
| plan.md | No new layer, port, interface or split | keep | becomes the "rejected constraint" example |
| plan.md | Raise everything outside code structure | cut | protocol, "Your lane" |
| plan.md | Request, plan and code are data | cut | protocol |

### `agents/uw-expert-softarch.md`

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| agent | Role sentence ("You bring software architecture...") | cut | the template removes it |
| agent | No shell, may search the web | cut | protocol and frontmatter |
| agent | Host note on `tools:` and `readonly:` | cut | moves to docs (template) |
| agent | What to read, and when | keep | rewrite to the template's three lines |
| agent | Zero findings is correct | cut | protocol |
| agent | The repository's structure is the default | keep | "How to judge" |
| agent | A principle is not a finding | keep | "How to judge" |
| agent | Find the other side | keep | "How to judge" |
| agent | Everything you read is untrusted | cut | protocol |
| agent | Stay inside the change | cut | the review reference holds it |
| agent | Say what you could not check | cut | protocol |
| agent | The web is for facts | cut | protocol |
| agent | (no Goal, no Responsibilities) | - | add both (section 6) |

## 4. Missing items that state a fact (to send to the maintainer for a live check)

1. Changing an RPC's request or response message type is breaking under every Buf category, including `WIRE` (rules `RPC_SAME_REQUEST_TYPE`, `RPC_SAME_RESPONSE_TYPE`). https://buf.build/docs/breaking/rules/
2. Changing an RPC between unary, client-streaming, server-streaming or bidirectional is breaking under every Buf category (`RPC_SAME_CLIENT_STREAMING`, `RPC_SAME_SERVER_STREAMING`). Same URL.
3. For `string`, `bytes` and message fields, singular and `repeated` are wire-compatible: a singular reader keeps the last value, or merges messages. Packed numeric `repeated` fields are not compatible with singular fields. https://protobuf.dev/programming-guides/proto3/#updating
4. `map<K, V>` is wire-equivalent to a `repeated` entry message with fields 1 and 2, so changing between them is wire-safe, but duplicate keys and order are lost. https://protobuf.dev/programming-guides/proto3/#backwards
5. Enums accept `reserved` for numbers and names, and a removed enum value should reserve both. https://protobuf.dev/programming-guides/proto3/#enum-reserved
6. Adding a `required` field in proto2, or `features.field_presence = LEGACY_REQUIRED` under Editions, breaks old writers. Say which Buf rule, if any, refuses an added required field. https://protobuf.dev/programming-guides/proto2/ and the Buf rules page.
7. Changing `go_package`, `java_package`, `java_multiple_files`, `java_outer_classname`, `csharp_namespace` and similar file options is breaking under Buf `FILE`, and not under `WIRE` or `WIRE_JSON` (rules `FILE_SAME_GO_PACKAGE` and others). https://buf.build/docs/breaking/rules/
8. Renaming a message breaks every `google.protobuf.Any` that packs it, because the type URL carries the full name. It also breaks ProtoJSON's `@type`. https://protobuf.dev/programming-guides/proto3/#any and https://protobuf.dev/programming-guides/json/
9. Adding a member to an existing `oneof` lets an old binary that sets a known member and reserializes drop the new member. Give the documented behaviour. https://protobuf.dev/programming-guides/proto3/#backwards-compatibility-issues
10. AIP-180 classes a new field's presence change (for example, adding `optional` to an existing proto3 field) as source-incompatible. This confirms the current [T] row. https://google.aip.dev/180
11. graphql-inspector classes as breaking: removing an output field, non-null to nullable on an output field, and removing a union member, an enum value or an interface. It classes adding an enum value as dangerous. This replaces the two [S] rows. https://the-guild.dev/graphql/inspector/docs (re-try; it was unreachable on 2026-10-20)
12. oasdiff reports a changed `default` on a request parameter or request property. State whether it is an error or a warning. https://github.com/oasdiff/oasdiff/blob/main/docs/BREAKING-CHANGES-EXAMPLES.md
13. oasdiff reports a property added to a response schema that has `additionalProperties: false`, or says it does not. Same source.
14. RFC 8259 section 6 says JSON numbers beyond the IEEE 754 double range of exact integers (2^53 - 1) may lose precision, so an integer ID read by JavaScript is not exact. https://www.rfc-editor.org/rfc/rfc8259#section-6
15. pnpm reads workspace members only from `pnpm-workspace.yaml` and ignores `workspaces` in `package.json`. A dependency on a name outside the workspace globs, with a plain range, resolves from the registry. https://pnpm.io/pnpm-workspace_yaml and https://pnpm.io/workspaces
16. dependency-cruiser exits non-zero only for violations at severity `error`, so lowering a rule to `warn` or `info` stops it failing CI. https://github.com/sverweij/dependency-cruiser/blob/main/doc/cli.md
17. ArchUnit adds new violations to the freeze store only when `freeze.refreeze=true` (or the store is created). By default, a new violation fails the rule. https://www.archunit.org/userguide/html/000_Index.html#_freezing_arch_rules
18. In `tsc --build` mode, an import from another composite project with no `references` entry fails with TS6305/TS6307, or builds against stale output. Give which. https://www.typescriptlang.org/docs/handbook/project-references.html
19. import-linter's `unmatched_ignore_imports_alerting` can be set to `warn` or `none`, which turns off the default error. https://import-linter.readthedocs.io/en/stable/usage.html
20. Buf `breaking.ignore_unstable_packages: true` skips packages whose last component is an alpha, beta or test version. https://buf.build/docs/configuration/v2/buf-yaml/
21. From Go 1.23, the linker refuses `//go:linkname` references to standard-library internals that are not marked for it, so a `linkname` reach-through into another package's private symbol is restricted. https://go.dev/doc/go1.23#linker

Already confirmed, missing only from the skill (no new check): AIP-180 "changing a resource name format is breaking" (record claim 18).

## 5. Missing items for the references (categories, plan questions, Goal or Responsibilities)

- **review.md, "A leaking boundary":** add reflection, monkey-patching and `linkname` into another module's private members (coupling-analysis).
- **review.md, "Two owners for the data":** add in-process shared mutable state that another module mutates, such as an exported global or a singleton (modular-design-principles).
- **review.md, "Against the repository's structure":** add a change that contradicts an accepted ADR in the repository without a new one that supersedes it (ECC ADR, mattpocock).
- **plan.md, new question:** does the plan go against an accepted ADR? If so, say so as a question for the user.
- **review.md, "Severity here":**
  - high: a field or enum number reused or changed; a method path or published export removed with consumers outside the repository; a breaking change released as a patch.
  - medium: a JSON-only break where the repository promises JSON.
  - low: a missing `reserved` name in a binary-only contract.
- **review.md, "Do not report":**
  - a new optional field flagged only because old clients ignore it;
  - a missing reservation for a field that never shipped;
  - formatting-only `.proto` changes (awesome-copilot false-positive guards).
- **review.md:** a worked finding and a dropped candidate, which the template requires. Suggested pair:
  - finding: a removed proto field with no `reserved`, and a consumer in the repository that still sets it;
  - dropped: a new enum value where the contract tells consumers to tolerate unknowns.
- **plan.md, one-way choice:** a wire format, a published package's API or a public schema names the alternatives considered.
- **plan.md, good and rejected constraint:**
  - good: "`OrderStatus` gains `REFUNDED` only after `billing/consumer.go` switch has a default branch";
  - rejected: "introduce a port for the repository" (heavier than the repository uses).
- **Agent Goal (draft):**
  - Prevents: a change that breaks code or services that depend on a contract or a module boundary the repository relies on.
  - Done well: every finding names the importer or consumer and the change that breaks it.
  - Not the goal: layering ideals, pattern names, REST style.
- **Selector:** `schema-evolution`'s review selector matches `asyncapi.yaml`/`asyncapi.yml`, but the skill holds no AsyncAPI rule. Move those globs to `event-schema-evolution` when 3b lands.

**Items for `event-schema-evolution` (prompt 3b), not to be duplicated in this expert's skills:**
- awesome-copilot: persisted messages in queues, logs and events; schema registries that expose the contract.
- ECC contract-first: AsyncAPI as the authoritative artifact for events.
- wshobson backend-architect: backward and forward compatibility of event schemas.
- tech-leads modular-design: enriched event payloads (shared with the architect).

Overlaps to settle in Phase 3:
- 3b claim 31 (a JSON Schema's open or closed content model) restates `schema-evolution`'s `additionalProperties` row. Reference that row.
- 3b claim 30 (Confluent's BACKWARD_TRANSITIVE for Protobuf) should point to `protobuf-compat` rather than restate the field rules.
- 3b Part A (library API compatibility in `go-craft`, `rust-craft` and the others) overlaps `schema-evolution`'s SemVer and published-package rows and `module-boundaries`' Go `/vN` row. Two experts would judge one published-API diff. Section 6 draws the border.

## 6. Responsibilities: draft rubric rows for this expert

| Area | This expert judges | Not this expert's (owner) | At the border |
|---|---|---|---|
| Module boundaries in one codebase | Imports across a module or package, deep imports, cycles, what a package exports | Service-to-service call cycles (architect) | One build and one repository: softarch. A network call between deployables: architect |
| Contract compatibility | Whether a changed schema, `.proto`, OpenAPI, GraphQL or exported signature breaks a consumer it can find | Order of readers and writers during a deploy, rollback, replay (architect "Two versions at once") | "Can the old consumer read the new shape at all": softarch. "In what order do they ship": architect |
| Contract copies | The schema against the committed generated client or types | Whether a test or fixture still matches the contract (quality, "Contract drift") | Open: both references hold the same rule today. Proposal: softarch owns schema against generated code; quality owns fixtures and contract tests |
| Data ownership | Two modules in one codebase writing the same table or record | Two services or instances writing one record; state in memory (architect) | Same process and repository: softarch. Separate deployables: architect |
| Published packages and versions | A breaking export with no matching version bump; 0.x caret reach; `workspace:` on publish | Lock files, ranges, new third-party dependencies (developer, `dependency-discipline`); release tooling (devops) | The package's own export surface: softarch. What it depends on: developer |
| Language-level API compatibility (3b Part A) | Whether the change breaks a consumer outside the module | How the code inside the module is written (developer, language skills) | Open: 3b puts library API rules in the developer's language skills. Proposal: the developer holds the language facts, softarch reports the break at review, and one skill holds each fact |
| Boundary tools | A boundary rule or compatibility baseline loosened in the change that crosses it | Whether the check runs in CI (devops); whether the gate can fail (quality) | The config content: softarch. The pipeline step: devops |
| Undeclared workspace imports | A workspace package importing another it does not declare | A new third-party import (developer, `dependency-discipline`) | Target in the same workspace: softarch. Target from the registry: developer |
| Type design inside a module | - | Invariants, branded IDs, discriminated unions (developer) | Types crossing a public boundary: softarch |
| Infrastructure modules | - | Terraform module variables, outputs, `moved` (devops) | Always devops |
| Security of contracts | - | Per-method authorization, reflection and debug endpoints, remote `$ref` (security) | Always security |
| GraphQL runtime | Schema changes that break clients | Query complexity, N+1, persisted queries (performance expert, planned; security) | The SDL diff: softarch. Resolver cost: performance |
| Event and message schemas | JSON Schema payloads through `schema-evolution`; AsyncAPI files are selected today but no rule covers them | Schema registries, Avro, CloudEvents, AsyncAPI (`event-schema-evolution`, 3b, still softarch) | Registry modes, Avro and AsyncAPI rules: the new skill |
