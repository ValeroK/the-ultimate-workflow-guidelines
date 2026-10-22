# Changes

## 2026-10-22: skills

- Four skills after the maintainer's live check (block D: 37 items, 5 different, 10 extras and 10 added): `agent-loops-and-tools`, `model-calls`, `bedrock-and-agentcore`, `rag-retrieval`, at plan and review. Model-specific rows name their models and the date.
- Corrected from the drafts: prefill is refused on Haiku 5.5 too; AgentCore's 25 TPS is per account and shared, not per agent; active sessions are 5,000 and 2,500; one new-session quota for both deployment types; Memory `CreateEvent` is 200 per second.
- Not measured.

## 2026-10-20: first version

- Written to the expert templates from the vendor documentation and upstream agents listed in `../NOTICE.md`; no text copied.
- Plan and review only: quality's tests reference already holds the agent-and-tool case family.
- No model-specific facts and no skills until the maintainer's live check returns.
- Not measured.

## 2026-10-21: tests stage

- Joins the tests stage (maintainer decision). The agent-and-tool case family moved here from quality; quality keeps the oracle.
