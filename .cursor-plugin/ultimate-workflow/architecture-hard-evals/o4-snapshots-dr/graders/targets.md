---
type: regex
pattern: "RPO|RTO|recovery (point|time)|acceptable (data )?loss"
flags: i
match: contains
target: last_message
---
