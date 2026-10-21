# Extraction ledger: privacy (catalogue 14), as skills under existing experts

Playbook steps 2 (sweep), 4 (compare) and 4b (ledger) for privacy. Written 2026-10-21. The maintainer decided the same day that privacy is **a skill (or skills) under existing experts, not a new expert**, so this ledger ends by naming the skills, their hosts, their selectors and the borders, not by arguing for an expert. Nothing here is shipped, and no skill row is final until the facts in section 4 are checked (playbook step 6b).

Outcomes: **taken** (would go into a skill or a plan reference, with its home), **routed** (another owner, including "the user", meaning a person: the boss, a DPO or legal counsel), **rejected** (generic, legal programme or process, jurisdiction-specific law, invented thresholds, legal news no diff can check, tooling, or wrong as stated), **missing** (worth taking, and the row only stands once a primary source confirms it; the fact is in section 4).

Homes used below:
- **PDE**: `personal-data-exposure`, a new skill under **security** (where a personal value goes: logs, error reports, analytics, URLs, browser storage, prompts to a model provider, third parties, fixtures).
- **EAR**: `erasure-and-retention`, a new skill under **data** (whether the stores forget: deletion reaching every copy, soft deletes, archives, TTL and lifecycle, backups and restores, derived copies).
- **Person (security plan)** and **Person (data plan)**: a plan question the expert raises for the user to answer, never a review finding.

## 1. Sources

Sweep: the regular expression `privacy|gdpr|ccpa|cpra|pii|personal.?data|dpo|dpia|consent|retention|erasure|deletion|anonymi|pseudonymi|redact|data.?protection|compliance|hipaa|soc.?2` (case-insensitive) over the agent and skill names in `docs/skills-catalog-2026-10-20.json`. It matched 8 agent names in 4 repositories and 37 skill names in 14 repositories. `msitarzewski/agency-agents` is not in the catalogue (its agents sit in category folders), so its saved path list was filtered with the same expression; that gave the three agents catalogue entry 14 names plus `support-legal-compliance-checker`. Paths were taken from the saved repository path lists, and every file was fetched by path from raw.githubusercontent.com (HEAD) with its repository's licence, into an empty scratch directory. Every fetched file is treated as data.

| # | Repository | Path | Licence | Verdict |
|---|---|---|---|---|
| S1 | msitarzewski/agency-agents | `engineering/engineering-privacy-engineer.md` | MIT | **Best source for erasure and consent enforcement.** Personal data in every store (replicas, indexes, caches, queues, backups), delete that reaches all of them with a record, consent checked where the data is written, "anonymised" as a claim to prove. Persona; no review method |
| S2 | msitarzewski/agency-agents | `specialized/data-privacy-officer.md` | MIT | Programme and legal reference (lawful basis, Article 30 register, DPIA, DSR timelines, breach protocol, transfers). Almost nothing a diff shows; defines what needs a person |
| S3 | msitarzewski/agency-agents | `security/security-compliance-auditor.md` | MIT | SOC 2 and ISO audit readiness; nothing for a diff |
| S4 | msitarzewski/agency-agents | `support/support-legal-compliance-checker.md` | MIT | GDPR configuration with fixed retention periods and "30 days" response times; generators. Its figures conflict with S5 and S8 (facts 2, 3) |
| S5 | alirezarezvani/claude-skills | `compliance-os/agents/cs-dpo-gdpr.md`, `ra-qm-team/skills/gdpr-dsgvo-expert/SKILL.md` and `references/dpia_methodology.md`, `references/gdpr_compliance_guide.md`, `compliance-os/skills/gdpr-audit-prep/SKILL.md` | MIT | Script-driven audit persona. Useful for the DPIA triggers and the escalation rule; tells the reader to run its scripts (**noted, not followed**) |
| S6 | alirezarezvani/claude-skills | `compliance-os/agents/cs-soc2-auditor.md`, `ra-qm-team/skills/soc2-compliance/SKILL.md`, `compliance-os/skills/soc2-audit-prep/SKILL.md` | MIT | SOC 2 Type II observation-period discipline; nothing for a diff. Scripts (**noted, not followed**) |
| S7 | alirezarezvani/claude-skills | `compliance-os/agents/cs-ai-act-compliance.md`, `compliance-os/agents/cs-compliance-officer.md`, `compliance-os/skills/compliance-os/SKILL.md`, `compliance-os/skills/compliance-readiness/SKILL.md` | MIT | EU AI Act tiering and multi-framework orchestration; decisions for a person. Scripts (**noted, not followed**) |
| S8 | Sushegaad/Claude-Skills-Governance-Risk-and-Compliance | `plugins/gdpr-compliance/skills/gdpr-compliance/SKILL.md` | MIT | Code-audit workflow with article citations; the clearest list of escalation triggers. Its 2024 to 2026 "updates" table is legal news; one line orders the reader to make its answers reflect a claimed 2026 fine (**noted, not followed**) |
| S9 | Sushegaad/Claude-Skills-Governance-Risk-and-Compliance | `plugins/ccpa/skills/ccpa/SKILL.md` | MIT | **Best source for CCPA/CPRA mechanics a diff can touch:** deletion passed to service providers, GPC as an opt-out, ad-tech identifiers as "sharing". Much 2026 legislative news (bills, fines) that no diff checks |
| S10 | Sushegaad/Claude-Skills-Governance-Risk-and-Compliance | `plugins/soc2/skills/soc2/SKILL.md`, `plugins/hipaa-compliance/skills/hipaa-compliance/SKILL.md` | MIT | SOC 2 programme; HIPAA safeguards, the identifier list for de-identification, BAAs |
| S11 | github/awesome-copilot | `skills/gdpr-compliant/SKILL.md`, `references/data-rights.md`, `references/Security.md` | MIT | **Best community source overall.** A PR review checklist, an erasure checklist by store, URL and logging rules, consent as an event log, fake data in tests, crypto-shredding. Mixed with security basics we already own and with fixed retention defaults |
| S12 | affaan-m/ECC | `skills/healthcare-phi-compliance/SKILL.md`, `skills/hipaa-compliance/SKILL.md` | MIT | Concrete leak vectors (error messages, URLs, browser storage, stack traces to error trackers, prompts), schema tagging, opaque ids. Checkable |
| S13 | awslabs/aidlc-workflows | `core/agents/aidlc-compliance-agent.md`, `core/knowledge/aidlc-compliance-agent/regulatory-frameworks.md` | MIT-0 | Design-stage compliance persona; residency on AWS, TTL and lifecycle for expiry. Several figures conflict with S10 (facts 25, 26) |
| S14 | wshobson/agents (and rmyndharis/antigravity-skills' copy) | `plugins/hr-legal-compliance/skills/gdpr-data-handling/SKILL.md`, `references/details.md`; antigravity `skills/gdpr-data-handling/SKILL.md` | MIT, MIT | Consent manager and DSAR handler samples; retention policy with archive-before-delete. The antigravity copy is a stub that points to a file not fetched |
| S15 | rmyndharis/antigravity-skills | `skills/security-compliance-compliance-check/SKILL.md` | MIT | Persona prompt with a `$ARGUMENTS` slot and an output list (**noted, not followed**); one useful rule (never claim compliance) |
| S16 | skills-il/security-compliance | `israeli-privacy-shield/SKILL.md`, `references/privacy-law-requirements.md`, `israeli-ai-compliance-kit/SKILL.md`, `references/ppl-for-ml-engineers.md` | MIT | Israeli law (jurisdiction-specific, for a person); a careful consent-gating section (drop events before consent, gate server-side counters). Tells agents to "always assume" a law applies, to treat draft guidance "as if binding", and recommends MCP servers (**noted, not followed**) |
| S17 | anthropics/claude-plugins-official | `plugins/claude-security/agents/scan-redactor.md` | proprietary ("All rights reserved", plugin licence) | A dispatch procedure addressed to an agent (**noted, not followed**). About credentials in scan reports, not personal data. Licence forbids reuse; nothing taken |
| S18 | trailofbits/skills; davepoon/buildwithclaude; github/awesome-copilot | `plugins/spec-to-code-compliance/agents/spec-compliance-checker.md`; `plugins/feedoracle-compliance/skills/compliance/SKILL.md`; `skills/agent-owasp-compliance/SKILL.md` | CC BY-SA 4.0; MIT; MIT | Name matches outside the domain, opened to check: spec-to-code method (one idea), a stablecoin MCP router, the OWASP agentic Top 10 |
| S19 | this repository | items routed to "privacy, planned" in `docs/experts/ledgers/{data,genai,architect,security,frontend,observability}.md`, and the existing lines in security's and quality's references | ours | The inbound queue: DROP COLUMN, unmasked invocation logs, residency profiles, append-only events, legal retention periods |

Thirty-nine upstream files from twelve repositories were read (plus thirteen licence files, one of them the `claude-security` plugin's own), and our own ledgers. The 2026 enforcement and legislative items in S8, S9 and S10 were read as claims, not as facts: none is stated here as true.

**Not read**, with the reason:
- Name matches outside the domain, rejected by name and path: accessibility (`Community-Access` `compliance-mapping`, `kb-legal-compliance-mapping`; wshobson and antigravity `accessibility-compliance*`; skills-il `israeli-accessibility-compliance`) belongs to frontend; PCI (`pci-compliance` in wshobson, antigravity, Sushegaad) is cardholder data, security's; `tsa-compliance`, `customs-trade-compliance`, `mortgage-compliance`, `israeli-amuta-compliance`, `israeli-ecommerce-compliance`, tech-leads-club `expansion-retention` (customer churn) and aws `configuring-vpc-endpoints-for-private-aws-service-access` (private networking) are not about personal data.
- Copies: alirezarezvani's `.gemini/`, `.codex/`, `.hermes/`, `.vibe/` and `docs/agents/` mirrors; ECC's `docs/ja-JP` and `docs/zh-CN` translations; awslabs' `docs/guide` and `docs/reference` copies of the compliance agent; Sushegaad's zipped `.skill` bundles and its `grc-workspace/` eval outputs.
- Privacy-relevant Sushegaad plugins the regular expression did not match by name: `iso27701`, `dpdpa`, `lgpd`, `vn-pdpl` (and `eu-ai-act`, `iso42001`). Jurisdiction or management-system frameworks; the GDPR and CCPA skills already showed this repository's pattern (programme guidance plus legal news). Worth a look only if a served product falls under one of those laws.
- Implementation code found by path while filtering (JuliusBrussee/caveman `shared/platform/redact/*.go`, alirezarezvani `handoff/scripts/redaction_linter.py`): code, not guidance, and running or adapting it is out of scope.
- Reference files beyond three per skill (S5's BDSG and audit playbook, S8's document templates, S9's comparison file, S10's privacy-rule and security-rule references).

## 2. Items, per source

Owners when routed: security, data, genai, architect, devops, developer, quality, frontend, the user.

### S1 agency-agents `privacy-engineer`

| Item | Outcome | Home or owner |
|---|---|---|
| Personal data turns up in application and access logs, error traces and analytics event streams nobody classified | taken | PDE (the sinks; facts 27, 28, 30 for the vendors' own redaction and policies) |
| Personal data also sits in caches, search indexes, message queues, object storage and backups, which a deletion must reach | taken | EAR (the store list; facts 32 to 34) |
| A delete that clears one table is not erasure: it must reach replicas, the warehouse, indexes, caches and third parties | taken | EAR; facts 4, 16 |
| Each deletion leaves a record of what was deleted where; a store kept for a legal reason is recorded as kept, not silently skipped | taken | EAR ([T]; a deletion loop that swallows one store's failure is the diff signal) |
| Consent must gate the write or the call where the data is used; a stored opt-out the pipeline never reads is no control | taken | PDE consent section ([T]; a finding only where the repository has a consent check the new call bypasses) |
| Pseudonymise an identifier before it leaves for a vendor | taken | PDE; facts 9, 15 |
| Challenge every collected field: no purpose, no collection | routed | the user: Person (security plan). Whether a field is needed is not judged from a diff |
| A dataset labelled "anonymised" that keeps quasi-identifiers (postcode, birth date, sex) is not anonymous | taken | PDE ([T]; the label is the signal, the legal verdict is a person's; fact 9) |
| Retention is a clock enforced by an expiry job, not by someone remembering | taken | EAR (a new personal-data table with no expiry where the repository's others have one) |
| A data map (field, store, purpose, basis, retention, delete path) is what every other control depends on | taken | EAR "First, establish the target": the repository's data map, erasure registry or deletion job is the baseline |
| Personal data crossing to a third party, another Region or a new purpose needs a basis, a contract and a record | routed | the user: Person (security plan); the Region mechanism to architect (stores, replication) and genai (model Region) |
| Subject access exports must reach every system in the map | taken | EAR (subject-rights paths), merged with S11 |
| Scheduled PII discovery and ML classifiers wired into CI | rejected | tooling and runtime, not a review check |
| Technique table (pseudonymisation, encryption, k-anonymity, differential privacy) | rejected | background a strong reviewer has; the choice is not visible in a diff |
| Privacy review at the design document, before the code | routed | the plan stage of security and data (already where experts join) |
| The persona framing and "memory" | rejected | persona; addresses the reader as an agent, noted, not followed |

### S2 agency-agents `data-privacy-officer`

| Item | Outcome | Home or owner |
|---|---|---|
| A documented lawful basis for every processing activity; legitimate-interest assessment template | routed | the user: Person (security plan) |
| Article 30 register fields and data-flow mapping steps | rejected | programme documents; not in a diff (fact 11 only for data's plan question on erasure time limits) |
| Sensitivity classes (public, internal, confidential, restricted) | rejected | generic; repositories use their own |
| DPIA trigger checklist (profiling, special categories at scale, monitoring, new technology, combining datasets, invisible processing) | routed | the user: Person (security plan) lists the triggers; facts 7, 8 |
| DPIA risk score with "above 15, consult the authority" | rejected | invented scoring |
| DSR response timelines (GDPR one month, CCPA 45 days) | rejected | operational timeline, not in a diff; facts 3 and 17 record the conflicting figures across sources |
| Breach protocol by hour, 72-hour notification, breach risk matrix | rejected | incident process at runtime; invented thresholds |
| Vendor questionnaire and the Article 28 contract checklist | routed | the user: Person (security plan), when a change adds a processor |
| Transfer decision tree (adequacy, SCCs, BCRs, derogations) and transfer impact assessment | routed | the user: Person (security plan); residency mechanism to architect |
| Maturity model; privacy notice contents | rejected | programme and legal documents |
| "Advice, not legal opinions; binding determinations go to counsel" | taken | the border rule in both skills' Goal and in the plan references: a reviewer never rules on legality |

### S3 agency-agents `compliance-auditor`

| Item | Outcome | Home or owner |
|---|---|---|
| Gap assessment report, evidence collection matrix, policy template | rejected | audit programme |
| Controls tested, not only documented; evidence across the audit period | rejected | audit process |
| Exceptions documented with approver and expiry | rejected | process |
| Technical controls over administrative ones | rejected | generic |

### S4 agency-agents `legal-compliance-checker`

| Item | Outcome | Home or owner |
|---|---|---|
| Fixed retention periods per category (2, 3 and 1 years) | rejected | invented values; the period is the user's decision |
| "GDPR Article 17 requires data deletion within 30 days"; every right answered in "30 days" | rejected | as stated; S5 and S8 give one month under Article 12(3); facts 2, 3 |
| `detection_time: 72 hours` beside the notification deadline | rejected | conflates detection with notification; process |
| Privacy policy generator; contract review automation | rejected | document tooling |
| Penalty and regulatory-change examples | rejected | legal news |
| `privacy_by_design` flags (minimisation true, purpose limitation true) | rejected | slogans |

### S5 alirezarezvani `cs-dpo-gdpr`, `gdpr-dsgvo-expert`, `gdpr-audit-prep`

| Item | Outcome | Home or owner |
|---|---|---|
| Checker pattern: logging personal data | taken | PDE, merged with S11's logging rows |
| Checker patterns: indefinite data retention, deletion functionality disabled | taken | EAR (a delete path commented out, feature-flagged off or returning early) |
| Checker pattern: missing consent mechanism | taken | PDE consent section, merged with S1 |
| Checker pattern: unencrypted sensitive data | routed | security (cryptography, existing area) |
| DPIA mandatory under Article 35(3); WP29 criteria, "two or more" means likely required | routed | the user: Person (security plan); facts 7, 8 |
| DSR deadline one month under Article 12(3), extendable by two further months | rejected | operational, not in a diff; fact 3 |
| Article 9 special categories | routed | the user: Person (security plan) trigger: special-category data |
| Portability covers data the subject provided, not derived data; machine-readable | rejected | legal interpretation |
| Adequacy country list | rejected | changes over time; a person's decision |
| Article 25 by default: only necessary data, limited storage period, limited accessibility | missing | PDE consent section (optional collection off by default); fact 5 |
| Novel or ambiguous cases go to counsel | taken | merged with S2's border rule |
| Erasure workflow covers backups and processors | taken | EAR, merged with S1; facts 4, 14 |
| Scripts: compliance checker, DPIA generator, DSR tracker; "run gdpr_compliance_checker.py" | rejected | tooling; instructions to run them noted, not followed |
| Article 33(5) breach log | rejected | process |
| German BDSG overlay | rejected | jurisdiction-specific law |

### S6 alirezarezvani `cs-soc2-auditor`, `soc2-compliance`, `soc2-audit-prep`

| Item | Outcome | Home or owner |
|---|---|---|
| Trust Services Criteria (CC1 to CC9, P1 to P8) and control matrices | rejected | audit framework, not a diff check |
| C1.3 and P4: disposal and retention schedules | rejected | headings only, nothing checkable beyond EAR's rows |
| Change management through Git approvals | routed | devops (branch protection and approvals) |
| Observation period, exceptions and evidence packs | rejected | audit process |
| Access reviews | rejected | process |
| Backup restore tests | routed | architect (recovery) |
| Vendor risk tiers | routed | the user: Person (security plan) |
| Scripts (evidence tracker, control matrix builder) | rejected | tooling; noted, not followed |

### S7 alirezarezvani `cs-ai-act-compliance`, `cs-compliance-officer`, `compliance-os`, `compliance-readiness`

| Item | Outcome | Home or owner |
|---|---|---|
| AI Act risk tier, Annex IV pack, conformity route, role-based obligations | routed | the user: Person (genai plan: a model used for a regulated decision) |
| Article 50 transparency (telling people they talk to an AI) | routed | the user (whether it applies); frontend (the markup) |
| Article 10(5) processing special categories to detect bias | routed | the user |
| Cross-framework mapping, evidence pools, audit calendars | rejected | programme |
| Systemic-risk compute threshold for general-purpose models | rejected | not in a diff |
| Scripts (risk classifier, obligation tracker, framework selector) | rejected | tooling; noted, not followed |

### S8 Sushegaad `gdpr-compliance`

| Item | Outcome | Home or owner |
|---|---|---|
| Personal data includes IP addresses, device ids and cookie identifiers (Article 4(1), Recital 30) | missing | PDE (an IP or device id in a log or event is personal data); fact 9 |
| Inferred data that could re-identify someone | taken | PDE, merged with S1's quasi-identifier row |
| A lawful basis per processing activity | routed | the user: Person (security plan) |
| Fields reused for an undisclosed second purpose | routed | the user: Person (security plan); "collected but unused" is not reliably visible in a diff |
| Article 32 measures: encryption, pseudonymisation, least privilege | routed | security (cryptography, IAM); fact 6 |
| Retention: a defined period, a deletion or anonymisation mechanism, backups included | taken | EAR; facts 1, 14 |
| Processors under contract; transfer mechanisms; the Data Privacy Framework under appeal | routed | the user: Person (security plan) |
| A RoPA entry per data flow | rejected | programme document |
| Severity guide with coloured markers | rejected | we have our own severity |
| Escalation triggers: special categories, children, employee data, AI training on personal data, transfers, enforcement risk | taken | Person (security plan): the trigger list |
| AI models trained on personal data are not automatically anonymous (EDPB Opinion 28/2024) | missing | Person (security plan), border genai; fact 13 |
| Pseudonymised data may not be personal data in a recipient's hands (CJEU, EDPS v SRB) | missing | PDE (whether a hashed id sent to a vendor is a finding); fact 15 |
| Age of consent differs by Member State | routed | the user |
| 2024 to 2026 updates table (fines, EDPB 2026 guidelines, CJEU rulings, UK and Digital Omnibus changes) | rejected | legal news no diff can check; the line telling the reader to make answers "reflect" a claimed 2026 fine is noted, not followed |
| Document drafting workflow | rejected | legal documents |

### S9 Sushegaad `ccpa`

| Item | Outcome | Home or owner |
|---|---|---|
| Applicability thresholds (consumer count, revenue share) | rejected | a business fact for a person |
| Service provider, contractor or third party, per recipient | routed | the user: Person (security plan), when a change adds a recipient |
| A provider of cross-context behavioural advertising is a third party, whatever the contract says | missing | PDE (a new pixel or ad-tech call is a sharing); fact 21 |
| Cookie ids, device fingerprints, hashed emails or IPs passed to ad tech count as "sharing" even unpaid | missing | PDE; fact 22 |
| Global Privacy Control must be honoured as a valid opt-out of sale and sharing | missing | PDE consent section (a new sharing path that ignores the signal the repository already reads); fact 18 |
| An opt-out is passed on to service providers and contractors within a set time | missing | PDE consent section (opt-out not forwarded to the vendor client); fact 19 |
| Deletion must be passed on to service providers and contractors | missing | EAR; fact 16 (which also asks whether third parties are reached) |
| An unverifiable deletion request is still treated as an opt-out of sale and sharing | missing | EAR (a DSR handler that drops it); fact 20 |
| Keep the deletion-request record as proof; it does not contradict the deletion | taken | EAR, merged with S1's record row ([T]) |
| Response timelines (10 business days to confirm, 45 days, one extension) | rejected | operational; fact 17 records the figure |
| Identity verification by matched data points and a declaration | rejected | process |
| Opt-in for minors' data | routed | the user: Person (security plan) trigger: children |
| Sensitive personal information and the "limit use" right | routed | the user: Person (security plan) trigger: special categories |
| Retention periods disclosed; no longer than reasonably necessary | routed | the user (the period); EAR enforces whatever period the repository sets |
| Contract terms with service providers | routed | the user |
| Cybersecurity audits, risk assessments, ADMT deadlines | rejected | legal programme and dates |
| Penalties, 2026 enforcement cases, 2026 bills (deletion "from or about", children's package, data-broker deadlines, vetoes) | rejected | legal news no diff can check |
| A software update must not silently revert a stored privacy setting (the source cites AB 2561) | missing | PDE consent section (a migration or default change that resets a stored opt-out); fact 23 |
| A suppression list keeps deleted people deleted when data is re-imported (the source cites SB 923) | missing | EAR (a restore or re-import that brings a deleted person back); facts 14, 23 |

### S10 Sushegaad `soc2`, `hipaa-compliance`

| Item | Outcome | Home or owner |
|---|---|---|
| SOC 2 common gaps, policy set, evidence catalogue | rejected | programme |
| HIPAA technical safeguards: audit controls, encryption "addressable" | routed | security (cryptography); fact 25 |
| Access audit: who read which health record, when, from where | taken | PDE ([O]: a new read or export path for sensitive records that skips the repository's own access-audit call) |
| "Minimum retention 6 years for HIPAA-related records" | rejected | as a log rule; S13 applies it to audit logs; fact 25 asks which records |
| De-identification by removing the listed identifiers (the source counts 18) | missing | PDE (a fixture or export called de-identified that keeps dates, postcodes or record numbers); fact 24 |
| A business associate agreement before PHI reaches a vendor or cloud | routed | the user: Person (security plan) |
| Regulatory status as of September 2026 (proposed Security Rule changes) | rejected | legal news |
| AES-256 at rest, TLS 1.2 in transit as industry standard | routed | security |

### S11 awesome-copilot `gdpr-compliant` and its references

| Item | Outcome | Home or owner |
|---|---|---|
| A retention expiry column on every personal-data table, set at insert | taken | EAR ([T]; only where the repository's other tables have one) |
| Optional collection and analytics off by default until consent | missing | PDE consent section; facts 5, 10 |
| DPIA before high-risk processing; RoPA updated; contract before a sub-processor | routed | the user: Person (security plan) |
| Separate DTOs, response projections, masking at the edge, sensitive fields out of list views | routed | security (existing "responses broader than the caller needs") |
| Never log full request or response bodies that may hold personal data | taken | PDE ([T]; request-logging middleware, `req.body`, HTTP client debug logging) |
| No personal data in URL paths or query strings (CDN and access logs, browser history, Referer) | taken | PDE ([T]; fact 29 for what tracing records) |
| Personal data to ad networks; support tickets used to train models | routed | the user: Person (security plan) (new purpose); the ad-network half is S9's rows |
| Retention enforced by a scheduled job; delete or anonymise at expiry | taken | EAR, merged with S1's clock row |
| Recommended retention table (audit logs 12 to 24 months, analytics 13 months, and so on) | rejected | fixed values; the user decides |
| Soft delete with a scheduled hard delete | taken | EAR ([O], as the rule: a `deleted_at` flag alone is not erasure) |
| Identity from the token not the body, ownership checks, opaque ids, CORS allowlist, rate limits | routed | security (authorization, existing) |
| Mask client IPs in application logs | missing | PDE (a new IP field in logs where the repository masks or drops it elsewhere; the mask width is opinion); fact 9 |
| No passwords, tokens or session ids in logs | routed | security (secrets, existing) |
| Log the event with an internal user id, not the email | taken | PDE ([T]) |
| Audit logs apart from application logs, with their own retention and access | routed | architect (log retention as a system setting, `aws-well-architected`) and security (access) |
| Generic error responses with no personal data | routed | security (existing Data exposure) |
| Encryption standards; column-level encryption for sensitive fields | routed | security |
| Password hashing | routed | security |
| Secrets in a manager; `.gitignore` entries | routed | security |
| Data that can be re-identified by linkage is not anonymised | taken | PDE, merged with S1 |
| Pseudonymisation key kept apart from the pseudonymised data | routed | security (key management) |
| On erasure, anonymise records that must be kept (audit, financial) instead of deleting them | taken | EAR ([T]; fact 2 for the Article 17(3) exceptions) |
| Crypto-shredding: delete the per-user key and the encrypted events become unreadable | taken | EAR ([T]; the key's copies in backups and caches are the catch; fact 14) |
| No production personal data in dev, staging or CI; no production restore to non-production without scrubbing | taken | PDE (fixtures and restores; border quality; quality prompt 4 item I) |
| Consent stored as an immutable event log with the policy version, not a boolean overwritten in place | missing | PDE consent section; fact 10 |
| Analytics and marketing SDKs loaded only after consent | taken | PDE consent section ([T]) |
| No pre-ticked boxes, no bundled consent, no dark patterns | routed | frontend (the markup); the user (whether consent is valid) |
| Backups confined to EEA Regions | routed | architect (residency of stores); fact 37 |
| PR checklist: retention job and erasure pipeline cover each new store or field | taken | EAR (the core row) |
| PR checklist: the data export includes each new personal field | taken | EAR (subject-rights paths, [T]) |
| New cloud resources tagged `DataClassification` | rejected | repository convention |
| New storage Regions within the EEA or covered by SCCs | routed | the user (lawfulness), architect (Region) |
| CI secrets masked in pipeline logs | routed | security (`ci-workflow-security`) |
| Erasure checklist by store: replicas, search index, cache, object storage, email-service logs, analytics deletion API, audit logs anonymised, backups, CDN cache, sub-processors | taken | EAR (the store list); facts 4, 16, 32 to 34 |
| "Respond within 30 calendar days" | rejected | as stated; fact 3 |
| KMS key-access logging; database audit of SELECT on sensitive tables | routed | security |
| CI gate that warns on log statements naming PII fields | rejected | tooling (the idea informs PDE's selector) |
| Breach runbook | rejected | process |

### S12 ECC `healthcare-phi-compliance`, `hipaa-compliance`

| Item | Outcome | Home or owner |
|---|---|---|
| No patient-identifying data in errors thrown to the client | routed | security (existing Data exposure) |
| Never log whole patient or user objects | taken | PDE ([T]; whole-object logging is the non-obvious form) |
| Opaque internal ids in logs and URLs, never record numbers or national ids | taken | PDE ([T]) |
| No identifying data in query strings or path segments | taken | PDE, merged with S11 |
| No PHI in `localStorage` or `sessionStorage` | taken | PDE ([T]; border frontend: the storage is a sink, the component is frontend's) |
| No service-role key in client code | routed | security |
| Scrub stack traces before they go to an error tracker | taken | PDE ([T]; fact 27) |
| Personal columns marked in the schema (column comments) | taken | EAR "First, establish the target" ([T]: the repository's own markers are the baseline) |
| Row-level security per facility | routed | architect (tenancy) and security |
| Insert-only audit table (no update or delete policy) | routed | security (tamper resistance) |
| Audit entries that copy before and after values of personal fields | taken | EAR ([O]: the copy is a store the erasure must reach) |
| No PHI in prompts, analytics events or crash reports | taken | PDE (prompt sink; border genai) |
| Model and SaaS providers blocked until their agreement status is known | routed | the user: Person (security plan) |
| Session timeout; authenticated PHI endpoints | routed | security |
| Deployment checklist | rejected | duplicates the rows above |

### S13 awslabs aidlc `aidlc-compliance-agent` and `regulatory-frameworks`

| Item | Outcome | Home or owner |
|---|---|---|
| Classify data assets and map subject rights to system capabilities | rejected | programme; EAR's baseline row holds the checkable part |
| Audit trail: who did what, restricted log access, auditing access to logs | routed | security |
| PCI requirements; tokenisation to shrink scope | routed | security |
| A BAA with the cloud provider; only eligible services for PHI | routed | the user: Person (security plan) |
| "Encryption satisfies the Safe Harbor provision" | rejected | as stated; fact 26 checks what encryption changes under HIPAA |
| Audit logs kept 6 years for HIPAA, 1 year for PCI | rejected | as stated; fact 25 |
| Breach notification within 60 days | rejected | process; fact 26 records the figure |
| Soft delete with configurable retention; DynamoDB TTL or S3 lifecycle for expiry | taken | EAR (TTL is eventual, data prompt 6 E; lifecycle on versioned buckets, fact 32) |
| Restrict Regions with SCPs; replication only to approved Regions | routed | architect (residency of stores); fact 37 |
| Config rules, conformance packs, `cdk-nag` compliance checks | routed | devops (policy tooling) |
| CloudTrail to an Object Lock bucket | routed | security |
| PIA steps | routed | the user: Person (security plan) |
| The GRC persona | rejected | persona; noted, not followed |

### S14 wshobson `gdpr-data-handling` (and the antigravity copy)

| Item | Outcome | Home or owner |
|---|---|---|
| Data categories with "children under 16, parental consent" | routed | the user: Person (security plan) |
| "Don't ignore DSARs: 30-day response required" | rejected | as stated; fact 3 |
| Consent manager that overwrites one consent document in place | rejected | sample code; S11's event-log row holds the point |
| DSAR erasure per data source, recording why a source kept data | taken | EAR, merged with S1's record row |
| Retention policy with `archive_before_delete`: the archive becomes a new store | taken | EAR ([O]: an archive step the erasure path must also reach) |
| Fixed retention periods (3 years, 7 years for tax, 2 years) | rejected | fixed values; the user decides |
| Cookie banner markup | routed | frontend |
| antigravity `gdpr-data-handling` | rejected | a stub copy of the wshobson skill |

### S15 antigravity `security-compliance-compliance-check`

| Item | Outcome | Home or owner |
|---|---|---|
| Persona prompt with `$ARGUMENTS`; eight-part output (policies, training, scripts) | rejected | persona; noted, not followed |
| Never claim compliance without a formal audit | taken | both skills' "Not a finding": a reviewer never writes "compliant" or "non-compliant" |

### S16 skills-il `israeli-privacy-shield`, `israeli-ai-compliance-kit`

| Item | Outcome | Home or owner |
|---|---|---|
| Israeli Privacy Protection Law, Amendment 13, security levels, database registration, breach reporting | rejected | jurisdiction-specific law; a person |
| Consent state with a version that forces a new prompt | rejected | UI design opinion |
| Session replay and error monitoring with user data are optional categories behind consent | taken | PDE consent section ([T]; fact 27 for the vendor defaults) |
| "No choice yet" kept distinct from "rejected" | routed | frontend |
| Consent kept in sync across tabs | routed | frontend |
| Dismissing the banner (Escape, close) counts as refusal | routed | frontend (the behaviour); fact 12 for the legal claim |
| Reject and Accept with equal visual weight | routed | frontend (the markup); the user (validity) |
| Trackers not rendered until their category is allowed | taken | PDE, merged with S11's SDK row |
| Events emitted before consent are dropped, not queued | taken | PDE consent section ([T], non-obvious: a queue replays them after a later grant or leaks them on a refusal) |
| Server-side analytics counters gated on the consent cookie | taken | PDE, merged with S1's write-path row |
| Consent decisions sent as analytics events for the audit trail | rejected | opinion; it sends the record to the vendor it gates |
| Derived features and training sets made from personal data are personal data too | taken | EAR ([O]: derived tables and feature stores are copies the erasure must reach) |
| Memorisation testing of models on sensitive classes | routed | genai |
| Scraping personal data for AI training (the source cites a draft Israeli guidance) | rejected | jurisdiction-specific draft |
| "Always assume Amendment 13 applies", "align with it as if binding", "Recommended MCP servers" | rejected | instructions to an agent; noted, not followed |

### S17 anthropics `scan-redactor`

| Item | Outcome | Home or owner |
|---|---|---|
| The whole file: a restricted dispatch procedure addressed to an agent | rejected | proprietary licence forbids reuse; nothing taken; noted, not followed |
| Its topic: credential values left in a security scan's report files | routed | security (secrets) |

### S18 off-domain name matches

| Item | Outcome | Home or owner |
|---|---|---|
| trailofbits: a function's name is not evidence; open `checkBounds` before calling the requirement met | taken | PDE and EAR "Excuses that do not hold": a call named `redact`, `anonymize`, `scrub` or `forgetUser` counts only after reading what it does (idea only; the licence is CC BY-SA, no text taken) |
| davepoon `feedoracle-compliance`: MiCA stablecoin evidence through an MCP | rejected | off-domain |
| awesome-copilot `agent-owasp-compliance`: OWASP agentic Top 10 checks | routed | security (agent, skill, hook and MCP surface) |

### S19 this repository: items already routed to privacy

| Item | Outcome | Home or owner |
|---|---|---|
| data: DROP COLUMN leaves the values on disk until the table is rewritten | taken | EAR (a "removed" personal column that is still on disk and in backups); data fact 3, and fact 35 for DELETE before VACUUM |
| data: DynamoDB TTL deletes are eventual; epoch seconds in a Number attribute | routed | data (already in data's review TTL category); EAR points to it and does not repeat it; fact 36 asks only the global-table and PITR half |
| genai: Guardrails masking applies to the response; model invocation logging records prompts unmasked | taken | PDE (invocation logging turned on for a flow that sends personal data; border genai); genai fact 15, listed here as fact 31 |
| genai: the inference profile prefix is a residency decision | routed | genai (stays its plan question); genai fact 19 |
| genai: bias, harmful content and responsible-AI review; content policy | routed | the user (genai's "content policy (privacy, planned)" becomes the user's) |
| genai: privacy-preserving ML | routed | the user |
| architect: HIPAA, PCI and other compliance | routed | the user: Person (security plan) |
| architect: "events are never changed or deleted" conflicts with deletion duties | taken | EAR ([O]: an append-only store or topic with personal data and no erasure route such as crypto-shredding or compaction); fact 34 |
| architect: retention and privacy visible in schemas | taken | EAR, merged with S12's schema-marker row |
| security: PII handling as compliance; PII in logs and responses stays Data exposure | routed | security (PDE deepens it and must not repeat the category) |
| frontend: legal and compliance overview | routed | the user |
| observability: a legal retention period | routed | the user (the value); EAR checks it is enforced |
| quality: real credentials and personal data in fixtures | routed | security (PDE holds the personal-data half; quality keeps whether the test can fail) |

**Count** (from a script over the tables above): 217 items. Taken 57, routed 76, rejected 68, missing 16. Every missing row names its section 4 fact, and every section 4 fact is cited by at least one row. Merged rows (the same idea from a second source) are counted once per source, as in the other ledgers.

## 3. Today's rows, value test

No privacy skill exists, so there are no skill rows to test. The lines that already touch privacy in shipped references, and what happens to each:

| Where | Line | Decision |
|---|---|---|
| security `plan.md` | "Secrets and personal data. What sensitive value is created, stored, logged or returned?" | keep; add the "needs a person" questions beside it (section 5) |
| security `review.md` | "Data exposure. Secrets or personal data written to logs or responses ..." | keep; PDE adds only what this line does not already make a strong reviewer see |
| security `review.md`, Do not report | "Logging a secret or personal data in plaintext is a vulnerability; logging a URL is not" | merge: a URL that carries personal data in its query is a PDE row; the plain URL stays not a finding |
| quality `plan.md` | "Fixtures and factories ... hold no production or personal data" | keep (quality's oracle); PDE holds the restore-from-production half |
| data `review.md` | TTL attribute in the wrong unit or type | keep; EAR points to it |

## 4. Facts that need a primary-source check

One checkable sentence or question each, with the primary source that should hold it. None is stated here as true: each is either a claim attributed to an upstream source or a question to answer from the page. Research prompt 11 in `docs/expert-research-prompts.md` (not run) asks for this area in outline; this list is what it should answer exactly. Already asked elsewhere and not repeated: **data fact 3** (DROP COLUMN keeps values until a rewrite), **data prompt 6 E** (DynamoDB TTL behaviour), **genai fact 15** (Guardrails masking and unmasked invocation logs), **genai fact 19** (inference profile geography), **quality prompt 4 item I** (secrets and personal data in fixtures).

GDPR (Regulation (EU) 2016/679, EUR-Lex CELEX 32016R0679, consolidated text):
1. S8 cites Article 5(1)(c) for data minimisation, 5(1)(e) for storage limitation and 5(2) for accountability. Quote each, with any exception 5(1)(e) states. (Article 5)
2. S5 lists grounds for erasure and exceptions (legal obligation to retain, legal claims, public health, archiving, freedom of expression). Quote Article 17 in full: its timing words, the grounds, any duty toward other controllers, and the exceptions. Does Article 17 itself state a number of days? S4 says "within 30 days". (Article 17)
3. Article 12(3): the period to act on a request and its extension. S5 and S8 say one month, extendable by two further months; S4, S11 and S14 say 30 days. (Article 12)
4. Does the GDPR oblige a controller to pass an erasure on to the recipients it disclosed the data to, and with what exceptions? S1 and S11 say the erasure must reach third parties and sub-processors; S5 says the workflow "covers backups + processors". Quote the article that holds it, if any (Article 19 is the [O] candidate to check first). (EUR-Lex)
5. Quote Article 25(1) and 25(2). S5 says by design names pseudonymisation and by default limits the data processed, the collection scope, the storage period and accessibility; S11 says optional collection must default to off. Does 25(2) say that? (Article 25)
6. Quote Article 32(1)(a) to (d), the measures listed. (Article 32)
7. Quote Article 35(1), 35(2) (seek the DPO's advice), 35(3)(a) to (c) and 35(7) (contents); and Article 36(1) (prior consultation). (Articles 35, 36)
8. The criteria in the EDPB-endorsed WP29 guidelines on DPIA (WP248 rev.01): how many, which, and whether "two or more" is stated as the rule of thumb. S5 lists ten including "data transfer outside the EU"; S2 lists eight triggers; S11 lists six. (EDPB, endorsed WP29 guidelines)
9. S8 says personal data includes IP addresses, device ids and cookie identifiers (citing Article 4(1) and Recital 30); S1 and S11 say pseudonymised data is still personal data and anonymised data falls outside the Regulation. Quote Article 4(1), Article 4(5), Recital 26 and Recital 30. (EUR-Lex)
10. S11 says consent must be kept as an immutable record with the policy version so it can be shown later; S5 says withdrawing must be as easy as giving. Quote Article 7(1) and 7(3), and say whether either requires a kind of record. (Article 7)
11. Article 30(1)(f): the envisaged time limits for erasure in the record. (Article 30) [plan reference only]
12. What EDPB Guidelines 05/2020 on consent say about scrolling, continued browsing or closing a banner as consent. S16 says Escape or close must count as reject, under Article 4(11) and EDPB guidance. (EDPB Guidelines 05/2020)
13. What EDPB Opinion 28/2024 says on whether a model trained on personal data is anonymous. (EDPB Opinion 28/2024)
14. What a supervisory authority's published guidance says about erasure and backups. S11 says "accept that backups expire naturally"; S1 says tombstone and delete on restore. (EDPB guidance, or the ICO's right-to-erasure guidance on backups)
15. The CJEU judgment in EDPS v SRB (S8 cites it) on whether pseudonymised data is personal data for a recipient that cannot re-identify it: case number, date, holding. (CJEU, curia.europa.eu)

CCPA/CPRA (Cal. Civ. Code Title 1.81.5 on leginfo.legislature.ca.gov; CCPA Regulations, 11 CCR section 7000 and following, on cppa.ca.gov):
16. S9 says that on a deletion request the business must delete the information and direct its service providers and contractors to delete it (citing section 1798.105). Quote the subsection, and say whether it also reaches third parties to whom the information was sold or shared, and with what exceptions. (Civ. Code 1798.105)
17. Section 1798.130(a)(2): the response period and its extension; S2 and S9 say 45 days plus 45. (Civ. Code 1798.130)
18. 11 CCR 7025: how a business must treat an opt-out preference signal, whether GPC is one, and what it must do for a browser and for a known consumer. Also, from the GPC specification, the request header name and value and the DOM property. (11 CCR 7025; W3C Global Privacy Control specification)
19. The regulation section and period for passing an opt-out to service providers, contractors and third parties; S9 says 15 business days. (11 CCR 7026)
20. The regulation section stating that an unverifiable deletion request is treated as an opt-out of sale or sharing; S9 cites 7022(f). (11 CCR 7022)
21. The regulation section stating that a provider of cross-context behavioural advertising is a third party, not a service provider; S9 cites 7050(c). (11 CCR 7050)
22. S9 says cookie ids, device fingerprints, hashed emails and IP addresses passed to ad tech for cross-context behavioural advertising are "sharing" even with no payment. Quote the section 1798.140 definitions of "personal information" and "share", and say whether hashed identifiers are covered. (Civ. Code 1798.140)
23. Status and text of the two 2026 California bills S9 cites that a row would rest on: AB 2561 (no silent reversion of privacy settings after an update) and SB 923 (deletion of data collected "from or about" a consumer; suppression lists). (leginfo.legislature.ca.gov bill pages)

HIPAA (eCFR, 45 CFR Part 164; HHS guidance pages):
24. Section 164.514(b)(2): the Safe Harbor identifiers (count them) and the "no actual knowledge" condition. (45 CFR 164.514)
25. Section 164.312(b) (audit controls) wording, and which records section 164.316(b)(2) requires kept six years. S10 applies six years to "HIPAA-related records"; S13 to audit logs. (45 CFR 164.312, 164.316)
26. HHS guidance on "unsecured PHI": what encryption changes for breach notification (S13 calls it a "Safe Harbor"), and the notification period in section 164.404(b) (S13 says 60 days). (45 CFR 164.402, 164.404; HHS breach guidance)

Vendor documentation, log redaction:
27. S12 says to scrub stack traces before they reach an error tracker; S16 lists error monitoring with user data and session replay as categories needing consent. For Sentry: the default of `sendDefaultPii` and what it adds when true; what `beforeSend` and `beforeBreadcrumb` can scrub; what server-side scrubbing does by default; Session Replay's default masking of text and inputs. (docs.sentry.io, data collected, scrubbing sensitive data, Session Replay privacy)
28. S1 and S11 ask for logs kept free of personal data. What does CloudWatch Logs offer to detect and mask personal data in log events, at what point it masks, which permission reveals masked values, and whether a policy is set per account or per log group. (CloudWatch Logs user guide, sensitive data masking)
29. S11 says personal data in URLs ends up in CDN and access logs. Which attributes in the OpenTelemetry HTTP and URL semantic conventions record the full URL or the query string, and what do the conventions say about redacting credentials or sensitive query values in them? (opentelemetry.io, semantic conventions, URL and HTTP)
30. Google Analytics: the policy on sending personal data (emails, names) in `user_id`, event parameters or URLs, and whether GA4 logs or stores IP addresses. (support.google.com/analytics, PII policy and IP data)
31. AWS Bedrock model invocation logging: where it writes and whether it records full request and response bodies; see genai fact 15, asked once. [no new question; listed so PDE's row cites it]

Vendor documentation, erasure in stores:
Questions 32 to 37 come from our own reasoning [O] about where a deleted value can survive (S1 and S11 name the stores but not their mechanics). Each is a question to answer from the page; none is assumed.
32. S3: what does a DELETE on a bucket with versioning enabled do to the object's earlier versions, and what removes them (which lifecycle action)? Does lifecycle expiration act at once or later, and with what stated delay? (Amazon S3 user guide, versioning and lifecycle)
33. Elasticsearch and OpenSearch: when is a deleted document's data physically removed from the index, and what do `_delete_by_query` and snapshots keep? (Elastic reference, delete API and merge; OpenSearch documentation)
34. Kafka: how is a record for a key removed from a topic (compaction and tombstones, `delete.retention.ms`), and what is the default `retention.ms` for a topic with the delete policy? (kafka.apache.org documentation, log compaction and topic configs)
35. PostgreSQL: when are a deleted row's bytes removed from the table files (DELETE and VACUUM), and do WAL archives and base backups keep them? (PostgreSQL manual, routine vacuuming; continuous archiving) [the DROP COLUMN half is data fact 3]
36. DynamoDB: does a TTL deletion in one Region of a global table replicate to the other replicas, and how long does point-in-time recovery keep restorable items? (DynamoDB developer guide, global tables and TTL; PITR) [TTL timing itself is data prompt 6 E]

Vendor documentation, residency:
37. S13 says to restrict Regions with SCPs and not to replicate to unapproved Regions; S11 says to keep backups inside the EEA. To answer: which Regions a DynamoDB global table copies items to; whether S3 Cross-Region Replication copies delete markers by default; how an SCP restricts Regions (the condition key) and which global services such a policy does not cover. (DynamoDB developer guide; S3 user guide, replication; AWS Organizations, SCP examples) [border: the architect owns residency of stores, genai owns the model Region, genai fact 19]

## 5. Proposed skill content and plan questions

**`personal-data-exposure`** (security, stages review and plan).
- Goal (draft). Lets the expert catch: a personal value that leaves the store for a place it should not reach, or reaches a third party without the gate the repository already uses: a log line, an error report, an analytics or ad call, a URL, browser storage, a prompt or invocation log, a fixture or a restored copy. Applies to: added logging, error-tracking, analytics, storage and model-call lines, and consent or opt-out handling. Not for: secrets and tokens (security's existing rows), whether a response is broader than the caller needs (security's Data exposure), retention and deletion (`erasure-and-retention`), the legality of any of it (the user).
- **This widens security's Goal**, which today is about an outsider, a lower-privileged user or untrusted text. A vendor call that skips the consent check, or a sharing path that ignores an opt-out signal, has no attacker. The agent file's Goal needs one added line ("or lets personal data reach a place or a recipient the user has not agreed to"). That is a border change for the maintainer, not a free fold-in.
- First, establish the target: which personal fields the repository marks (schema comments, a data map, a classification annotation); its logger's redaction (a scrub list, a CloudWatch data protection policy, Sentry `beforeSend`); its consent API and whether it reads an opt-out signal. Without a consent API there is no consent finding, only a plan question.
- Sections: logs and error reports (whole objects and bodies, IPs and device ids as personal data, stack traces and breadcrumbs, request-logging middleware); URLs and browser storage; analytics, ads and third-party calls (identify and track calls with an email, hashed ids to ad tech, session replay and error monitoring with user context); consent and opt-out gating (a new tracker or call that bypasses the existing check, events queued before consent, a migration that resets a stored opt-out, an ignored GPC signal where the repository reads it); prompts and invocation logs (border genai: whether the call should exist is genai's; that the prompt carries a personal field into an unmasked log is PDE's); fixtures and restores from production; "anonymised" labels on data that keeps quasi-identifiers.
- Excuses that do not hold: "the function is called `redact`" (open it); "it is hashed" (fact 9, 15, 22); "it is only staging".
- Not a finding: a personal value written to the store that owns it; an internal opaque id in a log; a URL with no personal value; anything stated as "non-compliant" (a reviewer never rules on legality).

**`erasure-and-retention`** (data, stages review and plan).
- Goal (draft). Lets the expert catch: a change after which a person's data survives their deletion, or survives its retention period, in a copy the delete path does not reach. Applies to: delete and anonymise paths, soft-delete flags, retention and expiry settings, TTL and lifecycle rules, archive steps, audit or history tables, new personal-data columns, append-only stores and topics. Not for: where a value is sent (`personal-data-exposure`), backup schedules and recovery objectives (architect), deletion protection on a resource (devops), the retention period's value (the user).
- **First, establish the target, and say when there is none.** A finding of the form "a new store or column is not on the deletion path" needs a baseline in the repository: a deletion job, an erasure registry, a data map or schema markers. With none, it is a plan question ("this change adds personal data; where is it deleted?"), never a review finding.
- Sections: the delete path (soft delete without a hard delete, a store skipped silently, an archive step outside the path, a deletion not passed to a vendor client where the repository passes others); copies (replicas, caches, search indexes, derived tables and feature stores, audit rows copying before-and-after values, event logs and topics); store mechanics, each a row only once its fact is answered (DROP COLUMN, data fact 3; DELETE and VACUUM, fact 35; versioned buckets, fact 32; search index deletes, fact 33; topic compaction, fact 34; global tables and PITR, fact 36), pointing to data's own rows where they exist; restores and re-imports that bring a deleted person back; subject-rights exports that miss a new field.
- Not a finding: retaining a record the repository marks as kept for a legal reason; a backup that ages out on a documented schedule (the policy is the user's; fact 14); a cache entry whose TTL is shorter than the deletion deadline the repository states.

**Plan questions for a person** (security's `plan.md`, beside "Secrets and personal data"; data's `plan.md` for the retention ones). Each is asked once and recorded as the user's decision, never raised as a finding:
- A new purpose for existing personal data, or a new category collected: the lawful basis (and consent, where consent is the basis).
- Special-category data, children's data, or a decision about a person made by a model with legal or similar effects: who reviewed it.
- A new processor, sub-processor or model provider receiving personal data: its contract status (DPA, BAA). The provider and Region as mechanism are genai's (model calls) and the architect's (stores).
- A new Region, replica or vendor location for personal data: the transfer mechanism. The architect owns where stores replicate; genai owns the model Region.
- DPIA triggers in the plan (profiling, monitoring, large-scale special categories, combining datasets, new technology): whether a DPIA exists. The reviewer can name the trigger and cannot decide whether a DPIA is required.
- The retention period for a new store, and whether a dataset may be called anonymous.

## 6. Responsibilities: rows to change, and what moves

| Table | Today | Proposed |
|---|---|---|
| security, "Personal data" | personal data in logs, responses and errors; not: retention, consent, lawful basis (privacy, planned) | judges: where a personal value goes (logs, error reports, analytics and ad calls, URLs, browser storage, prompts and invocation logs, fixtures) and whether a new path skips the repository's consent or opt-out gate; not: whether the stores forget it (data), lawful basis, consent validity and retention periods (the user); border: where a value goes outside the store is security's, whether the store forgets it is data's |
| data, "Data lifecycle in the store" | not: retention and erasure (privacy, planned) | judges also: erasure reaching every copy, soft deletes, archives, restores, retention enforcement; not: the retention period's value (the user), backups and recovery objectives (architect), deletion protection (devops) |
| genai, "Prompts and guardrails" | not: content policy (privacy, planned) | not: content policy (the user); a personal field reaching an unmasked invocation log (security, `personal-data-exposure`) |
| architect, "State and data" or a new "Residency" line | (residency not named) | judges: where stores and replicas live, as a system choice; not: whether a transfer is lawful (the user), the model Region (genai) |
| quality, "Fixtures and test data" | real credentials and personal data (security) | unchanged |
| developer, "Telemetry in code" | a secret or personal data in a log (security) | unchanged |

Why split, from the tables as they stand: security already owns "personal data in logs, responses and errors" and data already owns "Data lifecycle in the store" with "retention and erasure (privacy, planned)" in its not-column. One skill under either host would claim the other's area, and the overlap test (no two experts claim one area) would fail. The two skills meet at one sentence: where a value goes outside the store is security's, whether the store forgets it is data's.

## 7. Proposed skills, with selectors and the value test

| Skill | Host | Stages | Rows that pass the value test | Size estimate |
|---|---|---|---|---|
| `personal-data-exposure` | security | review (selector below), plan (offered) | the taken and missing PDE rows of section 2, after facts 5, 9, 10, 12, 13, 15, 18 to 24, 27 to 31 | about 10 KB |
| `erasure-and-retention` | data | review (selector below), plan (offered) | the taken and missing EAR rows of section 2, after facts 1, 2, 4, 14, 16, 20, 23, 32 to 36 and data fact 3 | about 9 KB |

Review selector for `personal-data-exposure` (anchored on sinks, not on field names):

```
added: \b(log(ger)?|logging|console|LOG)\.(debug|info|warn|warning|error|exception|log)\(.*\b(req\.body|request\.body|request\.data|req\.query|user|customer|patient|profile|payload|email|phone)\b|captureException|captureMessage|setUser\(|set_user\(|sendDefaultPii|send_default_pii|beforeSend|before_send|beforeBreadcrumb|\.identify\(|\.track\(|posthog|mixpanel|amplitude|analytics\.(page|track|identify)|gtag\(|dataLayer\.push|fbq\(|localStorage\.setItem|sessionStorage\.setItem|ModelInvocationLogging|model_invocation_logging|Sec-GPC|globalPrivacyControl|pg_restore|mongorestore|RestoreDBInstanceFromDBSnapshot|restore_db_instance_from_db_snapshot; files: **/fixtures/**, **/seeds/**
```

What it misses: a personal value passed through a generic variable (`logger.info(msg)`), request logging switched on in configuration (an access-log format with the query string, a debug log level), an SDK that captures user data by default with no flag in the diff, and a vendor called through a generic HTTP client. The fixtures and seeds globs may select often in repositories with large test trees; check the rate before shipping.

Review selector for `erasure-and-retention` (anchored on deletion and retention constructs, plus one-line DDL that adds a personal-named column):

```
added: \b((DELETE|delete)\s+(FROM|from)|TRUNCATE|truncate|soft_?delete|deleted_?at|is_?deleted|paranoid|anonymi[sz]e|pseudonymi[sz]e|erasure|forget_?user|right_?to_?be_?forgotten|dsar|data_?export|purge|data_?retention|retention_?(period|policy|days)|expires?_?at|TimeToLiveSpecification|ttl_attribute|LifecycleConfiguration|lifecycle_rule|NoncurrentVersionExpiration|_?delete_by_query|retention\.ms|cleanup\.policy|tombstone|(DROP|drop)\s+(COLUMN|column))\b|((ADD|add)\s+(COLUMN|column)|add_column|addColumn|Column\(|t\.(string|text)|models\.\w+Field\().*\b(email|phone|first_?name|last_?name|full_?name|birth|dob|address|ssn|national_?id|passport|ip_?address|device_?id|latitude|longitude)\b
```

`experts.js` compiles an `added:` selector with `new RegExp(...)` and no flags, so matching is case-sensitive: SQL keywords are written in both cases above, and field names are matched in lower case only (a `firstName` or `Email` column needs its own alternative when the skill is written). What it misses: a new store created in infrastructure code whose fields the diff does not name (a bucket, an index, a table), a personal field inside a JSON column, copies made by an ETL job outside the repository, and a new vendor that keeps data (PDE's plan question). `retention_?days` also matches log-group retention, which is the architect's; the skill's "Not for" says so. A bare `ttl` was left out on purpose: it would select every cache change, which is the architect's `caching-and-latency`.

Size: PDE beside `ci-workflow-security` (7.6 KB today) is about 18 KB at security's review stage. EAR sits beside data's four to six planned skills, so the 40 KB worst case at data's review stage is to be checked when those skills are written, and EAR's place in the priority order decided then.

Value test notes. Cut as obvious to a strong reviewer or owned elsewhere: no passwords, tokens or session ids in logs, generic error responses, encryption standards, password hashing, ownership checks (all security's existing rows). Cut as not checkable: lawful basis, the necessity of a field, the retention period, consent validity, DPIA required or not (all the user's). Cut as fixed thresholds: every recommended retention period. What remains in each skill is non-obvious only in its specific form (an IP or hashed email is personal data, events queued before consent, an archive step outside the delete path, and, if facts 32 to 36 bear them out, store mechanics that keep deleted values), and most rows are [T] or [O] until section 4 is answered, so the skills tell the expert to treat them as prompts to check, not findings on their own.

Worked pair (draft; from no corpus case). Finding: `api/signup.ts:41` adds `analytics.identify(user.email, { plan })` before the call to the repository's own `consent.allows("analytics")`, which `api/checkout.ts:18` makes before every other analytics call; a visitor who refused analytics is still identified to the vendor by email (PDE, consent section). Dropped: `jobs/purge_users.py:12` sets `deleted_at` and returns, which looked like a soft delete with no erasure, but `jobs/hard_delete.py` runs nightly on rows with `deleted_at` older than the period in `config/retention.yaml`, so the store does forget.

## Verdict

**Two skills under two existing experts; no new expert.**
- `personal-data-exposure` under **security**: where a personal value goes (logs, error reports, analytics and ad calls, URLs, browser storage, prompts and invocation logs, fixtures and restores), and whether a new path skips the repository's own consent or opt-out gate. Selector: sinks in added lines, plus fixture and seed directories (section 7).
- `erasure-and-retention` under **data**: whether the stores forget (the delete path, soft deletes, archives, copies in replicas, caches, indexes, derived tables, audit history and topics, restores and re-imports, store mechanics). Selector: deletion and retention constructs in added lines, plus one-line DDL adding a personal-named column (section 7).
- Both are offered at plan; the "needs a person" questions go into security's and data's `plan.md` (section 5).

**Borders.** Security: where a value goes outside the store is security's; whether the store forgets it is data's. Secrets stay security's existing rows. Data: data's TTL and DROP COLUMN rows stay its own; EAR points to them. Genai: whether a model call exists and which Region serves it are genai's; a personal field in an unmasked invocation log is security's (PDE). Architect: where stores and replicas live (residency as a system choice) and backups and recovery objectives are the architect's; neither skill owns residency, and the lawfulness of a transfer is the user's. Frontend keeps the consent banner's markup and behaviour.

**Where the proposal is weak.**
- A reviewer can judge from a diff: a personal value reaching a sink, a new call that skips a gate the repository already has, a delete path that does not reach a copy the repository's own deletion job lists, and, once data fact 3 and facts 32 to 36 are answered, a store mechanic that keeps deleted values. It cannot judge: lawful basis, whether consent is valid, whether a retention period is right, a vendor's contract status, whether a transfer is lawful, whether a DPIA is required, whether data is anonymous. Those need a person (the boss, a DPO or legal counsel), and the skills say so: they ask in the plan and never report them as findings.
- Erasure findings need a baseline. Most repositories have no data map or erasure registry, so the EAR selector will often fire on code where the right output is a plan question, not a finding.
- Field names are `always` in disguise (`email` is in every user-handling diff), so both selectors anchor on sinks and deletion constructs instead, and both miss values passed through generic variables and behaviour switched on by configuration.
- The consent rows widen security's Goal beyond its attacker framing; the maintainer should decide that border explicitly.
- Most rows rest on [T] sources or on legal text not yet checked (section 4: 37 facts, plus five already asked elsewhere), and the community sources mix in confident legal news (2026 fines, bills, guidelines) that could not be checked from here.
- Not measured. No corpus holds privacy cases; planted cases would come from the confirmed facts.

**Tools needed:** Read, Grep and Glob, as the hosts have. Web access would help for the legal and vendor pages under the existing network decision; no shell.
