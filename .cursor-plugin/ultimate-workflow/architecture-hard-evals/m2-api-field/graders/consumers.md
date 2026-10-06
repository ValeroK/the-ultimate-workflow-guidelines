---
type: regex
pattern: "consumer|old (app|client|version)|mobile.*(old|version)|usage|telemetry"
flags: i
match: contains
target: last_message
---
