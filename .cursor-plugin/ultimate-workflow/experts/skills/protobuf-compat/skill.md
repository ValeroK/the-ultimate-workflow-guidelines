---
name: protobuf-compat
description: Use when a change changes a .proto message, enum or service, or the Buf configuration: field numbers, reserved, types, cardinality, oneofs, enums, renames, RPC signatures, and which compatibility the repository promises.
verified: 2026-10-20
requires: proto2, proto3 or Editions 2023/2024; Buf v1 or v2 configuration
---

# Protobuf and gRPC compatibility

## Goal

- **Lets the expert catch:** a `.proto` change that breaks existing producers, consumers or stored messages on the encoding the repository actually promises (binary wire, ProtoJSON, or generated code), including the changes that look safe on one encoding and break another.
- **Applies to:** `.proto` files, `buf.yaml`, `buf.gen.yaml`, `buf.lock`.
- **Not for:** rollout order, rollback and replay of stored messages (architect); deadlines and retries (architect, `failure-handling`); per-method authorization and reflection endpoints (security); fixtures and contract tests (quality).

Sources: **[R]** the maintainer's live check of protobuf.dev, buf.build, aip.dev and the gRPC repository (2026-10-20); **[O]** our own reasoning. An [O] item is a prompt to check, not a finding on its own.

## First, establish the target

- **The compatibility promised.** Buf's categories, strictest first: `FILE` (the default), `PACKAGE`, `WIRE_JSON`, `WIRE` [R]; AIP-180 is as strict as `FILE` [R]. Read `breaking.use` in `buf.yaml`, check whether the service is exposed as JSON (gRPC-Gateway, `google.api.http`, ProtoJSON clients), and whether generated code is published to other repositories.
- **The syntax.** The file's first line: `syntax = "proto2"`, `syntax = "proto3"` or `edition = "2023"` / `"2024"`. proto3 `optional` is on by default from protoc 3.15 [R]; under Editions `optional` is not a keyword, explicit presence is the default, and `features.field_presence = IMPLICIT` turns it off [R].
- **What Buf already skips.** `breaking.ignore_unstable_packages: true` skips packages whose last component is `v1alpha1`, `v1beta`, `v1test`, `v1p1beta1` and the like [R]. In `buf.yaml` v2, `// buf:lint:ignore` comments are allowed unless `disallow_comment_ignores: true`; in v1 they were refused by default [R].
- protoc already refuses a reused `reserved` number, a field in 19,000 to 19,999, a non-zero first proto3 enum value and the wrong reserved-name form; do not report those.
- If you cannot establish the target, say which you assumed and lower your confidence by one step.

## Field numbers and names

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A deleted field's number must never be reused, and changing an existing field's number is a delete plus an add; `reserved` the number [R] | A field line removed, or its number changed, with no `reserved` for the old number | A message never merged, released or stored |
| Reserve the deleted name as well, so ProtoJSON and text format still parse old messages [R] | A removed field whose name is not in `reserved` | Binary-only contracts (`WIRE`) |
| A removed enum value reserves both its number and its name (ranges and `max` are allowed) [R] | An enum value line removed with no `reserved` in the enum | |
| A new field with a new number is safe on the wire [R] | | ProtoJSON readers reject unknown fields unless told to ignore them [R] |
| ProtoJSON writes field and enum value names, so renaming either breaks JSON readers; `json_name` keeps the old name [R] | A renamed field or enum value on a service with JSON clients, with no `json_name` | `WIRE` contracts |
| `google.protobuf.Any` stores the type URL `type.googleapis.com/<package>.<Message>`, and ProtoJSON writes it as `@type`, so renaming a packed message or its package breaks unpacking [R] | A renamed `message` or `package` whose type is packed into `Any` anywhere | Messages never packed into `Any` |
| A gRPC method's path is `/package.Service/Method` [R] | A renamed package, service or method | A REST path through `google.api.http` that stays the same, for clients that use only it |
| Moving a message, enum or service to another file in the same package is wire-safe but breaks generated imports in C++ and Python; Buf `FILE` flags it, `PACKAGE` does not [R] | A definition deleted from one file and added to another | The repository's target is `PACKAGE` or looser |
| A new name close to an existing one (`foo_value` beside `foo`) can collide in generated code [R] | A field or enum added whose name is an existing name plus a suffix | |

## RPC signatures

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Changing an RPC's request or response message type is breaking in every Buf category, `WIRE` included [R] | `rpc M(A) returns (B)` with `A` or `B` changed | A package Buf ignores as unstable |
| Adding or removing `stream` on either side is breaking in every category [R] | `stream` added to or removed from an `rpc` line | The same |

## Types and cardinality

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| `int32`, `uint32`, `int64`, `uint64` and `bool` swap safely on the binary wire, a narrower reader truncating, but the swap breaks ProtoJSON (64-bit integers are JSON strings), generated code, `FILE`, `WIRE_JSON` and AIP-180 [R] | An integer or `bool` field's type changed within that family | The target is `WIRE` |
| `string` and `bytes` swap on the wire while the bytes are valid UTF-8, and break ProtoJSON, where bytes are base64 [R] | `string` to `bytes` or back | `WIRE`, with UTF-8 guaranteed |
| `int32`, `sint32`, `sfixed32` and `fixed32` swap safely in ProtoJSON but differ on the binary wire (varint or fixed width); the same for the 64-bit family [R] | A change between varint and fixed-width types | A JSON-only service |
| Singular and `repeated` swap on the wire for `string`, `bytes` and messages (a singular reader keeps the last value or merges); packed numeric repeated fields (the proto3 default) do not; the swap breaks ProtoJSON and generated code (`FIELD_WIRE_JSON_COMPATIBLE_CARDINALITY`, `FIELD_SAME_CARDINALITY`) [R] | `repeated` added to or removed from an existing field | `WIRE`, for a string, bytes or message field |
| `map<K, V>` is wire-equivalent to `repeated` entry messages with fields 1 and 2, but maps may reorder and drop duplicate keys, and the swap breaks ProtoJSON (an object, not an array) and generated code [R] | A `repeated Entry` replaced by `map<K, V>` on the same number, or back | `WIRE`, when order and duplicates do not matter |
| Adding a member to a `oneof`, removing one, or moving fields into an existing `oneof` is unsafe: `NOT_SET` cannot tell "unset" from a member another version knows, and tag reuse can clear the set member [R]; AIP-180 and Buf `FILE` and `PACKAGE` refuse any move into or out of a `oneof` [R] | A field added to, removed from or moved into a `oneof` | One existing field moved into a new `oneof` is wire-safe (not source-safe) [R] |
| `required` (proto2, or `LEGACY_REQUIRED` under Editions) is never added, and an existing one is permanent; Buf's cardinality rules refuse a change to or from it [R] | `required` added, or removed from an existing field | |
| A request field newly marked `google.api.field_behavior = REQUIRED` breaks callers that do not send it (AIP-180) [R] | The annotation added to an existing request field | A field in a request type no caller sends yet |
| Adding or removing proto3 `optional` on an existing field changes the generated API, so it is incompatible (AIP-149) [R] | `optional` added to or removed from an existing proto3 field | The target is `WIRE` or `WIRE_JSON` |
| Changing a default value or an existing behaviour, or tightening a length limit, is breaking under AIP-180 [R] | A changed default, documented behaviour or limit | |

## Enums

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A new enum value is wire-safe for open enums, but can break a ProtoJSON reader, a closed enum, or consumer code that switches with no default branch; AIP-180 calls a new value in a request-only enum compatible and asks for caution in response enums [R] | A value added to an enum a consumer switches over | Find the consumer's `switch` before reporting; none, or a default branch, means no finding |
| proto3 enums are open and proto2 enums closed, and runtimes differ (Go treats every enum as open, Dart every enum as closed) [R] | A new value relied on by a Dart or proto2 consumer | |

## Configuration and Editions

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| The file options `go_package`, `java_package`, `java_multiple_files`, `java_outer_classname`, `csharp_namespace` and their peers are breaking under `FILE` and `PACKAGE` (not `WIRE` or `WIRE_JSON`) [R] | A changed file option at the top of a `.proto` | The target is `WIRE` or `WIRE_JSON` |
| A `buf.yaml` change in the same diff that would hide the break: a weaker `breaking.use`, a new `breaking.ignore` or `ignore_only` entry for the changed file, `ignore_unstable_packages` turned on, or a v1 to v2 upgrade with no `disallow_comment_ignores` [R] | Any of these beside a `.proto` change it would refuse | The plan records the loosening as the user's decision |
| A file moved to Edition 2024 that renames fields to satisfy `STYLE2024` breaks JSON and source compatibility; `features.enforce_naming_style = STYLE_LEGACY` keeps the old names [O] | `edition = "2024"` with field renames | |

## Not a finding

- A formatting-only `.proto` change.
- A new optional field flagged only because old clients ignore it.
- A missing reservation for a field that never shipped.
- `optional` together with `google.api.field_behavior = REQUIRED` on one field: they are unrelated (AIP-149) [R].
