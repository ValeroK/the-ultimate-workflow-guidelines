---
type: regex
pattern: "4xx|permanent|non-retry|transient|classif|status code|only retry"
flags: i
match: contains
target: last_message
---
