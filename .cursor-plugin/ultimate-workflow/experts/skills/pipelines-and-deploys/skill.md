# Pipelines and deploys

Use this when a change adds or changes a CI/CD workflow. GitHub Actions is the main CI this skill is written for; GitLab, CodeBuild, CodeDeploy and Jenkins get the general rules and a short section. It holds what decides whether what reaches production is what was tested, and whether two deploys can collide. CI workflow security (triggers that run fork code with secrets, `permissions`, pinning actions to a commit, OIDC) is the security expert's; whether a check can fail is quality's.

Each fact carries its source: **[D]** GitHub's documentation as published on GitHub (`github/docs`, read 2026-10-20; github.com unless marked); **[T]** an upstream community skill, not checked; **[O]** our own reasoning. **[R]** the maintainer's check of the live GitLab documentation (2026-10-20). Other GitLab rules are [O]: check the current GitLab documentation before a finding rests on one.

## What reaches production

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Build once, promote the artifact that was tested [O] | A production job that builds the image or bundle again instead of deploying the digest or artifact the earlier job produced | A build that must differ per environment, and the plan says why |
| Deploy an immutable identity [O] | A deploy step that pulls `:latest`, a branch tag or a tag reused across builds | Digest or commit-SHA tags |
| Promotion goes through the earlier stages [O] | A production job whose `needs:` leaves out the test or staging job, or that runs under `if: always()` | |
| Infrastructure applies the plan that was reviewed [O] | An apply job that plans again instead of applying the saved plan; `apply -auto-approve` on a schedule | A saved plan applies exactly its operations, with no prompt [D] |
| Infrastructure before the code that needs it [O] | The app deploy job does not depend on the infrastructure job | |

## GitHub Actions: what a run actually builds and deploys

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| On `pull_request`, `GITHUB_SHA` is the merge commit of the pull request's merge branch, not its head; the head is `github.event.pull_request.head.sha` [D] | An image or artifact built on a pull request, tagged with `github.sha`, and later promoted: that commit never lands on the default branch [O] | Builds that are only tested, never deployed |
| `workflow_run` runs the workflow file from the default branch, with `GITHUB_SHA` set to the default branch's last commit [D] | A deploy triggered by `workflow_run` that checks out or tags `github.sha`, so it deploys whatever the branch holds now, not the commit the triggering run tested; use the triggering run's head commit from the event [O] | |
| Each job on a GitHub-hosted runner starts on a fresh machine; data moves between jobs as artifacts or outputs [D] | A deploy job that expects the build job's files on disk, then builds again or deploys nothing [O] | Steps in the same job |
| The default shell runs with `set -e` only; `-o pipefail` is added only when `shell: bash` is named [D] | `./deploy.sh \| tee deploy.log` in a step with no `shell: bash`: the deploy fails and the step passes [O] | A step that names `shell: bash` |
| `always()` runs a job or step even when the run was cancelled; the documentation recommends `!cancelled()` instead [D] | A deploy or migration job under `if: always()`, which runs after its tests failed or the run was cancelled [O] | Clean-up and reporting steps |
| A matrix cancels its in-progress and queued jobs when one fails, by default (`fail-fast` is true) [D] | A matrix that deploys to several regions or environments: one failure leaves the rest half deployed [O] | Test matrices |
| A reusable workflow that is not passed an environment secret gets an empty string, with no error, unless the secret is declared `required: true` [D] | A called deploy workflow that reads a credential the caller does not pass, and deploys with an empty value or skips a step silently [O] | |
| The `-latest` runner labels point at whichever image GitHub currently calls latest stable [D] | A release build on `ubuntu-latest` whose toolchain changes when the label moves, with no change in the repository [O] | Test jobs where that is wanted |

## Environments and gates

- Environment secrets reach only jobs that reference the environment, and only after its reviewers approve [D]. A production deploy job with no `environment:` gets none of its protection rules [O].
- Up to six required reviewers can be listed and one approval suffices; a wait timer is 1 to 43,200 minutes [D].
- A job skipped by `if:` reports Success. A whole workflow skipped by a `paths`, `branches` or commit-message filter leaves its checks Pending, and a pull request that requires them is blocked [D]. A filter that lets a change reach a deploy without the checks the rest pass is a finding [O].

## Concurrency

- In a concurrency group, at most one run is running and one pending; a new pending run cancels the older pending one (on github.com this is the default `queue: single`; `queue: max` keeps up to 100 pending, and cannot be combined with `cancel-in-progress: true`) [D]. So with the default, not every commit deploys: an intermediate one can be skipped [O].
- A deploy job with no concurrency group lets two runs deploy to one environment at once [O]. A group keyed on the branch (`github.ref`) still lets two branches deploy to the same environment; key it on the target [O].
- `cancel-in-progress: true` on a group that applies infrastructure or runs a migration can stop it halfway [O]. On test jobs, cancelling is right.

## Time and size limits

- A job's `timeout-minutes` defaults to 360; a GitHub-hosted job is capped at 6 hours, a run at 35 days including waiting for approval [D]. A deploy that waits on a lock or an approval needs its own timeout [O].
- A matrix generates at most 256 jobs; reusable workflows nest at most 10 levels and 50 per file on github.com (4 and 20 on GitHub Enterprise Server) [D].
- A workflow file over 500 KB does not start [D].
- Scheduled workflows run at most every 5 minutes, only on the default branch, may be delayed or dropped at high load, and are disabled in public repositories after 60 days without activity [D]. A deploy or backup that depends on an exact schedule is a finding [O].
- Events caused by `GITHUB_TOKEN` do not start new runs, except `workflow_dispatch` and `repository_dispatch` (and, on github.com, pull request events, which wait for approval) [D]. A release job that pushes a tag with `GITHUB_TOKEN` and expects the tag's workflow to run gets no run at all [O].

## GitLab

- A job with `when: manual` defined outside `rules:` defaults to `allow_failure: true`, so the pipeline does not wait for it and passes without it; inside `rules:` it defaults to `allow_failure: false` [R]. A manual production deploy or approval job written the first way does not hold back what follows it [O]. Whether a test job may fail is quality's.

## Caches and artifacts

- Cache entries not accessed for 7 days are removed; the default limit is 10 GB per repository [D]. A cache key not derived from the lock file's hash, or a `restore-keys` fallback on a release build, can ship a stale dependency set [O].
- Artifacts and logs are kept 90 days by default [D]. A rollback that downloads an older run's artifact fails after that [O].

## Tools and runtimes

- A deploy or release job that installs `latest` tools or runtimes, or a CI runtime version that differs from the repository's version file (`.nvmrc`, `.python-version`, `.tool-versions`), builds something other than what was tested locally [O].
- A deploy job with no timeout and a manual step that nobody watches holds the concurrency group [O].
