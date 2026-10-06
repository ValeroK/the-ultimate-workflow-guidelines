---
type: regex
pattern: "CI|fitness|lint|automated|pipeline|build fail|fail the build|architecture test|dependency rule"
flags: i
match: contains
target: last_message
---
