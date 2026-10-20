# Notice

The DevOps engineer expert's checklists restate ideas from the sources below. No text is copied; the wording is our own. They are credited here because the ideas are theirs.

| Source | Licence | What the ideas informed |
|---|---|---|
| github/awesome-copilot `terraform-iac-reviewer` | MIT | Sorting a change by create, update, replace and destroy; destroy counts; provider and module pins; state locking; lifecycle rules |
| github/awesome-copilot `platform-sre-kubernetes` | MIT | Probes, disruption budgets, rollout strategy, image identity. Its fixed replica and threshold numbers were not taken |
| github/awesome-copilot `github-actions-expert`, `se-gitops-ci-specialist`, `gem-devops`, `devops-expert` | MIT | Deploy concurrency keyed on the target, cache keys from the lock file, runtime versions shared by CI and local, image tags from the commit, plan before apply, a rollback blocked by a migration |
| wshobson/agents `deployment-engineer`, `terraform-specialist`, `kubernetes-architect`, `devops-troubleshooter`; davepoon/buildwithclaude copies of the first two | MIT | Build once and promote, compatible migrations, import and move operations, version constraints |
| msitarzewski/agency-agents `devops-automator`, `platform-engineer`, `git-workflow-master` | MIT | Hazards shown by its own examples (a launch template on its latest version, a blue-green switch to a Deployment that does not exist, `kubectl` changes the repository does not hold); a commit that reverts on its own |
| alirezarezvani/claude-skills `devops-engineer` | MIT | Boring technology, an orchestrator sized to the team |
| awslabs/aidlc-workflows `aidlc-pipeline-deploy-agent` | MIT-0 | Promotion across tiers, forward-only migrations, smoke checks before "done" |

The shared skills this expert loads have their own NOTICE files. The sources were read as data. None of their scripts, hooks, commands or fetches are used, and none of them runs anything for this expert.
