---
name: schema-evolution
description: Use when a change changes an HTTP API description (OpenAPI), a JSON Schema or a GraphQL schema that other code or services read: what breaks callers or readers, deprecation before removal, and generated copies.
verified: 2026-10-20
requires: OpenAPI 3.0 or 3.1; GraphQL June 2018 or October 2021 specification
---

# Schema evolution: OpenAPI, JSON Schema and GraphQL

## Goal

- **Lets the expert catch:** a schema edit that breaks an existing caller or reader, judged on the side the changed field is on, including the edits oasdiff or a GraphQL diff tool classifies differently from what a reviewer expects.
- **Applies to:** `openapi.*`, `swagger.*`, `*.schema.json` and other JSON Schema files, `*.graphql`, `*.graphqls`, `*.gql`.
- **Not for:** protobuf (`protobuf-compat`); event payloads in a registry, Avro, CloudEvents and AsyncAPI (`event-schema-evolution`); a published package's version bump (developer); REST naming, idempotency and rate limits (architect); fixtures and contract tests (quality); remote `$ref` and per-method authorization (security).

Sources: **[R]** the maintainer's live check of the specifications and tool documentation (spec.openapis.org, json-schema.org, spec.graphql.org, graphql.org, oasdiff.com, rfc-editor.org; 2026-10-20); **[T]** a third-party summary, not checked; **[O]** our own reasoning. A [T] or [O] item is a prompt to check, not a finding on its own.

## First, establish the target

- **The OpenAPI version,** from the root `openapi:` field. 3.0 has `nullable: true` and no `"null"` type; 3.1 uses type arrays. 3.0 writes `exclusiveMinimum` as a boolean beside `minimum`, 3.1 as a number [R]. Do not report either form as wrong for the other version.
- **The GraphQL specification year.** From October 2021, `@deprecated` may sit on arguments and input fields; tooling on June 2018 rejects it there [R].
- **Which side each changed schema is on:** request (what callers send) or response (what readers receive). The same edit breaks one side and not the other.
- **Who consumes it,** and whether they are in this repository and changed in the same diff.
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## OpenAPI and JSON Schema

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A request property or parameter that becomes required breaks callers that omit it; oasdiff calls it breaking [R] | A name added to a request schema's `required`, or a new required parameter | It has a default the server applies |
| A changed `default` on a request **parameter** is breaking (oasdiff: error); on a request **body property** it is info [R] | `default:` edited on a parameter | The parameter is required, so its default is never used [R] |
| A path or operation removed without earlier deprecation is breaking; after `deprecated: true` and a passed sunset date oasdiff reports it as info [R] | A deleted path or operation with no `deprecated: true` in an earlier release, where the repository deprecates first elsewhere | |
| An object without `additionalProperties` accepts properties it does not list [R] | `additionalProperties: false` (or `unevaluatedProperties: false`) added to a request schema: callers sending extra fields now fail [O] | Response schemas |
| An added required response property is breaking; an added optional one is info in oasdiff, but a client that validates responses against its old copy of a schema with `additionalProperties: false` rejects it [R] | A property added to a response schema whose clients validate strictly | Clients that ignore unknown properties |
| Widening a response constraint (`maxProperties` raised, `exclusiveMaximum` unset, `multipleOf` changed, a maximum raised or removed) is breaking; narrowing one is not [R] | A loosened limit on a response schema | Request schemas, where loosening is the safe direction |
| A response property that may now be null breaks readers that assume a value [O] | `nullable: true` (3.0) or `"null"` in `type` (3.1) added on a response | Request schemas |
| A narrowed input enum breaks callers; a new output enum value breaks readers that switch over it [O] | `enum` edited on a request or response schema | A reader with a default branch |
| JSON integers are interoperable only within +/-(2^53 - 1), so a 64-bit id or timestamp typed as a JSON number loses precision in JavaScript readers [R] | `type: integer` with `format: int64` (or a 64-bit struct field) newly exposed as a JSON number | The value is serialised as a string |
| A renamed `operationId` renames methods in generated SDKs [O] | `operationId` edited | No generated client |

## GraphQL

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| An argument or input field is required when its type is non-null with no default; nullable to non-null without a default breaks callers, the reverse is safe; a new non-null argument with a default may be omitted, but an explicit `null` is still rejected [R] | `String` to `String!` on an argument or input field | A default is given and no caller sends `null` |
| Removing an output field is breaking and fails GraphQL Inspector by default; adding an enum value is "dangerous", because clients may switch over it [R] | A field deleted from a type; a value added to an output enum | Inspector run with `considerUsage` and usage data showing no client queries it |
| Changing an output field from non-null to nullable, or removing a union member, an enum value or an interface from a type, breaks clients [T] | The SDL edit | An enum used only as input can gain values [T] |

## Generated copies and deprecation headers

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A schema changed while the committed generated client, types or SDK stay as they were, or the reverse, leaves two copies out of step; a hand-written type duplicating a generated one is a second copy [O] | The schema file and the generated directory not both in the diff | Generated code built in CI and not committed |
| `Sunset` is RFC 8594 and `Deprecation` is RFC 9745, with a date form (`@<epoch-seconds>`); `Deprecation: true` follows an older draft [R] | Code that sets `Deprecation: true` | |

## Not a finding

- Every consumer is in this repository and is changed or regenerated in the same diff.
- The operation or type is marked internal or experimental by the repository's own convention.
- A new optional request property, or a new optional response property for readers that ignore unknown properties.
- Formatting, key order or description text in a schema file.
