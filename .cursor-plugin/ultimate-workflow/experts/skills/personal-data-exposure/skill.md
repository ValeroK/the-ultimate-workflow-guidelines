---
name: personal-data-exposure
description: Use when a change sends, logs, stores in the browser, reports or shares data about a person - log lines and request logging, error trackers (Sentry), analytics and ad calls, session replay, URLs, localStorage, model prompts and invocation logs, consent and opt-out handling (GPC), fixtures and restores from production - to find a personal value reaching a place or a recipient it should not, or a new path that skips the repository's own consent or opt-out check. Never rules on whether anything is lawful.
verified: 2026-10-22
---

# Personal data exposure

## Goal

- **Lets the expert catch:** a personal value that leaves the store that owns it for a log, an error report, an analytics or ad vendor, a URL, browser storage, a prompt or an invocation log, a fixture or a restored copy; and a new tracker or vendor call that bypasses the consent or opt-out check the repository already applies elsewhere.
- **Applies to:** added logging, error-tracking, analytics, ad and session-replay calls; request-logging configuration; `localStorage` and `sessionStorage`; consent and opt-out code; model calls carrying user data; fixtures, seeds and restore scripts.
- **Not for:** secrets and tokens (security's existing rows); a response broader than the caller needs (security's Data exposure); whether a store forgets a person (data, `erasure-and-retention`); lawful basis, consent validity, retention periods, vendor contracts and transfers (a person decides: ask in the plan, never report).

Sources: **[R]** the maintainer's live check of the GDPR (EUR-Lex), the EDPB and the ICO, the CCPA and its regulations (the CPPA's PDFs), the W3C GPC specification, docs.sentry.io, the CloudWatch Logs and Bedrock guides, the OpenTelemetry URL registry and Google Analytics help, block J (2026-10-22); **[T]** agency-agents `privacy-engineer`, awesome-copilot `gdpr-compliant`, Sushegaad `ccpa`, ECC's compliance skills (MIT), not checked; **[O]** our own reasoning. A legal text explains why a row matters; a finding states only where the value went.

## First, establish the target

- **Which fields the repository treats as personal**: schema comments, a data map, a classification annotation, or the obvious (names, emails, phones, addresses, IPs, device ids).
- **The repository's own controls**: a log scrub list or formatter, a CloudWatch data protection policy, Sentry `beforeSend`, a consent API, whether it reads `Sec-GPC`.
- Without a consent API there is no consent finding, only a plan question.

## What counts as personal

- IP addresses, cookie ids and device identifiers can identify a person (GDPR Recital 30, Article 4(1)) [R]; under the CCPA, personal information includes unique identifiers, IP addresses and cookies, and hashed identifiers remain unique identifiers [R].
- Pseudonymised data is still personal data for whoever holds the key (Recital 26) [R]; for a recipient with no means reasonably likely to re-identify it, the CJEU held it is not (C-413/23 P, 2025-09-04) [R]. A model trained on personal data is not anonymous in every case (EDPB Opinion 28/2024) [R].

## Logs and error reports

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| A whole request body, user or customer object logged carries every personal field it has [O] | `logger.info(req.body)`, `log.debug("user", user)`, request-logging middleware with bodies on | The logger's scrub list covers those fields |
| A URL with personal values in its query lands in access, CDN and tracing logs [T]; OpenTelemetry records the full URL (`url.full`) and query (`url.query`), and says credentials in a URL should be replaced with `REDACTED:REDACTED` [R] | An email, name or phone in a query string; a span or log attribute holding `url.full` with no redaction | The value is an opaque id |
| Sentry: `sendDefaultPii` is false by default (newer SDKs replace it with `dataCollection`); `beforeSend` and `beforeBreadcrumb` scrub on the client; server-side scrubbing is on by default [R]. The Python, PHP and Node SDKs capture stack local variables by default, and AI agent span attributes (`input.messages`, `tool.call.arguments`) are not scrubbed by default [R] | `sendDefaultPii: true` or a `dataCollection` setting that adds user data; `setUser` with an email; agent spans sent with prompts | A `beforeSend` that removes them |
| Session Replay masks all text and inputs by default (`maskAllText`, `maskAllInputs`) [R] | Either set to `false`, or an `unmask` added to a form | |
| CloudWatch Logs data protection policies mask at ingestion, account-wide or per log group, and only for events after the policy; `logs:Unmask` reveals [R] | A new log group for personal data outside the account policy and with no policy of its own; `logs:Unmask` granted broadly | |

## Analytics, ads and third parties

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Google Analytics forbids sending personal data (emails, names) in ids, event parameters or URLs [R]; its redaction does not cover the Measurement Protocol or Data Import [R] | `gtag('set', { user_id: user.email })`, an email in an event parameter, personal values sent through the Measurement Protocol | |
| Under the CCPA, giving identifiers to a cross-context behavioural advertising provider is "sharing", paid or not, and that provider is a third party, not a service provider [R] | A new ad pixel or conversion call that sends an email hash, cookie id or IP | |
| A new tracker or vendor call made before, or instead of, the repository's own consent check sends data for people who refused [T] | `analytics.identify(...)` or a pixel added on a path where the other calls go through `consent.allows(...)` | The repository has no consent gate (a plan question) |
| A browser's Global Privacy Control signal is an opt-out of sale and sharing under the CCPA regulations (11 CCR 7025) [R]; it arrives as `Sec-GPC: 1` and `navigator.globalPrivacyControl` [R] | A new sharing path that ignores the signal where the repository already reads it | |
| Scrolling or swiping is never consent (EDPB Guidelines 05/2020) [R] | A banner that records consent on scroll | |
| Consent can be withdrawn as easily as it was given (Article 7(3)) [R] | A migration or release that resets a stored opt-out to on | |

## Browser storage, prompts and copies

- Personal data in `localStorage` or `sessionStorage` is readable by every script on the origin and survives logout [O]. Not for an opaque id.
- Bedrock model invocation logging, off by default, can write full inputs and outputs to S3 and CloudWatch Logs [R]; a flow that sends personal data to a model with logging on stores it there [O]. Guardrails can mask personal data in requests and responses, not in tool arguments [R]. Whether the call should exist is genai's.
- A fixture, seed or test database restored from production carries real people into every developer machine and CI log [T]. The fixture's oracle is quality's.

## Excuses that do not hold

- "The function is called `redact`": open it.
- "It is hashed": a hashed email is still a unique identifier [R].
- "It is only staging": staging logs and vendors are still recipients.

## Plan questions, never findings

A new purpose or category of personal data (lawful basis); special-category or children's data; a new processor or model provider (contract status); a new Region or vendor location (transfer mechanism); profiling, monitoring or combining datasets (whether a DPIA exists: the WP29 guidelines list nine criteria, and two or more usually call for one [R]). Record the user's answer; never decide it.

## Not a finding

- A personal value written to the store that owns it.
- An internal opaque id in a log.
- A plain URL with no personal value in it.
- Anything worded as "non-compliant": the reviewer never rules on legality.
