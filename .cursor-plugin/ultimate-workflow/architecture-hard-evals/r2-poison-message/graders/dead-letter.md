---
type: regex
pattern: "dead.letter|DLQ|quarantine|parking"
flags: i
match: contains
target: last_message
---
