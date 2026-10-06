---
type: regex
pattern: "shared (database|table|schema)|both services|same table|ownership|owner|couple|integration database|database per service|single owner"
flags: i
match: contains
target: last_message
---
