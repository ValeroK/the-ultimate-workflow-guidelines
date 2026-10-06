---
type: llm
criteria: |
  PASS if the answer either asks whether a service split is justified or proposes an incremental, reversible approach (fix boundaries inside the monolith first, or a strangler-style staged cutover) rather than a big-bang rewrite. FAIL if it plans a big-bang extraction with no staging.
focus: last_message
---
