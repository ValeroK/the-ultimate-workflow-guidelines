# Provenance: anthropic-security-review

Pristine, unmodified upstream snapshot. Audit input only: it is NOT shipped in the
plugin and nothing executes from it. The shipped checklist is an adaptation that
cites this commit (`.cursor-plugin/ultimate-workflow/experts/security/`).

- Source: https://github.com/anthropics/claude-code-security-review
- Commit: 0c6a49f1fa56a1d472575da86a94dbc1edb78eda (HEAD of `main` on 2026-10-18)
- Retrieved: 2026-10-18, from raw.githubusercontent.com at that exact commit
- License: MIT, Copyright (c) 2025 Anthropic
- Vendored: only the slash-command file and the license. The upstream repo's Python
  (`claudecode/`, `evals/`, `scripts/`), `action.yml` and GitHub Action are NOT
  vendored. The Action sends code to an API and its README says it is not hardened
  against prompt injection.

## Vetting (2026-10-18)

- Read in full (190 lines). No instruction to fetch URLs, send data, run commands
  other than read-only git, or hide actions from the user.
- The file uses inline `!` shell lines that inject git output into the prompt at
  invocation. Our adaptation does not use that mechanism.
- Known defects carried into the adaptation work: three inconsistent confidence
  scales, duplicate numbering, no defined no-findings result, and exclusions that are
  wrong for agent/plugin repositories (AI-prompt injection, markdown files, outdated
  libraries).

## Hashes (sha256 of the exact bytes, LF line endings)

| File | sha256 |
|---|---|
| `security-review.md` | dd1d451f909dbb8798f4a4de010c35e7dd9152f02bb2f7988442cdd138f29e39 |
| `LICENSE` | a9ac868c004c4cce26430b3117767b46397ba4fa25026b1e5ea6694b463baf4b |

The same hashes are pinned in `vendor/EXPECTED-HASHES.json`. A re-pin edits the file,
this table and that pin together, in one reviewed commit that names the new upstream
commit. The test cannot tell which side is "really upstream" offline; it makes
accidental drift loud and deliberate changes visible in review.
