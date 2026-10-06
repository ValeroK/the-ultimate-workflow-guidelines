---
type: regex
pattern: "irreversib|cannot (be )?roll|can.t (be )?roll|data loss|old version|v1.*(column|legacy_id)"
flags: i
match: contains
target: last_message
---
