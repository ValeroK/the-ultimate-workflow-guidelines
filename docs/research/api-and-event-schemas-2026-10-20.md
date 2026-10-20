# Library API and event schema fact-check, 2026-10-20

The maintainer's live check of prompt 3b (`docs/expert-research-prompts.md`), with open web access. It is the record behind the public-API sections of the developer's five language skills and the software architect's `event-schema-evolution` skill. Facts are restated in the skills, not copied.

## Results

| # | Claim | Status | Source |
|---|---|---|---|
| 1 | Go: a method added to an exported interface breaks outside implementers | confirmed; not when the interface already has an unexported method | pkg.go.dev apidiff |
| 2 | Go: a parameter added to an exported function breaks callers; use a new function, options or variadic | confirmed; even `func(int)` to `func(...int)` breaks a typed function variable | go.dev blog, module compatibility |
| 3 | Go: a new struct field breaks unkeyed literals, or comparability when the field is not comparable | confirmed | same |
| 4 | apidiff reports incompatible and compatible changes | confirmed; it ignores five edge cases (unkeyed literals, `unsafe.Sizeof`, embedding shadowing among them) | apidiff |
| 5 | Java: a changed return type is binary-incompatible (NoSuchMethodError) | confirmed; covariant overrides get a bridge method | JLS 21, 13.4.15 |
| 6 | Java: removing or narrowing a public member is binary-incompatible | confirmed; not when a superclass still declares the same member | JLS 13.4.7, 13.4.8, 13.4.12 |
| 7 | Java: an abstract method added to an interface is binary-compatible, breaks source; a default method does not | confirmed; a default can still collide (IncompatibleClassChangeError) | JLS 13.5 |
| 8 | Java: compile-time constants are inlined into callers | confirmed; not when initialised by a non-constant expression | JLS 13.4.9 |
| 9 | Java: a changed parameter type is a removed method plus a new one | confirmed; `T[]` to `T...` and same-erasure bound changes are exceptions | JLS 13.4.14 |
| 10 | japicmp and revapi report binary and source incompatibility | confirmed | japicmp site |
| 11 | TypeScript: a wider return type breaks consumers | confirmed | semver-ts.org formal spec |
| 12 | TypeScript: a narrower parameter type breaks consumers | confirmed | same |
| 13 | TypeScript: a required property added to a type users construct breaks them | confirmed; not for output-only types | same |
| 14 | TypeScript: dropping a supported compiler version is breaking | confirmed, under the package's declared support policy | semver-ts compiler considerations |
| 15 | api-extractor writes an `*.api.md` report | confirmed (`.api.ts` before version 7) | api-extractor.com |
| 16 | Rust: a public field added when all fields are public is major | confirmed | Cargo SemVer reference |
| 17 | Rust: a private field added when all fields are public is major | confirmed | same |
| 18 | Rust: a new variant without `#[non_exhaustive]` is major | confirmed; adding `#[non_exhaustive]` itself is major too | same |
| 19 | Rust: a trait item without a default is major; with a default, possibly breaking | confirmed; sealed traits are the exception | same |
| 20 | Cargo treats a change in `y` of `0.y.z` as major | confirmed; any change of `0.0.z` is major | same |
| 21 | cargo-semver-checks lints the public API against a baseline | confirmed | its repository |
| 22 | PEP 8: names without a leading underscore are public | **different**: documented interfaces are public; **undocumented ones are internal**; `__all__` declares the public API; internal names take a leading underscore | peps.python.org PEP 8 |
| 23 | `from module import *` takes only `__all__`, else names without a leading underscore | confirmed | Python language reference |
| 24 | PEP 387: DeprecationWarning for two minor versions before removal | confirmed (and at least two years); for CPython | PEP 387 |
| 25 | griffe finds breaking changes between versions | confirmed | griffe docs |
| 26 | Confluent compatibility types, BACKWARD default | confirmed; Kafka Streams supports only BACKWARD | Confluent schema evolution |
| 27 | BACKWARD: new consumer reads old data; delete fields, add optional ones; consumers first | confirmed; a consumer that rewinds past X-1 needs the transitive mode | same |
| 28 | FORWARD: old consumer reads new data; add fields, delete optional ones; producers first | confirmed | same |
| 29 | Non-transitive checks against the latest version, transitive against all | confirmed; a diff alone cannot show a transitive violation | same |
| 30 | Protobuf in the registry: BACKWARD_TRANSITIVE recommended | confirmed | same |
| 31 | JSON Schema compatibility depends on an open or closed content model | confirmed: under a closed model, adding an optional property is not forward-compatible and removing one is not backward-compatible | Confluent JSON Schema serdes |
| 32 | Avro: a reader field missing from the writer needs a default | confirmed | Avro 1.11 specification |
| 33 | Avro: renames resolve only through the reader's aliases | confirmed; so an alias rename is backward- but not forward-compatible | same |
| 34 | Avro: an unknown enum symbol errors unless the reader's enum has a default (1.9+) | confirmed; before 1.9 enums had no default | Avro 1.10 specification |
| 35 | Avro type promotions | confirmed; under FULL, numeric promotion fails the forward half (only string and bytes go both ways) | Avro 1.11 specification |
| 36 | AWS Glue Schema Registry modes, BACKWARD default | confirmed; DISABLED blocks new versions, NONE allows them unchecked | AWS Glue docs |
| 37 | CloudEvents `dataschema`; incompatible change should change the URI | confirmed | CloudEvents spec |
| 38 | CloudEvents `type` used for routing; format producer-defined, might include a version | confirmed as worded; changing `type` stops consumers that filter on it | same |
| 39 | AsyncAPI 3 payload schema format | confirmed; in 2.x `schemaFormat` sat on the message, in 3.x inside the payload (Multi Format Schema Object) | asyncapi.com 3.1.0 |

Extra facts from the same pages: Go, changing an exported constant's value is incompatible (inserting into an `iota` block shifts values); Go, a type that stops implementing an exported interface breaks the package; Go modules, a patch release should not raise a dependency by more than a patch; Java, making a class abstract or final, or a field static or not, is binary-incompatible; TypeScript, a mutable property's type change in either direction is breaking; TypeScript, a class export turned type-only, or a method turned into an arrow-function property, is breaking; Rust, adding `#[non_exhaustive]` to an existing type is major; Rust, removing a Cargo feature, requiring `std`, or reordering a `repr(C)` type's fields is major; Avro, a union field's default must match the union's first branch, and a default does not make a field optional when writing; Python 3.15, star imports only at module level and never `lazy`.

Version axes the reviewer must check: Avro before or after 1.9 (enum defaults); Confluent or AWS Glue registry, and whether Confluent data contracts (`compatibilityGroup`) are in use; the Rust edition and MSRV (`rust-version`); AsyncAPI 2.x or 3.x; api-extractor before or after 7.
