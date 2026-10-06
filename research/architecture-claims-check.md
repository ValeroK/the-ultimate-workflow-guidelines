# Architecture skills: claims check

> Provenance for the factual claims in the five architecture skills under
> `.cursor-plugin/ultimate-workflow/skills/` (system-architect-engineering, greenfield-architecture,
> modularity-and-evolution, distributed-systems-resilience, operability).
> Lives at the repo root, not in the plugin payload, so it does not ship.
> Checked 2026-10-06.

## What this is, and is not

A 16-claim fact-check compiled by Gemini from a prompt asking for **primary sources only**, then
cross-read against the skill text. It is **not** an independent primary-source verification: the
authoring environment's network policy blocked every primary domain, so none of the pages below were
opened by the author of the skills.

Read the confidence per claim, not the report's "VERIFIED" column:

| Claims | Evidence the report gave | Confidence |
|---|---|---|
| 2 (AWS retries) | Quotes the AWS Builders' Library page directly: jitter, token-bucket retry limits, single-layer retries, idempotency | High |
| 3 (SRE overload) | Cites the SRE cascading-failure page; bulkhead and circuit breaker attributed to Nygard, *Release It!* (2007) | High on the attribution; matches independent recall |
| 4 (microservices.io) | Quotes the Saga, Outbox and Idempotent Consumer pages | High |
| 5, 6 (SRE metrics, canary) | Cites SRE book and workbook pages; "three pillars" correctly NOT credited to the SRE book | Medium-high |
| 1, 7, 8 | Rest largely on Wikipedia, blog posts and a ResearchGate copy | Medium |
| 9 to 16 | Fowler pages other than ParallelChange, SEI, Conway, Martin, ADR/MADR, Bezos, C4, arc42, Cockburn, Hunt and Thomas, Poppendieck, Ford et al.: **no citation at all** | Medium: consistent with independent recall, unverified |

Specific doubts to carry:

- **OWASP Top 10 edition (claim 7):** the report says 2021 is still the latest final edition and
  cites a 2017 foreword page as support. That is stale or unsupported. The skills deliberately name no
  edition, so nothing depends on it.
- **MonolithFirst quote (claim 9):** the line "Don't even consider microservices unless you have a
  system that's too complex to manage as a monolith" is attributed to MonolithFirst; it may come from
  MicroservicePremium. Publication dates given for Fowler's pages are also unverified. The skills quote
  neither.
- **ParallelChange authorship (claim 9):** credited to Danilo Sato; an independent recollection
  credits Joshua Kerievsky as originator. The skills attribute neither.
- **Overreach:** the report says Google SRE "deliberately favor" retry budgets over circuit breakers.
  That is interpretation, not a stated SRE position. The skills do not repeat it.

## What the skills claim, against the report

No skill statement is contradicted. Where wording was tightened because of it (2026-10-06):

- Retries at one layer: the AWS source states this as best practice for low-cost operations, so the
  skill now says "by default" and carries the 3^5 = 243 example.
- Retry budget: now mentions a local token bucket, which is what the AWS source describes.
- Last responsible moment: now uses the source definition ("the moment at which failing to make a
  decision eliminates an important alternative").
- ADR template: notes it follows the lightweight ADR form with MADR's options section.

Claims the skills make that the report **supports**: the eight fallacies of distributed computing
(not attributed in the skills); retry only idempotent operations with capped exponential backoff and
jitter; the outbox gives at-least-once delivery, never exactly-once; the saga as local transactions
with compensations; error budget as 1 minus the SLO; latency, traffic, errors, saturation as the SRE
golden signals; "three pillars" NOT from the SRE book; CAP "C" is linearizability, partition tolerance
is not optional, PACELC adds latency versus consistency; quality-attribute scenarios have six parts and
are ranked by importance and difficulty; Conway's law is about communication structure; fitness
functions are objective checks of architectural characteristics.

Claims the skills make that the report does **not** cover, so remain recall: the "innovation budget"
idea for boring technology; the 99.99% cost-per-nine remark; the specific thresholds and the
modular-monolith-first default (a stated opinion, supported by Fowler's MonolithFirst argument but
framed in the skills as a hypothesis).

## To close the gap

Open the network to `martinfowler.com`, `sre.google`, `aws.amazon.com`, `owasp.org`,
`microservices.io`, `sei.cmu.edu`, `learn.microsoft.com`, `c4model.com`, `arc42.org`, then re-check
claims 7 and 9 to 16 against the pages themselves and edit this note.
