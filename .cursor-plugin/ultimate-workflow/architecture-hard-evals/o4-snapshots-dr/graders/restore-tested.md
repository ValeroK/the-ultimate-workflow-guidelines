---
type: regex
pattern: "restor(e|ed|ing)? (test|drill|verif)|test.*restore|never been restored|untested|verify.*restore|restore.*(test|verif)"
flags: i
match: contains
target: last_message
---
