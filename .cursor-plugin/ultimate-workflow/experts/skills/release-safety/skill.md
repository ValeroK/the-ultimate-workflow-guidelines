# Release safety

Use this when a change ships behind a feature flag, changes a canary or traffic-shifting deployment, or changes where and when a migration runs in the release. It holds what decides whether a bad release can be stopped and undone. Whether old and new versions can share the same data is the architect's ("Two versions at once"); the migration SQL is the data expert's; whether the system needs a canary or a kill switch at all is the architect's (`aws-well-architected`, OPS06 and REL05). This skill is how the mechanism already in place is used.

Sources: **[R]** the maintainer's check of the live AWS pages (2026-10-20); **[T]** upstream community skills (see `NOTICE.md`), not checked against vendor documentation; **[O]** our own reasoning. Nothing here is a vendor default to quote as a number. Do not demand a flag platform, a canary or GitOps the system does not run.

## Feature flags

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| The fallback when the flag service cannot be reached is the old path [O] | A flag read whose default value turns the new behaviour on | A default of off, or of the old behaviour |
| Remove the code that reads a flag before the flag [T] | The flag deleted in the provider, or its definition removed, while code still reads it; the old branch removed while the flag is below 100 percent anywhere | |
| A flag cannot undo a schema change [O] | A flag said to protect a change that ships a destructive migration in the same release | Additive migrations |
| A flag that guards a release is read per request, not once at start-up [O] | A flag value cached for the process lifetime, so turning it off needs a restart | Flags meant to be fixed per deploy |

## Canary and traffic shifting

- The alarm that rolls back must measure the new version, not the whole fleet: at 10 percent traffic, a broken canary hides in the average [O].
- A canary analysis that can return no data stays inconclusive and neither promotes nor fails, unless there is a limit on inconclusive results [T].
- A switch from canary or linear to all-at-once on a production alias or service removes the stage where a bad release is caught [O].
- An ECS deployment circuit breaker with rollback on returns a failed deployment to the last one that completed [R]; enabled with `rollback: false` it stops a bad deploy but leaves it in place [O]. The circuit breaker and deployment alarms work only with the ECS rolling-update controller, not with `CODE_DEPLOY` or `EXTERNAL` [R].
- A CodeDeploy deployment group can roll back on its own when a deployment fails or a named CloudWatch alarm fires [R]. A group with automatic rollback off, or with no alarm, leaves a bad release live until someone acts [O].
- Lambda traffic shifting works on an alias whose routing CodeDeploy changes [R]. A trigger or API pointed at `$LATEST` or at a version, rather than the alias, bypasses the shift [O].
- AWS AppConfig watches the CloudWatch alarms tied to an environment during a deployment and rolls back to the last good configuration when one fires [R, AWS blog]. An environment with no alarm monitor rolls a bad flag out to everyone [O].

## Migrations in the release

- A migration that runs in the application's entry point or an init container runs on every replica at once and races [O]. Not for a single-instance service.
- A migration that runs after the new code is live leaves the new code reading a schema that is not there yet [O].
- Code that stops using a column ships in the release before the one that drops it; both in one release means rolling back the code finds the column gone [O].
- A rollback job that runs down-migrations automatically can drop data written since the release [T].

## Something to roll back to

- An image registry lifecycle rule that expires images still deployed, or keeps too few, leaves nothing to roll back to [T].
- A tag overwritten by the new build (`:prod`, `:stable`) makes "redeploy the previous tag" deploy the new code [O].
- A rollback path that downloads an artifact from an older CI run fails once that artifact has expired [O].
