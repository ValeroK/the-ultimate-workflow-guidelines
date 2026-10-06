---
type: llm
criteria: |
  PASS if the answer pushes back on paging for CPU on any node and recommends paging on user-affecting symptoms (error rate, latency, success rate, or error-budget burn), keeping CPU as a dashboard or diagnostic signal. FAIL if it endorses the CPU paging plan.
focus: last_message
---
