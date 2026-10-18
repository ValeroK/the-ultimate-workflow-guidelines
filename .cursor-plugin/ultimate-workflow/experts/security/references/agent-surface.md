# Agent, skill, hook, MCP and CI surface

Read this when the diff touches instructions or configuration that steer an agent, run a hook, start a tool server or run in CI. In these files the prose and the configuration are the executable part. A markdown file that tells an agent what to do is in scope. Plain documentation that no agent reads is not.

## Prompt injection and instruction tampering

- A change to `AGENTS.md`, `CLAUDE.md`, a rule, a skill, a command or an agent definition that tells an agent to ignore earlier rules, skip approval, hide an action from the user, trust a source blindly, or send data somewhere.
- A change that widens what an agent may do: a larger `tools:` allowlist (a shell, a network tool, a write tool, the skill tool), `allowed-tools` with broad shell patterns, a permission mode that skips prompts, auto-approve settings.
- Untrusted text flowing into the prompt of an agent that has write or shell tools: issue and pull-request titles, bodies and comments, file contents, tool output, web pages. Trace it as source to sink like any other injection, and name the tool that makes it harmful.

## Hooks

- A hook command built from payload fields (paths, commands, prompts) without validation or quoting.
- A hook that fails open on a security decision, or whose block can be skipped by an input the attacker controls.
- A hook that runs with more privilege than its job needs, or writes outside the project.

## MCP servers

- A server in `.mcp.json` or a settings file that launches an unpinned package (`npx`, `uvx`, `pipx` with no version or digest), a remote URL the project does not control, or a command taken from the repository itself.
- Secrets passed in arguments or committed environment values.
- A newly added server or tool with no grant or review.

## CI workflows

- `pull_request_target` or `workflow_run` that checks out and runs code from the pull request's head.
- Event data such as titles, branch names or comment bodies interpolated into a `run:` step.
- Secrets reachable by workflows triggered from forks, or `permissions` broader than the job needs.
- Third-party actions pinned to a tag or a branch rather than a commit.
- Caches or artifacts produced at a low privilege level and trusted at a higher one.

## Install and update paths

- Install or post-install scripts, `curl | sh`, and any step that fetches code and runs it.
- A marketplace or plugin source that updates automatically without review.

Report a finding only with a concrete path: who controls the input, what the agent or workflow then does with it, and what harm results.
