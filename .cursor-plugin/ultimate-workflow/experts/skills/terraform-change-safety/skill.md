---
name: terraform-change-safety
description: Use when a change changes Terraform or OpenTofu code or its backend: what an apply will move, replace or destroy, state, version floors and pins.
---

# Terraform change safety

Use this when a change touches Terraform or OpenTofu code, variables, a backend or the lock file. It holds what decides whether an apply keeps, replaces or destroys what is already running, and whether the run can be repeated.

Each fact carries its source: **[D]** HashiCorp's Terraform documentation as published on GitHub (`hashicorp/web-unified-docs`, v1.16 docs, read 2026-10-20); **[R]** the maintainer's check of the live pages on developer.hashicorp.com (2026-10-20); **[T]** an upstream community skill, not checked against the documentation; **[O]** our own reasoning. Treat a [T] item as a prompt to check, not as a finding on its own. Whether a given argument forces replacement depends on the provider and its version: say so from the provider's documentation or an attached plan, never from memory.

## Identity: what Terraform will destroy

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A changed address is a destroy and a create, unless a `moved` block maps the old address to the new [D] | A resource or module renamed, moved into or out of a module, or given `count` or `for_each`, with no `moved` block for each instance key [D] | A stateless resource whose recreation the plan accepts and says so |
| Removing a resource block destroys the real object at the next apply, even with `prevent_destroy` set, because the guard leaves with the block [D] | A deleted `resource` block for something that holds data | A `removed` block with `lifecycle { destroy = false }`, which drops it from state and leaves it running [D] |
| `prevent_destroy` makes any plan that would destroy the resource fail, `terraform destroy` included [D] | The guard removed from a stateful resource in the same change that would replace it | The plan states the resource may go |
| `count` indexes by position [O] | `count` over a list where an item other than the last can be removed, so every later instance shifts and is replaced | `count = var.enabled ? 1 : 0` |
| `for_each` keys must be known at plan time and cannot be sensitive; `count` and `for_each` cannot share a block [D] | Keys built from IDs or ARNs computed during apply | Keys from variables or literals |
| An argument the provider marks as forcing a new resource replaces it; plan output marks it `# forces replacement` [R] | A changed name, engine, subnet group, encryption key or zone on a database, bucket, volume, queue or key | Ask for the plan output; without it, a suspicion |

## Lifecycle rules

- `create_before_destroy` is opt-in, and it propagates to the resources that depend on it [D]. It breaks on a resource with a fixed unique name: the new one collides with the old [O]. Not when the name comes from `name_prefix` or is generated.
- `ignore_changes` stops Terraform from correcting drift on the listed arguments [D]. `all`, or a broad list added to quiet a plan, hides changes made outside the code [O]. Not for one argument owned by a named external system, with a comment saying which.
- `replace_triggered_by` replaces the resource when the referenced item changes [D]; a reference to something that changes on every apply replaces it every time [O].
- Lifecycle rules other than `create_before_destroy` are not stored in state, so they act only while they are in the configuration [D].

## Version floors

| Block or setting | Needs [D] | What breaks it |
|---|---|---|
| `moved` | Terraform 1.1 | Used under a `required_version` that allows older releases |
| `import` block | 1.5.0 | The same |
| `removed` block | 1.7 | The same |
| S3 backend `use_lockfile` | experimental in 1.10, general in 1.11 (default false); DynamoDB locking is deprecated from 1.11 | Turned on under 1.10 in production, or a new backend that relies on DynamoDB locking alone |

An `import` block whose configuration differs from the real object changes or replaces it on the first apply [O].

## Pins and the lock file

- Commit `.terraform.lock.hcl` and review its changes [D]. A lock file deleted, ignored, or changed with no provider bump in the diff makes the next run resolve different providers [O].
- `~>` lets only the right-most component increase: `~> 1.0.4` allows 1.0.10 but not 1.1.0 [D]. The documentation's advice: reusable modules set only a minimum, root modules constrain more tightly [D]. Follow the repository's own policy where it has one.
- A module `source` from a registry with no `version`, or from git with no `?ref=`, changes under the code without a diff [O]. Who can move that reference is security's question.
- A provider major-version bump in the same change as functional edits makes the plan impossible to read [T].

## State and backend

- A changed backend bucket, key, prefix or workspace with no state migration step starts the next plan from empty state, which plans to create everything again [O].
- Two environments that write one state key or workspace overwrite each other [O].
- A backend with no locking lets two runs write state at once [O].
- `-target` is for recovering from mistakes and working around limits, not for routine runs, because it leaves drift undetected [D]. A `-target` in a pipeline is a finding.
- Removing a provider block while resources it manages are still in state fails the plan; remove the resources first [T].
- Values marked `sensitive` are still written to state and plan files [D]. Who can read them is security's.

## Checks that do not block

A `check` block reports and does not stop an apply [T]. A condition that must stop it is a `precondition` or `postcondition`.
