# Protobuf and gRPC compatibility

Use this when a change touches a `.proto` file or the Buf configuration. It holds what decides whether existing producers, consumers and stored messages still work after the change. Rollout order, rollback and replay of stored messages are the architect's ("Two versions at once"); deadlines and retries are the architect's and `failure-handling`'s; authorization per method is security's.

Each fact carries its source: **[R]** the maintainer's check of protobuf.dev, buf.build, aip.dev and the gRPC repository (2026-10-20); **[T]** an upstream community skill, not checked; **[O]** our own reasoning.

**First, find which compatibility the repository promises.** The answer to "is this breaking" differs by target: the binary wire only, the wire plus ProtoJSON, or generated source code as well. Buf's categories, strictest first, are `FILE` (the default), `PACKAGE`, `WIRE_JSON` and `WIRE` [R]; Google's AIP-180 is as strict as `FILE` [R]. Read `buf.yaml` (`breaking.use`), check whether the service is exposed as JSON (gRPC-Gateway, `google.api.http`, ProtoJSON clients), and check whether generated code is published to other repositories. Also read the file's first line: `syntax = "proto2"`, `syntax = "proto3"` or `edition = "2023"` / `"2024"` changes several rules below [R].

## Field numbers and names

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Changing an existing field's number is unsafe [R] | The integer after `=` changes on an existing field | A message never merged, released or stored |
| A deleted field's number must never be reused; `reserved` makes protoc refuse reuse [R] | A field line removed with no `reserved` for its number | The same |
| Reserve the name as well, so ProtoJSON and text format still parse old messages [R] | A removed field whose name is not reserved, where JSON or text format is used | Binary-only contracts |
| Reserved names are quoted in proto2 and proto3 (`reserved "foo";`) and bare identifiers under Editions (`reserved foo;`) [R] | The wrong form for the file's syntax | |
| Numbers 19,000 to 19,999 are reserved for the implementation [R] | A new field in that range | |
| A new field with a new number is safe: old binaries keep it as an unknown field [R] | | ProtoJSON readers reject unknown fields unless told to ignore them [R] |
| ProtoJSON writes field and enum value names into the message, so renaming either breaks JSON readers; `json_name` can keep the old name [R] | A renamed field or enum value on a service with JSON clients, with no `json_name` | Binary-only contracts (Buf `WIRE`) |
| A gRPC method's path is `/package.Service/Method` [R] | A renamed package, service or method: every existing client calls a path that no longer exists | A REST path through `google.api.http` that stays the same, for clients that only use it |

## Types and cardinality

- A type change across wire encodings, such as `string` to `int32`, breaks deserialization [R].
- `int32`, `uint32`, `int64`, `uint64` and `bool` are compatible on the binary wire, and a narrower reader truncates [R]. The same change is **breaking** in ProtoJSON (64-bit integers are JSON strings, 32-bit ones numbers), in generated code, under Buf `FILE` and `WIRE_JSON`, and under AIP-180 [R]. Report it unless the repository's target is `WIRE`.
- `string` and `bytes` are compatible on the wire while the bytes are valid UTF-8, and unsafe in ProtoJSON, where bytes are base64 [R].
- `int32`, `sint32`, `sfixed32` and `fixed32` are safe to swap in ProtoJSON, but varint and fixed-width types differ on the binary wire [R]. The same holds for the 64-bit family.
- Moving fields into an existing `oneof` is unsafe; moving a single field into a new `oneof` is wire-safe [R]. AIP-180 and Buf `FILE` and `PACKAGE` disallow any move into or out of a `oneof`, because generated accessors change [R].
- proto3 has no `required` [R]; a request field newly marked required (`google.api.field_behavior = REQUIRED`) breaks callers that do not send it, under AIP-180 [R].
- proto3 `optional` (explicit presence) is on by default from protoc 3.15, experimental from 3.12 [R]. Under Editions `optional` is not a keyword: explicit presence is the default, and `features.field_presence = IMPLICIT` turns it off [R]. Adding or removing presence changes the generated API [T].
- Changing a default value or an existing behaviour, moving a definition to another file, or tightening a length limit are breaking under AIP-180 [R]. Moving between files breaks generated imports under Buf `FILE` [R].

## Enums

- A proto3 enum's first value must be 0; a `_UNSPECIFIED` name for it is recommended [R]. Closed enums (proto2, or `features.enum_type = CLOSED`) have no such rule [R].
- proto3 enums are open and proto2 enums closed; runtimes differ (Go treats every enum as open, Dart every enum as closed) [R].
- A new enum value is wire-compatible for open enums [R]. It can still break a ProtoJSON reader, a closed enum, or consumer code that switches over the enum with no default branch [R]. AIP-180 calls a new value in a request-only enum compatible and asks for caution in response enums [R]. Find a consumer's `switch` before reporting.

## Editions

- Edition 2024 enforces a naming style by default (`STYLE2024`), so protoc rejects names such as `bar_1`; `features.enforce_naming_style = STYLE_LEGACY` keeps old names [R]. A file moved to Edition 2024 that renames fields to satisfy the style breaks JSON and source compatibility [O].

## Configuration

- Loosening `buf.yaml` in the same change that a stricter rule would reject (a weaker `breaking.use` category, a new `breaking.ignore` or `ignore_only` entry for the changed file) hides the break instead of handling it [O]. Report it with the rule it silences.
