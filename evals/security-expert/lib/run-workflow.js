'use strict';

const fs = require('node:fs');

// Runs a workflow script under stub globals so its control flow can be tested
// without the host runtime. The scripts are not modules: they `export const meta`,
// use top-level await and `return`, and read `args`, `agent`, `parallel`, `phase`
// and `log` as globals. This harness strips the meta export and wraps the body in
// an async function, which is the shape the runtime gives them.
//
// What it does NOT reproduce: real agent scheduling, schema validation, resume,
// the 16-way concurrency cap, or the host's date/random restrictions. A pass here
// proves the script's own decisions (who is spawned, with what prompt, how results
// merge), not that the host accepts the script.

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const AGENT_NAMESPACE = 'ultimate-workflow:';

function stripMeta(source) {
  const stripped = source.replace(/^export const meta = \{[\s\S]*?^\}\r?\n/m, '');
  if (stripped === source) throw new Error('run-workflow: no `export const meta = {...}` block found to strip');
  return stripped;
}

// `transform` lets a test rewrite the script text (for example to add a second
// registry entry) so behaviour that must be registry-driven is proven to be.
function loadWorkflow(file, { transform } = {}) {
  let source = stripMeta(fs.readFileSync(file, 'utf8'));
  if (transform) source = transform(source);

  return async function run(args, respond) {
    const calls = [];
    const phases = [];
    const logs = [];

    // `respond(call)` returns the agent's structured result, or throws / returns
    // null to model a failed agent. Like the host's parallel(), a failure becomes
    // null for that slot and the others still run.
    // The host resolves only the plugin-qualified name ("ultimate-workflow:uw-explorer"), so a
    // bare name fails every test here, and calls record the agent's own name for readability.
    const agent = async (prompt, opts = {}) => {
      if (typeof opts.agentType === 'string' && !opts.agentType.startsWith(AGENT_NAMESPACE)) {
        throw new Error(`run-workflow: agentType "${opts.agentType}" lacks the "${AGENT_NAMESPACE}" prefix; the host would not find it`);
      }
      const call = { prompt, ...opts };
      if (typeof call.agentType === 'string') call.agentType = call.agentType.slice(AGENT_NAMESPACE.length);
      calls.push(call);
      return respond(call);
    };
    const parallel = async (thunks) =>
      Promise.all(
        thunks.map(async (t) => {
          try {
            return await t();
          } catch {
            return null;
          }
        })
      );
    const phase = (name) => phases.push(name);
    const log = (msg) => logs.push(msg);

    const fn = new AsyncFunction('args', 'agent', 'parallel', 'phase', 'log', source);
    const result = await fn(args, agent, parallel, phase, log);
    return { result, calls, phases, logs };
  };
}

module.exports = { loadWorkflow, stripMeta };
