---
name: event-schema-evolution
description: Use when a change changes an event or message schema that is persisted or consumed later - Avro schemas, a schema registry's compatibility mode (Confluent, AWS Glue), JSON Schema payloads in a registry, CloudEvents attributes, or an AsyncAPI document.
verified: 2026-10-20
requires: Avro 1.9+ for enum defaults; AsyncAPI 2.x or 3.x
---

# Event and message schema evolution

## Goal

- **Lets the expert catch:** an event schema change that a stored or in-flight message, or a consumer that has not upgraded, cannot read, judged against the compatibility mode the registry actually enforces.
- **Applies to:** `*.avsc`, `*.avdl`, `asyncapi.*`, schema registry configuration, CloudEvents producers and consumers.
- **Not for:** protobuf field rules (`protobuf-compat`); OpenAPI and GraphQL (`schema-evolution`); which version ships first, replay and queued messages during a rollout (architect); fixtures and contract tests (quality).

Sources: **[R]** the maintainer's live check of the Confluent schema-evolution documentation, the Avro 1.10 and 1.11 specifications, the AWS Glue Schema Registry documentation, the CloudEvents specification and asyncapi.com (2026-10-20); **[O]** our own reasoning. An [O] item is a prompt to check, not a finding on its own.

## First, establish the target

- **The registry and its mode.** Confluent modes are `BACKWARD` (the default), `BACKWARD_TRANSITIVE`, `FORWARD`, `FORWARD_TRANSITIVE`, `FULL`, `FULL_TRANSITIVE` and `NONE`; Kafka Streams supports only `BACKWARD` [R]. AWS Glue Schema Registry defaults to `BACKWARD`; `DISABLED` blocks new versions, `NONE` allows them unchecked [R]. Read the subject's configured mode, not the default.
- **Transitive or not.** A non-transitive mode checks against the latest version only, a transitive one against all; a diff alone cannot show a transitive violation [R], so say what you could not check.
- **Versions.** Avro before or after 1.9 (enum defaults); AsyncAPI 2.x or 3.x; whether Confluent data contracts (`compatibilityGroup`) are in use.
- **For a JSON Schema payload,** whether the model is open or closed (`additionalProperties`), which `schema-evolution` holds.
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## Registry modes

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| `BACKWARD`: a new consumer reads old data, so fields may be deleted and optional fields added, and consumers upgrade first [R] | A required field added, or a type changed, under `BACKWARD` | A consumer that rewinds past the previous version needs the transitive mode [R] |
| `FORWARD`: an old consumer reads new data, so fields may be added and optional fields deleted, and producers upgrade first [R] | A required field deleted under `FORWARD` | |
| For protobuf in a registry, `BACKWARD_TRANSITIVE` is the recommended mode [R] | A protobuf subject moved to a weaker mode | Field rules themselves are `protobuf-compat`'s |
| A mode weakened (`NONE`, `DISABLED`, a non-transitive mode) in the same change as the schema edit it would have refused hides the break [O] | The subject's compatibility setting changed beside a schema change | The plan records it as the user's decision |

## Avro

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A reader field missing from the writer's schema needs a default [R] | A field added with no `default` | |
| Renames resolve only through the reader's `aliases`, so an alias rename is backward- but not forward-compatible [R] | A field or record renamed under `FORWARD` or `FULL` | `BACKWARD` with the alias added |
| An unknown enum symbol is an error unless the reader's enum has a `default` (1.9 and later) [R] | A symbol added to an enum whose readers have no `default` | Readers on 1.9+ with a `default` |
| Type promotions (`int` to `long`, `float` or `double`, `string` to `bytes` and back) are reader-side only; under `FULL` a numeric promotion fails the forward half, and only `string` and `bytes` go both ways [R] | A numeric type widened under `FULL` | `BACKWARD` |
| A union field's default must match the union's first branch, and a default does not make a field optional when writing [R] | `["string", "null"]` with `"default": null` | |

## CloudEvents and AsyncAPI

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| `dataschema` points at the payload's schema, and an incompatible change should change that URI [R] | A breaking payload change with the same `dataschema` | |
| `type` is used for routing; its format is the producer's and may carry a version, so changing `type` stops consumers that filter on it [R] | A changed `type` string | No consumer filters on it |
| In AsyncAPI 2.x `schemaFormat` sits on the message; in 3.x inside the payload (Multi Format Schema Object) [R] | A 2.x document edited with 3.x placement, or the reverse | |

## Not a finding

- A new optional field with a default, under `BACKWARD`.
- A schema edit in a subject whose mode is `NONE` by the plan's decision, with every consumer changed in the same diff.
- Formatting or documentation fields (`doc`) in an Avro schema.
