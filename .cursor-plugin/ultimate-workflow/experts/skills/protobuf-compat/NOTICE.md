# Notice

This skill is written in our own words. No text is copied.

| Source | Licence | What it informed |
|---|---|---|
| protobuf.dev (proto3 and editions language guides, enum and JSON guides, best practices, Edition 2024 specification, features); the field-presence guide in the protocolbuffers/protobuf repository; buf.build breaking rules; aip.dev/180; the gRPC over HTTP/2 protocol document in the grpc/grpc repository, checked live by the maintainer on 2026-10-20 | Google and Buf documentation | Every fact marked [R] |
| github/awesome-copilot `protobuf-grpc-api-review` and its `protobuf-compatibility.md` and `grpc-contract-review.md` references | MIT | Reading the compatibility target first, renames that break name-based encodings, guards against false positives. Marked [T] where not confirmed |

Left out: rollout order, rollback and replay (the architect's "Two versions at once"), deadlines and retry codes (the architect, `failure-handling`), per-method authorization (security).
