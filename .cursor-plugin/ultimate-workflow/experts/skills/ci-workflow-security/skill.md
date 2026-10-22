---
name: ci-workflow-security
description: Use when a change adds or changes a GitHub Actions workflow, a composite action or the actions lockfile - triggers that run fork code, event text in run steps, GITHUB_TOKEN permissions, checkout credentials, secrets and masking, caches and artifacts across privilege levels, action pinning, and OIDC.
verified: 2026-10-20
requires: GitHub Actions on github.com; the actions lockfile is not on GitHub Enterprise Server
---

# CI workflow security

## Goal

- **Lets the expert catch:** a workflow that runs code or text an outsider controls with a privileged token, secrets or a writable cache; a token or cloud role wider than the job needs; a secret that reaches the log.
- **Applies to:** `.github/workflows/*.yml` and `*.yaml`, `.github/actions/**/action.yml`, `.github/workflows/actions.lock`.
- **Not for:** promotion, build once, deploy concurrency and environments as a release step (devops, `pipelines-and-deploys`); a test step or job that cannot fail (quality, `test-gates`); the cloud side of an OIDC trust policy in IaC (security's review of the IaC itself).

Sources: **[R]** the maintainer's live check of docs.github.com (security fact-check, round 2, 2026-10-20); **[D]** GitHub's documentation as published in `github/docs` (pages dated 2026-09-10 to 2026-10-13, read for the DevOps research); **[T]** a third-party page, not confirmed on GitHub's own; **[O]** our own reasoning. An [O] or [T] item is a prompt to check, not a finding on its own.

## First, establish the target

- **The triggers** of the workflow (`on:`), and whether any job runs with the base repository's token and secrets on an event an outsider can cause: a fork pull request, a comment, an issue, another workflow.
- **Whether the repository is public** or accepts fork pull requests, and **the host:** github.com or GitHub Enterprise Server.
- **Whether the workflow is onboarded to `actions.lock`.**
- If you cannot establish these, say which you assumed and lower your confidence by one step.

## Triggers that run fork code

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Under `pull_request_target`, `actions/checkout` refuses a fork's head unless `allow-unsafe-pr-checkout: true` [R] | `allow-unsafe-pr-checkout: true` followed by a step that builds, installs, tests or runs scripts from the checkout | The checkout is only read as data by a step that executes nothing from it [O] |
| That guard does not cover `git fetch`, `gh pr checkout` or running a downloaded artifact [R] | Any of those bringing the head's code into a `pull_request_target` job, then a step that runs it | |
| A `workflow_run` workflow must not check out untrusted code and must treat other workflows' artifacts as untrusted [R] | A `workflow_run` job that checks out `github.event.workflow_run.head_sha`, or unpacks an artifact and executes or `eval`s its contents | The artifact is parsed as data with a fixed schema [O] |

## Event text in steps

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| An expression is substituted into the script before the shell runs it, so event text in `run:` is script injection [R] | `${{ github.event.pull_request.title }}`, `.body`, `.head_ref`, `github.event.comment.body`, `github.head_ref` or an issue field inside `run:` or an `actions/github-script` `script:` | The value goes through `env:` and the script quotes the variable (`"$TITLE"`) |
| Text written to `GITHUB_ENV`, `GITHUB_PATH` or `GITHUB_OUTPUT` with a newline adds variables or outputs for later steps [T] | `echo "X=$UNTRUSTED" >> "$GITHUB_ENV"` with no newline handling, then a later step that uses the variable | A heredoc delimiter the input cannot contain [O] |

## Token, credentials and secrets

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Naming any `GITHUB_TOKEN` permission sets every one not named to none [D] | A job that adds one permission and still needs `contents: read`; or a workflow-level `write-all` or `contents: write` that no job needs | |
| A called workflow can only keep or narrow the caller's token permissions [D] | A reusable workflow that declares broader permissions than its caller and is expected to get them | |
| `actions/checkout` leaves its token in `.git/config` for the rest of the job unless `persist-credentials: false` [R] | A later step in the job that runs untrusted code, or uploads the workspace as an artifact, with the default left on [O] | |
| Anyone with write access can read all repository secrets; environment secrets behind required reviewers are the exception [R] | A secret meant for a few people stored as a repository secret | |
| A value derived from a secret is masked only after `::add-mask::`; a secret inside JSON, XML or YAML is unlikely to be redacted [R] | A step that decodes, slices or builds JSON from a secret and prints or `set -x`es it without masking | |

## Caches and artifacts

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| `pull_request_target`, `issue_comment` and `workflow_run` runs may restore default-branch caches and cannot create or overwrite them [D] [R] | A write-capable `cache-mode` added to such a workflow, which opts back into writing [R] | A cache write from those triggers without it is already refused: not a finding |
| A cache or artifact made at low privilege is untrusted at higher privilege [O] | A release or deploy job that restores a cache or downloads an artifact written by a fork-triggered job | |

## Pinning actions

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A third-party action referenced by tag or branch runs whatever that ref points to later [O] | `uses: owner/action@v3` or `@main` for an action outside the organisation | The workflow is onboarded to `actions.lock`, which pins actions and their transitive actions [R] |
| `actions.lock` does not pin the actions inside reusable workflows [R] | A reusable workflow from another repository relied on as pinned by the caller's lockfile | |
| Once onboarded, allowed-actions policies check the locked SHA, so a policy entry by tag (`actions/checkout@v6`) stops matching [R] | Onboarding a workflow while the organisation's allow-list names actions by tag (a broken run, not a vulnerability) | |

## OIDC to a cloud

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| `id-token: write` lets the job request a token for any trust policy that accepts it [O] | `id-token: write` at workflow level, or on a job that a fork or comment can trigger | |
| A job that names an environment gets the `sub` `repo:ORG/REPO:environment:NAME`; repositories created, renamed or transferred after 2026-07-15 get `repo:OWNER@OWNER-ID/REPO@REPO-ID:environment:NAME` [R] | `environment:` added to a job whose cloud role trusts `ref:refs/heads/main` (the role stops matching unless the subject template is customised) | GitHub Enterprise Server, which has no immutable form [R] |
| GitHub requires at least one trust condition [R]; a trust on `repo:ORG/*` admits every repository in the organisation [T] | A trust policy in the same change matching `repo:ORG/*` or a `sub` with `*` for a role that deploys | |

## Not a finding

- The 2026-11-02 default policy that blocks `pull_request_target` in public repositories with no event policy: a platform setting, not visible in a diff [R].
- `pull_request` from a fork: it runs with a read-only token and no secrets [O: GitHub's documented default, not in the round-2 check].
- A first-party `actions/*` action on a major tag, when nothing else on this page applies [O].
- Event text used only in `if:` or as an input to an action that does not pass it to a shell.
