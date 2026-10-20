# Software architect fact-check, round 2, 2026-10-20

The maintainer's live check of round-2 prompt 4 (`docs/research/fact-check-round-2-prompts.md`), with open web access. Item numbers are the software architect ledger's (`docs/experts/ledgers/softarch.md`, section 4). It is the record behind the round-2 rows of `protobuf-compat`, `schema-evolution` and `module-boundaries`. Facts are restated in the skills, not copied. Round 1 is `softarch-2026-10-20.md`.

## Results

| # | Claim | Status | Source |
|---|---|---|---|
| 1 | Buf `RPC_SAME_REQUEST_TYPE` and `RPC_SAME_RESPONSE_TYPE` are in all four categories | confirmed; packages ignored as unstable are the exception | buf.build breaking rules |
| 2 | Adding or removing `stream` on an RPC is breaking in all four categories | confirmed | same |
| 3 | Singular and `repeated` are wire-compatible for `string`, `bytes` and messages; packed numeric repeated fields are not | confirmed; the change still breaks ProtoJSON (`FIELD_WIRE_JSON_COMPATIBLE_CARDINALITY`) and generated code (`FIELD_SAME_CARDINALITY`) | protobuf.dev proto3 |
| 4 | `map<K, V>` is wire-equivalent to `repeated` entry messages with fields 1 and 2; maps may reorder and drop duplicate keys | confirmed; breaking in ProtoJSON (object, not array) and generated code | same |
| 5 | Removing an enum value: reserve its number and its name (ranges and `max` allowed) | confirmed | same |
| 6 | `required` (proto2, Editions `LEGACY_REQUIRED`) | confirmed, and Buf adds: never add `required`, and treat existing required fields as permanent; the cardinality rules refuse a change to or from it | buf.build breaking rules |
| 7 | Buf file-option rules (`FILE_SAME_GO_PACKAGE`, `..._JAVA_PACKAGE`, `..._CSHARP_NAMESPACE` and peers) | **different**: in both `FILE` and `PACKAGE`, not `FILE` alone; not in `WIRE` or `WIRE_JSON` | same |
| 8 | `Any` stores the type URL `type.googleapis.com/<package>.<message>`, and ProtoJSON writes it as `@type`, so renaming a packed message or its package breaks unpacking | confirmed | protobuf.dev proto3 |
| 9 | Adding or removing `oneof` members: `NOT_SET` cannot tell unset from a member another version knows; tag reuse can clear the set member | confirmed; one existing field moved into a new `oneof` is wire-safe, not source-safe | same |
| 10 | Adding or removing proto3 `optional` on an existing field is incompatible (AIP-149, by way of AIP-180) | confirmed: it changes the generated source API | google.aip.dev/149 |
| 11 | GraphQL Inspector rule codes | **partly found**: three levels (non-breaking, dangerous, breaking), a removed field is breaking and fails CI, an added enum value is dangerous; the per-rule page was not reached. `considerUsage` and related rules relax it | the-guild.dev inspector diff |
| 12 | oasdiff on a changed `default` | **different**: on a request *parameter* it is breaking (error); on a request *body property* it is info. No default check applies to a required field | oasdiff.com checks |
| 13 | oasdiff: an added required response property is breaking, an added optional one is info | confirmed; no rule makes an added property breaking because the old schema had `additionalProperties: false`, though a client validating against its old copy rejects it | oasdiff.com breaking changes |
| 14 | RFC 8259: integers are interoperable only within +/-(2^53 - 1) | confirmed; ProtoJSON writes 64-bit integers as strings | RFC 8259 section 6 |
| 15 | pnpm reads members only from `pnpm-workspace.yaml` | **different by version**: true while that file exists (pnpm warns when `package.json` `workspaces` differs); from pnpm 12.7.0, `pnpm install` creates it from `workspaces` when absent. A plain range to an unmatched package resolves from the registry; `workspace:` refuses to | pnpm.io workspaces |
| 16 | dependency-cruiser's exit code is the number of `error` violations; `warn` and `info` exit 0 | confirmed | dependency-cruiser CLI docs |
| 17 | ArchUnit `FreezingArchRule` fails on a new violation unless `freeze.refreeze=true` (default false) | confirmed; in CI also set `freeze.store.default.allowStoreCreation=false` | archunit.org user guide |
| 18 | TypeScript composite projects: every implementation file included; a missing `references` entry fails | confirmed for the behaviour; the error codes TS6307 and TS6305 come from a **secondary** page | typescriptlang.org project references |
| 19 | import-linter `unmatched_ignore_imports_alerting` defaults to `error`; `warn` and `none` weaken it | confirmed (the docs moved to `contract_types/`) | import-linter docs |
| 20 | Buf `ignore_unstable_packages` skips last components `v\d+test.*`, `v\d+(alpha|beta)\d*`, `v\d+p\d+(alpha|beta)\d*` | confirmed | buf.yaml v2 reference |
| 21 | Go 1.23: the linker refuses `//go:linkname` to standard-library symbols not marked for it | confirmed; `-ldflags=-checklinkname=0` bypasses it, and linkname between user packages is not blocked | go.dev 1.23 notes |

Extra facts from the same pages:

- `buf.yaml` v2 allows `// buf:lint:ignore` comments by default (`disallow_comment_ignores: false`); v1 did not (`allow_comment_ignores: false`). Upgrading v1 to v2 turns comment ignores on.
- AIP-180: moving a message, enum or service to another file in the same package is wire-compatible but breaks generated imports in C++ and Python; Buf `FILE` flags it, `PACKAGE` does not.
- AIP-180: adding a name close to an existing one (`foo_value` beside `foo`) can collide in generated code. The reply's `_bytes` and `_count` suffixes are its own extension, not quoted.
- AIP-149: `google.api.field_behavior = REQUIRED` and proto3 `optional` are unrelated and may be used together; not a contradiction.
- oasdiff: widening a response constraint (`maxProperties` raised, `exclusiveMaximum` unset, `multipleOf` changed) is breaking; narrowing one is not.
- pnpm 11 and later ignore the `pnpm` field in `package.json`; settings belong in `pnpm-workspace.yaml`.
- pnpm `linkWorkspacePackages` (default true): a plain range links the local package only while its version satisfies the range, and silently falls back to the registry otherwise.
- TypeScript: without `noEmitOnError`, `tsc` emits outputs despite errors, so an incremental build treats a broken dependency as up to date.
- import-linter `forbidden` contracts see external packages only with `include_external_packages = True`, and then only root-level names (`django`, not `django.db.models`).

## Our assessment of the reply

- Strong overall: every item but 11 and part of 18 rests on the vendor's page.
- The pnpm 11 and 12.7.0 version claims are recent and specific; the skills cite them with the version, so a reviewer checks `packageManager` first.
- Some exceptions are not exceptions (items 2 and 5 "unreleased", item 19 "transitional branches"): they are the general rule that unpublished work is out of scope. Not carried into the skills.
- Version axes the reviewer must check: `buf.yaml` v1 or v2; the pnpm version in `packageManager` (below 11, 11, 12.7.0 and later); the Go toolchain for `linkname`.

## Changes this drives (Phase 3)

- `protobuf-compat`: items 1 to 10 and 20, the file-option rules in `FILE` and `PACKAGE` (7), and the AIP-180 and AIP-149 extras.
- `schema-evolution`: items 12 to 14 and the oasdiff response-constraint extra; item 11 only as far as it was found.
- `module-boundaries`: items 15 to 19 and 21, and the pnpm, TypeScript and import-linter extras.
