---
type: regex
pattern: "backpressure|load shed|shed|reject|bulkhead|429|503|fail fast"
flags: i
match: contains
target: last_message
---
