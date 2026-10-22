# Test brief

This applies to every test you write. It adds no work: the confirmed test plan decides which tests exist, and where this brief and the plan disagree, the plan wins. The skills that come with this brief hold the detail.

## Before you write

- Find how this repository already tests: the runner, the folder, the helpers and fixtures, the naming. Write the new tests the same way.
- For each test in the plan, name the change to the production code that would make it fail. If you cannot, ask what the test is for before writing it.

## While you write

- Take the plan's cases one at a time: write the test, run it, see it fail on its own assertion, then write the code. An import error or a missing fixture is not a failing test.
- Do not change a test to make the code pass, and do not skip one to get green. If a test in the plan is wrong, stop and say which and why.

## When not to

- Do not add tests the plan did not ask for to raise a count; a test with nothing it would reject costs more than it shows.
- Do not replace code you own with a double to make a test easy; the skill says where doubles belong.

## When you report

- Say which tests you saw fail before the code existed, and with what message.
- Say which planned case you could not write, and why. Do not leave it out silently.
- Give the full suite's result, naming every failure, including ones this change did not cause.
- Say what green does not prove here: which parts ran against fakes, and which against the real thing.
