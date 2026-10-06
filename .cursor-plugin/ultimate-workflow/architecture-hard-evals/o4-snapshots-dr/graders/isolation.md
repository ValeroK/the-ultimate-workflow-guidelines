---
type: regex
pattern: "same (region|account|cluster)|off.?site|cross.region|separate account|retention|encrypt"
flags: i
match: contains
target: last_message
---
