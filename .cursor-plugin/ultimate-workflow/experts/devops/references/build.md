# Delivery brief

This applies when the change writes infrastructure code, a CI/CD workflow, a Dockerfile, a compose file or Kubernetes manifests. It adds no work: if the plan does not ask for something, do not build it. Where this brief and the plan disagree, the plan wins.

## Before you write

- Find how the repository already does it: the IaC root, its backend and module layout, how environments are named, the workflow that deploys, how images are tagged. Follow it, even where you would have chosen differently.
- Find the repository's own validation commands (format, validate, lint, schema check, a plan or synth) in its build files and CI.

## While you write

- Never run anything that changes a real environment: no apply, deploy, `kubectl apply`, `helm upgrade`, stack update or image push. Plans, synths, dry runs and local builds are fine.
- A resource that holds data keeps its identity. Renaming or moving it gets a `moved` block, a kept logical id or an import, never a destroy and a create. Do not remove or weaken a deletion or retention guard the repository uses.
- Pin what you add the way the repository pins, commit the lock files the tool writes, and tag what you build from the commit, never with `latest`.
- Build once and promote what was built and tested; do not rebuild per environment.
- A deploy job gets a concurrency group per target environment, and never cancels a run that is applying infrastructure or migrating data.
- In GitHub Actions, deploy what the push to the default branch built (on a pull request `github.sha` is a merge commit), pass files between jobs as artifacts, name `shell: bash` where a pipe must fail the step, and use `!cancelled()` rather than `always()` on anything that deploys.
- A container's main process receives the stop signal: the exec form of the start command (a JSON array, so double quotes), or `exec` in a start script.

## When not to

- Add no environment, tool, platform, approval step or rollout strategy the plan does not ask for.
- Do not reformat or reorganise infrastructure code the change does not need; every changed line traces to the task.

## When you report

- Name the validation commands you ran and their result, and the ones you skipped for lack of credentials.
- Name every `moved`, `removed` or `import` block you added, and any guard you weakened because the plan asked for it.
- Say what only the pipeline or the cloud can show, such as the real plan against live state.
