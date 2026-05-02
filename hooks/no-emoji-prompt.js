#!/usr/bin/env node
// UserPromptSubmit hook: prepends a short reminder that the model must not
// emit emojis. Soft reminder; the PreToolUse hook is the actual backstop.
//
// Escape hatch: set env var ALLOW_EMOJIS=1 to suppress the reminder.

"use strict";

if (process.env.ALLOW_EMOJIS === "1") {
  process.exit(0);
}

// Stdout from a UserPromptSubmit hook is injected as additional context.
process.stdout.write(
  "[plugin rule] No emojis in any output (chat, code, files, commits). " +
  "Emojis break Windows terminals and pipelines. Use ASCII equivalents " +
  "(\"done\", \"fail\", \"->\"). This rule overrides any skill or " +
  "convention that would normally include emojis.\n"
);
process.exit(0);
