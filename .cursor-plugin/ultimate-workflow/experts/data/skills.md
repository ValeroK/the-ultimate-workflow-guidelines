# Skills: data

Read by `experts.js` only; no model reads this file. One section per stage. The order is the priority when the cap is reached. A line is `- <skill> (<selector>)`; at plan a line has no selector, because a model chooses by each skill's `description`.

`erasure-and-retention` rests on fact-check block J (2026-10-22). The other planned skills (`postgres-schema-changes`, `queries-and-transactions`, `dynamodb-design`, `vector-storage`, and possibly `orm-and-migration-tools` and `redis-as-a-store`) wait for fact-check block F, read from full pages.

## plan

- erasure-and-retention

## review

- erasure-and-retention (added: \b((DELETE|delete)\s+(FROM|from)|TRUNCATE|soft_?delete|softDelete|deleted_?[Aa]t|is_?deleted|isDeleted|paranoid|anonymi[sz]e|pseudonymi[sz]e|erasure|forget_?user|right_?to_?be_?forgotten|dsar|DSAR|data_?export|purge|data_?retention|retention_?(period|policy|days)|expires?_?at|expiresAt|TimeToLiveSpecification|ttl_attribute|LifecycleConfiguration|lifecycle_rule|NoncurrentVersionExpiration|noncurrent_version_expiration|_delete_by_query|delete_by_query|retention\.ms|cleanup\.policy|tombstone|(DROP|drop)\s+(COLUMN|column))\b|((ADD|add)\s+(COLUMN|column)|add_column|addColumn|Column\(|t\.(string|text)|models\.\w+Field\().*\b(email|phone|first_?name|last_?name|full_?name|firstName|lastName|fullName|birth|dob|address|ssn|national_?id|passport|ip_?address|ipAddress|device_?id|deviceId|latitude|longitude)\b)
