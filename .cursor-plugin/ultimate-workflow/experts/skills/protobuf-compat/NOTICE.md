# Notice

This skill is written in our own words. No text is copied.

| Source | Version or commit, date checked | Licence | What it informed |
|---|---|---|---|
| protobuf.dev (proto3 and editions guides, enums, JSON, best practices, Edition 2024, features); buf.build breaking rules and `buf.yaml` v2 reference; aip.dev/180 and /149; the gRPC over HTTP/2 protocol document | Checked live by the maintainer, 2026-10-20 (round 1 and round 2) | Google and Buf documentation | Every fact marked [R] |
| github/awesome-copilot `protobuf-grpc-api-review` and its `protobuf-compatibility.md` and `grpc-contract-review.md` references | Read 2026-10-20 | MIT | Reading the compatibility target first, renames that break name-based encodings, guards against false positives. Marked [T] where not confirmed |

Left out: rollout order, rollback and replay (the architect's "Two versions at once"), deadlines and retry codes (the architect, `failure-handling`), per-method authorization (security).
