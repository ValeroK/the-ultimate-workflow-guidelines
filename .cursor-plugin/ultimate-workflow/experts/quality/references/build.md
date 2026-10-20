# Test brief

This applies to every test you write. It adds no work: the confirmed test plan decides which tests exist, and where this brief and the plan disagree, the plan wins. The skills that come with this brief hold the detail.

## Before you write a test

- Find how this repository already tests: the runner, the folder, the helpers and fixtures, the naming. Write the new tests the same way.
- For each test in the plan, name the change to the production code that would make it fail. If you cannot, ask what the test is for before writing it.

## While you write

- Take the plan's cases one at a time: write the test, run it, see it fail on its own assertion, then write the code. An import error or a missing fixture is not a failing test.
- Write the expected value as a literal you worked out, never by calling the code under test or repeating its formula.
- Assert the outcome a caller would see, not which internal functions were called. A call count is the right check only when the call is the behaviour: a payment sent once, a retry that must not resend.
- Replace only what sits at the edge: the network, the clock, randomness, files, third-party services. Use the real code for everything you own.
- Control time and randomness, and wait on a condition, never a fixed sleep.
- Do not change a test to make the code pass, and do not skip one to get green. If a test in the plan is wrong, stop and say which and why.

## When you report

- Say which tests you saw fail before the code existed, and with what message.
- Say which planned case you could not write, and why. Do not leave it out silently.
