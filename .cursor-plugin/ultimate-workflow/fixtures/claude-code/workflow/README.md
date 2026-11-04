# Recorded Claude Code hook payloads: a background workflow

Recorded 2026-11-04 with Claude Code 2.1.316 (Windows, `claude -p`) while a two-agent workflow ran in a scratch repo
(PLAN-run-records.md, step S0). Local paths and ids are replaced; keys and values are as sent.

- `Stop.workflow-running.json`: a Stop while the workflow runs; `background_tasks` lists it.
- `Stop.workflow-finished.json`: the Stop after it finished; `background_tasks` is empty.
- `PreToolUse.subagent-write.json`: an edit by a workflow subagent (`agent_id`, `agent_type`).
- `PreToolUse.main-write-during-workflow.json`: an edit by the main session while the workflow ran (neither field).
- `SubagentStop.json`, `PostToolUse.workflow-launch.json`: the completion and launch payloads.

A Claude Code update can change these. Re-record, and update the version above.
