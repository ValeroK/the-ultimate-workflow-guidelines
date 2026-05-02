#!/usr/bin/env node
// PreToolUse hook: blocks Write/Edit/MultiEdit/NotebookEdit when the new
// content contains emoji codepoints. Rationale: emojis break Windows
// terminal rendering and corrupt downstream pipelines.
//
// Escape hatch: set env var ALLOW_EMOJIS=1 to bypass.
//
// Protocol:
//   - stdin:  JSON { tool_name, tool_input, ... }
//   - exit 0: allow
//   - exit 2: block (stderr is shown to the model so it can correct)

"use strict";

if (process.env.ALLOW_EMOJIS === "1") {
  process.exit(0);
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { raw += chunk; });
process.stdin.on("end", () => {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    // Malformed input: don't block on our account.
    process.exit(0);
  }

  const tool = payload.tool_name || "";
  const input = payload.tool_input || {};

  // Collect every string field the tool will write into a file.
  const candidates = [];
  if (tool === "Write")        candidates.push(input.content);
  if (tool === "Edit")         candidates.push(input.new_string);
  if (tool === "NotebookEdit") candidates.push(input.new_source);
  if (tool === "MultiEdit" && Array.isArray(input.edits)) {
    for (const e of input.edits) candidates.push(e && e.new_string);
  }

  // \p{Extended_Pictographic} catches the standard emoji set.
  const emojiRe = /\p{Extended_Pictographic}/u;
  const offenders = [];
  for (const s of candidates) {
    if (typeof s !== "string") continue;
    const m = s.match(emojiRe);
    if (m) offenders.push(m[0]);
  }

  if (offenders.length === 0) {
    process.exit(0);
  }

  const path = input.file_path || input.notebook_path || "<unknown>";
  process.stderr.write(
    `Blocked: emoji detected in ${tool} to ${path} ` +
    `(found: ${JSON.stringify(offenders.slice(0, 5))}). ` +
    `Plugin rule: no emojis (breaks Windows terminals / pipelines). ` +
    `Use ASCII equivalents ("done", "fail", "->"). ` +
    `Bypass with env ALLOW_EMOJIS=1 if intentional.\n`
  );
  process.exit(2);
});
