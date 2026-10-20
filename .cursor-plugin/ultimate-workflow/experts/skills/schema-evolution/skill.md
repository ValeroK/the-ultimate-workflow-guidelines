# Schema evolution: OpenAPI, JSON Schema, GraphQL and published packages

Use this when a change touches an HTTP API description, a JSON Schema, a GraphQL schema, or the public API of a package that other repositories install. It holds what decides whether an existing client still works. REST naming and style, idempotency and rate limits (the architect's), and protobuf (`protobuf-compat`) are not here.

Each fact carries its source: **[R]** the maintainer's check of the specifications and tool documentation (spec.openapis.org, json-schema.org, spec.graphql.org, oasdiff, semver.org, rfc-editor.org, the npm and pnpm docs; 2026-10-20); **[S]** found only in a secondary source; **[O]** our own reasoning.

**Direction decides.** Tightening what the provider accepts breaks callers; loosening what it returns breaks readers [O]. So the same edit (making a property required, adding an enum value, allowing null) is breaking on one side and safe on the other. Say which side the changed field is on.

**Does not apply** when every consumer is in this repository and is changed or regenerated in the same diff, or the repository marks the operation or type as internal or experimental.

## OpenAPI and JSON Schema

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A request property that becomes required breaks callers that omit it; oasdiff classifies it as breaking [R] | A name added to a request schema's `required` list, or a new required parameter | It has a default the server applies |
| A removed response property breaks readers [R] | A property deleted under a response schema | |
| A path or operation removed without earlier deprecation is breaking; oasdiff treats removal after `deprecated: true` and a passed sunset date as informational [R] | A deleted path or operation with no `deprecated: true` in an earlier release | |
| Operations, parameters, headers and schemas take `deprecated: true` [R] | A removal where the repository deprecates first elsewhere and did not here [O] | |
| An object without `additionalProperties` accepts properties it does not list [R] | `additionalProperties: false` (or `unevaluatedProperties: false`) added to a request schema: callers that send extra fields now fail [O] | Response schemas |
| A response property that may now be null breaks readers that assume a value [O] | `nullable: true` added in OpenAPI 3.0, or `"null"` added to `type` in 3.1 [R] | Request schemas |
| A narrowed input enum, or a new output enum value, breaks the side that switches over it [O] | `enum` edited on a request or response schema | |
| A renamed `operationId` changes method names in generated SDKs [O] | `operationId` edited | No generated client |

OpenAPI 3.0 has `nullable: true` and does not allow `"null"` as a type; 3.1 removes `nullable` in favour of type arrays. 3.0 writes `exclusiveMinimum` as a boolean beside `minimum`; 3.1 as a number [R]. Read the root `openapi:` field before reporting either form as wrong.

## GraphQL

- An argument or input field is required when its type is non-null and it has no default [R]. Changing one from nullable to non-null without a default breaks callers that omit it; the reverse is compatible [R]. A new non-null argument with a default may be omitted, but an explicit `null` is still rejected [R].
- Removing an output field, or changing one from non-null to nullable, breaks clients; nullable to non-null does not [S].
- Removing a union member, an enum value or an interface from an object type is breaking; adding an enum value is "dangerous" because clients may switch over it [S]. An enum used only as input can gain values safely [S].
- From the October 2021 specification, `@deprecated` may be placed on arguments and input fields as well as fields and enum values [R]. Tooling on the June 2018 specification rejects it there [R].

## Generated copies

- A schema changed while the committed generated client, types or SDK stay as they were, or the reverse, leaves two copies of the contract out of step [O]. A hand-written type that duplicates a generated one is a second copy [O].

## Deprecation over HTTP

- The `Sunset` header is defined in RFC 8594 and the `Deprecation` header in RFC 9745, which gives it a date form (`@<epoch-seconds>`) [R]. A `Deprecation: true` value follows an older draft, not the RFC [O].

## Published packages and versions

- Under SemVer, major version zero means anything may change and the API is not stable, and from 1.0 deprecating something needs at least a minor bump [R]; a breaking change needs a major bump [O, SemVer item 8, not part of the check].
- npm's `^0.2.3` allows `<0.3.0` and `^0.0.3` allows only `0.0.3` [R]. So in a 0.x package, a breaking change released as a patch reaches every consumer on a caret range [R].
- A breaking change to an exported function, type or entry point of a published package (not `"private": true`) with no matching version bump, or a changeset marked patch for a removed export, is a finding [O].
- pnpm replaces `workspace:` ranges with real versions on `pnpm pack` and `pnpm publish`; a plain `npm publish` does not, and ships a broken manifest [R].
