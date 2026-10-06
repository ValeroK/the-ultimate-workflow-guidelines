---
type: llm
criteria: |
  PASS if the answer states that exactly-once delivery cannot be guaranteed in general and recommends at-least-once delivery combined with idempotent processing (exactly-once effect). FAIL if it claims or promises true exactly-once delivery.
focus: last_message
---
