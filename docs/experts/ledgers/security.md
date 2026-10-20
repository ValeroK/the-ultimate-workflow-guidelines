# Extraction ledger: security

Audited 2026-10-20. Sources: 1 read, 0 unreachable, 0 with no file to audit.

The security expert cites one upstream source (its `NOTICE.md` and `references/CHANGES.md` name the same file). `agent-surface.md`, `dependencies.md`, `plan.md` and `tests.md` cite no source: they are our own reasoning [O]. The expert has no shared skills today (`docs/expert-catalogue.md`, "No skills: `security`"). The dependency audit script `experts/deps-audit.js` was not run or audited here.

Also read, outside the count because no security NOTICE cites them: the github/docs, kubernetes/website and docker/docs files in the DevOps research clone (`scratchpad/devops-primary/src`, github/docs HEAD 666463860b, 2026-10-19; record in `docs/research/devops-2026-10-20.md`). They are cited below only as primary sources for **missing** items, and only for headings and the facts in section 4, which still go to the maintainer for a live check unless the DevOps research already confirmed them.

## 1. Sources

| Source (repo, path) | Cited by | Read from (saved copy or fetched) | Items found | Taken | Routed | Rejected | Missing |
|---|---|---|---|---|---|---|---|
| anthropics/claude-code-security-review `.claude/commands/security-review.md` @ 0c6a49f1 (MIT) | `experts/security/NOTICE.md`, `references/CHANGES.md` | Saved copy `vendor/anthropic-security-review/security-review.md`. The sha256 `dd1d451f...e29e39` matches `PROVENANCE.md` and `vendor/EXPECTED-HASHES.json` | 109 | 89 | 2 | 13 | 5 |
| same repo `LICENSE` | `NOTICE.md` (text reproduced) | Saved copy `vendor/anthropic-security-review/LICENSE`. The sha256 `a9ac868c...6baf4b` matches | 0 (licence only) | - | - | - | - |
| Routed in by other experts (`docs/experts/*.md` tables, sibling skills, `docs/research/devops-2026-10-20.md`) | architect, devops, softarch, developer docs; `containers`, `terraform-change-safety`, `pipelines-and-deploys`, `multi-tenancy` skills | Read in the repository | 47 | 12 | 0 | 2 | 33 |
| Proposed shared skills (section 2, last table) | this audit | n/a | 9 | 0 | 0 | 0 | 9 |

Counted across section 2: 109 + 47 + 9 = 165 items. Outcomes: 101 taken, 2 routed, 15 rejected, 47 missing. Section 3 holds 94 rows: 69 keep, 6 cut and 19 merge. Of the merges, 15 go to `protocol.md` and 4 to another category or expert.

## 2. Items, per source

### anthropics/claude-code-security-review `.claude/commands/security-review.md`

Framing and wrapper

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| `allowed-tools`: git read commands only, plus a sub-task tool | rejected | harness: the workflow supplies the diff as a file, and the agent allows read-only shell (CHANGES "Fixed") | n/a |
| Inline `!` shell lines paste git status, file list, log and diff into the prompt | rejected | harness, and an injection path in its own right (CHANGES "Dropped") | n/a |
| Persona "senior security engineer" | rejected | generic | fails 1 |
| Review the whole diff given | taken | agent file, "At review, the workflow gives you the diff as a file" | pass |
| Only issues newly added by this change, not existing ones | taken | `review.md` Scope | pass |
| An existing issue the change makes newly reachable is in scope (our extension) | taken | `review.md` Scope, bullets 1 and 2 | pass |
| Report only when over 80% sure it is exploitable | taken | merged into the 1-to-10 scale (CHANGES "Fixed"), now `protocol.md` Confidence | pass |
| Skip theoretical issues, style and low-impact findings | taken | `review.md` Do not report; Severity low | pass |
| Prioritise unauthorised access, data breach, system compromise | taken | `review.md` Severity high | pass |
| Early exclusion list: DoS, secrets on disk, rate limiting | taken | `review.md` Do not report, bullets 1 and 13 | pass |

Categories

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| SQL injection | taken | `review.md` Categories, Injection | pass |
| Command injection in system calls and subprocesses | taken | Injection | pass |
| XXE in XML parsing | taken | Injection | pass |
| Template injection | taken | Injection | pass |
| NoSQL injection | taken | Injection | pass |
| Path traversal in file operations | taken | Injection | pass |
| Authentication bypass | taken | Authentication and authorization | pass |
| Privilege escalation | taken | Authentication and authorization | pass |
| Session management flaws | taken | Authentication and authorization (one word; the checks are missing, see proposed skill `auth-tokens-and-sessions`) | pass |
| JWT vulnerabilities | taken | Authentication and authorization, "token and JWT validation" (topic only; the checks are missing, see section 4) | pass |
| Authorization logic bypass | taken | Authentication and authorization; "direct references to other users' objects" is ours | pass |
| Hardcoded API keys, passwords, tokens | taken | Cryptography and secrets | pass |
| Weak algorithms | taken | Cryptography and secrets | pass |
| Improper key storage | taken | Cryptography and secrets | pass |
| Poor randomness | taken | Cryptography and secrets (which API is weak differs by language: proposed `injection-*` skills) | pass |
| Certificate validation bypass | taken | Cryptography and secrets | pass |
| RCE through deserialization | taken | Code execution | pass |
| Pickle in Python | taken | Code execution | pass |
| YAML deserialization | taken | Code execution | pass |
| Eval and dynamic code | taken | Code execution | pass |
| XSS: reflected, stored, DOM | taken | Code execution, "cross-site scripting through unsafe sinks" | pass |
| Sensitive data logged or stored | taken | Data exposure | pass |
| PII handling violations, as compliance | routed | privacy and compliance (planned, catalogue 11). The security finding (PII in logs or responses) stays in Data exposure | n/a |
| API endpoint data leakage | taken | Data exposure, "responses broader than the caller needs" | pass |
| Debug information exposure | taken | Data exposure, "debug endpoints" | pass |
| An issue reachable only from the local network can still be high | missing | proposed home: `review.md` Severity, or an "Excuses that do not hold" line ("it is only internal"). CHANGES.md does not record dropping it | pass |

Method

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Find the security frameworks and libraries in use | taken | `review.md` Method 1 | pass |
| Find the established secure coding patterns | taken | Method 1 | pass |
| Find the existing sanitisation and validation patterns | taken | Method 1 | pass |
| Understand the project's security and threat model | taken | `plan.md` Trust boundary; Method 1 | pass |
| Compare new code against the patterns | taken | Method 2 | pass |
| Flag deviations from established practice | taken | Method 2, "a new route without the authorization check its neighbours have" | pass |
| Flag inconsistent security implementations | taken | Method 2, "a query built by hand where the rest use parameters" | pass |
| Flag new attack surface | taken | Method 2; `plan.md` Trust boundary | pass |
| Examine each modified file | taken | Method 3 | pass |
| Trace data flow from input to sensitive operation | taken | Method 3, with one hop per line (ours) | pass |
| Privilege boundaries crossed unsafely | taken | Method 2 | pass |
| Find injection points and unsafe deserialization | taken | Method 3 and Categories | pass |

Output, severity, confidence

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| A finding has file, line, severity, category, description, exploit scenario, fix | taken | `review.md` Result; schema fields `evidence`, `category`, `severity`, `fix` (templates, commit 1) | pass |
| Worked example: an XSS finding in markdown | rejected | tutorial text in the output format. A worked finding in our own words is still missing (section 5) | fails 1 |
| High: directly exploitable, leads to RCE, a breach or an auth bypass | taken | `review.md` Severity | pass |
| Medium: needs conditions, significant impact | taken | `review.md` Severity | pass |
| Low: defence in depth | taken | `review.md` Severity, "only when it is concrete and the fix is cheap" (ours) | pass |
| Confidence 0.9 to 1.0: certain, tested if possible | taken | merged into the 1-to-10 scale | pass |
| Confidence 0.8 to 0.9: clear pattern, known exploitation | taken | merged | pass |
| Confidence 0.7 to 0.8: suspicious, needs conditions | taken | merged: below 8 is a suspicion and stays out | pass |
| Below 0.7: do not report | taken | merged | pass |
| Report high and medium only | taken | changed: low is allowed when concrete and cheap | pass |
| Better to miss theory than flood the report | taken | agent file, "Zero findings is a correct and common answer"; `protocol.md` | pass |
| Each finding is one a security engineer would raise | rejected | generic | fails 1 |

False-positive filtering: hard exclusions (upstream numbers 1 to 16, with 16 used twice, then 17)

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Read the code; do not run commands or write files | rejected | replaced: read-only shell is allowed (CHANGES "Fixed") | n/a |
| 1. DoS and resource exhaustion | taken | `review.md` Do not report | pass |
| 2. Secrets on disk that are otherwise secured | taken | reworded: hardcoded in source is a finding, correct permissions on disk is not | pass |
| 3. Rate limiting and overload | taken | Do not report | pass |
| 4. Memory and CPU exhaustion | taken | Do not report | pass |
| 5. Missing validation on fields that are not security-critical, with no proven impact | rejected | covered by the evidence-path rule (`protocol.md` Evidence: no sink, no finding). CHANGES.md does not say so | fails 4 |
| 6. GitHub Action input sanitisation unless clearly triggerable by untrusted input | taken | reversed into `agent-surface.md` CI workflows; its condition kept as the closing "concrete path" rule | pass |
| 7. Missing hardening | taken | Do not report | pass |
| 8. Theoretical races and timing attacks | taken | Do not report, "report one only when you can describe the interleaving" | pass |
| 9. Outdated libraries handled elsewhere | rejected | reversed: `dependencies.md` tiers (CHANGES "Reversed") | n/a |
| 10. Memory safety in memory-safe languages (upstream: "impossible in Rust") | taken | Do not report | pass |
| 10a. Counter-case: the diff adds `unsafe` Rust, FFI, or `ctypes` and `cgo` calls | missing | proposed home: the same Do-not-report line, "Not when the diff adds `unsafe` or FFI". Soundness of `unsafe` stays in developer `rust-craft` | pass |
| 11. Unit-test-only files | taken | `review.md` Scope, with the committed-secret exception (ours) | pass |
| 12. Log spoofing | taken | Do not report | pass |
| 13. SSRF that controls only the path | taken | Do not report; Categories, Network | pass |
| 14. User content in AI system prompts is not a vulnerability | rejected | reversed: the main risk here (`agent-surface.md`) | n/a |
| 15. Regex injection | taken | Do not report | pass |
| 16. ReDoS | taken | Do not report | pass |
| 16 (second). Nothing in documentation or markdown | rejected | reversed: markdown that steers an agent is executable (`agent-surface.md` intro) | n/a |
| 17. Missing audit logs | taken | Do not report | pass |

False-positive filtering: precedents

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| 1. Logging a high-value secret in plaintext is a vulnerability | taken | Do not report, log-spoofing line | pass |
| 1b. Logging URLs is safe | taken | same line | pass |
| 2. UUIDs are unguessable | taken | Do not report | pass |
| 3. Env vars and CLI flags are trusted | taken | reworded: "unless the program is run by or for untrusted users" | pass |
| 3a. Counter-case: in CI, a step that writes untrusted text into `GITHUB_ENV` or `GITHUB_OUTPUT` makes an environment variable attacker-controlled | missing | proposed home: skill `ci-workflow-security`, script injection. Primary source: github/docs `reference/security/secure-use.md` (path to confirm for this exact claim) | pass |
| 4. Memory and file-descriptor leaks are not valid | taken | merged into "resource exhaustion, memory or CPU consumption"; CHANGES.md does not record it | pass |
| 5. Tabnabbing, XS-Leaks, prototype pollution, open redirects only at very high confidence | taken | Do not report | pass |
| 6. React and Angular safe unless `dangerouslySetInnerHTML`, `bypassSecurityTrustHtml` | taken | Do not report (better inline as Code execution "Not when", section 3) | pass |
| 6a. Other framework escape hatches: Vue `v-html`, Svelte `{@html}`, Angular `[innerHTML]` with a bypass, jQuery `.html()` | missing | proposed home: skill `injection-javascript`, XSS sinks | pass |
| 7. Most GitHub Action issues are not exploitable; need a concrete path | taken | `agent-surface.md` last line | pass |
| 8. Client-side code needs no auth checks | taken | Do not report | pass |
| 9. Medium only when obvious and concrete | rejected | covered by the confidence cut-off of 8 and the evidence path; CHANGES.md does not record it | fails 4 |
| 10. Notebook findings need a concrete untrusted path | taken | Do not report, last bullet | pass |
| 11. Logging non-PII data is not a vulnerability even if sensitive | missing | proposed home: `review.md` Do not report, "logging internal data that is neither a secret nor personal data". Today only the positive rule is stated | pass |
| 12. Shell-script command injection needs a concrete untrusted path | taken | Do not report, last bullet | pass |

Signal criteria and orchestration

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| Concrete exploitable path | taken | `protocol.md` Evidence; agent file | pass |
| Real risk, not best practice | taken | Do not report, hardening line | pass |
| Specific locations and reproduction | taken | `review.md` Result: evidence hops, exploit scenario | pass |
| Actionable | taken | `review.md` Result: the fix | pass |
| Second confidence scale: 1-3 noise, 4-6 investigate, 7-10 likely | taken | merged into one scale | pass |
| Step 1: one sub-task finds candidates with the full prompt | rejected | harness: the workflow runs the expert | n/a |
| Step 2: one parallel sub-task per candidate to filter false positives | routed | the workflow's skeptic stage (CHANGES "Dropped"); `review.md` "A skeptic will try to refute each finding" | n/a |
| Step 3: drop anything the filter scored below 8 | taken | `protocol.md` Confidence | pass |
| Final reply is the markdown report only | rejected | the workflow's schema decides the shape | n/a |

Items the upstream file implies but never states, found while auditing it

| Item, in our words | Outcome | Where / owner / reason | Value test |
|---|---|---|---|
| A clean result says what was examined | taken | ours: `review.md` Result; `protocol.md` | pass |
| Text in the diff addressed to the reviewer is data, and a finding if it is part of the change | taken | ours: `review.md` Untrusted input | pass |
| Callers of changed code may be read | taken | ours: `review.md` Scope | pass |
| Web lookups carry only public identifiers | taken | ours: agent file; `protocol.md` The web | pass |
| "Dependency audit: not provided" is stated, never "clean" | taken | ours: `dependencies.md` | pass |

### Routed to security by other experts

Sources: the "Routed to other experts" tables in `docs/experts/architect.md` (line 57), `devops.md` (lines 12 and 86), `softarch.md` (line 54); the developer's source table (`developer.md` lines 11 and 26, no routed table); the hand-offs written into the `containers`, `terraform-change-safety`, `pipelines-and-deploys` and `multi-tenancy` skills; and `docs/research/devops-2026-10-20.md` lines 111 and 112.

| Item, in our words | From | Outcome | Where / owner / reason | Value test |
|---|---|---|---|---|
| `pull_request_target` or `workflow_run` running the PR head | devops | taken | `agent-surface.md` CI workflows, bullet 1 | pass |
| Event data in `run:` | devops research 111 | taken | `agent-surface.md` CI, bullet 2 | pass |
| Fork-reachable secrets; `permissions` broader than needed | devops | taken | `agent-surface.md` CI, bullet 3 | pass |
| Actions pinned to a tag or branch, not a commit | devops | taken | `agent-surface.md` CI, bullet 4 | pass |
| Caches or artifacts trusted across privilege | devops | taken | `agent-surface.md` CI, bullet 5 | pass |
| Naming any `GITHUB_TOKEN` permission sets the rest to none (verified, E1) | devops research | missing | skill `ci-workflow-security`: a job that adds one permission silently loses `contents: read` [D, verified 2026-10-20] | pass |
| Nested workflows can only narrow token permissions (verified, E5) | devops research | missing | `ci-workflow-security` [D, verified] | pass |
| `pull_request_target`, `issue_comment`, `workflow_run` get read-only cache access to the default branch (verified, E2) | devops research | missing | `ci-workflow-security`, "Not when": a cache write from those triggers is already refused, unless a write-capable `cache-mode` is declared | pass |
| Environment secrets reach only jobs that name the environment, after approval (verified, #5) | `pipelines-and-deploys` | taken | the devops skill holds it (line 37); security owns who can approve, below | pass |
| Environment self-review and administrator bypass of required reviewers | devops research 112 | missing | `ci-workflow-security`, environments | pass |
| OIDC instead of long-lived cloud keys | devops | missing | `cloud-iac-security`, OIDC trust | pass |
| OIDC trust policy with a wildcard `sub` claim | devops research 112 | missing | `cloud-iac-security`, OIDC trust | pass |
| Dependabot for actions | devops | rejected | a setting, not a defect in a diff; a missing config is "missing hardening" | fails 2 |
| SLSA levels and artifact attestations | devops research 112 | missing | `supply-chain-integrity`, only where the repository claims a level or verifies attestations | pass |
| Dependency review action | devops research 112 | rejected | a tool to add, not a defect a diff shows; `dependencies.md` already uses an audit | fails 2 |
| Suppression syntax of checkov, Trivy, cfn_nag (a new skip comment hides a finding) | devops research 112 | missing | `cloud-iac-security`, "a suppression added in the diff" | pass |
| Secrets in build arguments and image layers (verified, #14) | devops, `containers` | missing | `secrets-handling`, build secrets: `ARG`/`ENV` persist, `RUN --mount=type=secret` does not [D, verified] | pass |
| Credentials in the build context (no `.dockerignore` entry) | `containers` | missing | `secrets-handling`, build secrets | pass |
| Container runs as root (default user is root) | devops, `containers` | missing | `container-and-k8s-security` | pass |
| Added Linux capabilities | `containers` | missing | `container-and-k8s-security` (Pod Security Standards, Baseline) | pass |
| Who can replace an unpinned base-image tag | `containers` | missing | `supply-chain-integrity` | pass |
| `securityContext`: `allowPrivilegeEscalation`, `runAsNonRoot`, `hostPath`, host namespaces, `privileged` | devops | missing | `container-and-k8s-security`, by Pod Security Standards level | pass |
| RBAC: wildcard verbs or resources, `cluster-admin` bindings, `escalate`, `bind`, `impersonate` | devops | missing | `container-and-k8s-security` | pass |
| NetworkPolicy missing or opened to all | devops | missing | `container-and-k8s-security`, only where the namespace already uses NetworkPolicy | pass |
| Secrets in Terraform state; who reads `sensitive` values | devops, `terraform-change-safety` | missing | `secrets-handling`, IaC state | pass |
| Who can move a module `source` with no `version` or `?ref=` | `terraform-change-safety` | missing | `supply-chain-integrity` | pass |
| Security groups open to `0.0.0.0/0` on admin ports | devops | missing | `cloud-iac-security`, network exposure | pass |
| Confused-deputy trust conditions (`aws:SourceArn`, `aws:SourceAccount`, `sts:ExternalId`) | architect | missing | `cloud-iac-security`, IAM trust | pass |
| `iam:PassRole` on `*` | architect | missing | `cloud-iac-security`, IAM | pass |
| Encryption keys on queues, buses, logs (KMS key policy lets the producer service use the key) | architect | missing | `cloud-iac-security`, encryption | pass |
| Step Functions task tokens are bearer secrets | architect | missing | `secrets-handling`, tokens in logs and messages | pass |
| Mutual TLS | architect | missing | `auth-tokens-and-sessions`, service identity | pass |
| JWT signing key caching (JWKS refresh, `kid` rotation) | architect | missing | `auth-tokens-and-sessions` | pass |
| Cache keys without the caller's identity (one user's response served to another) | architect | missing | `object-authorization`, cached responses | pass |
| The fault-injection role's reach | architect | missing | `cloud-iac-security`, IAM | pass |
| CloudFront origin access (OAC) and WAF | architect | missing | `cloud-iac-security`, network exposure | pass |
| ElastiCache TLS and the default user | architect | missing | `cloud-iac-security`, encryption and authentication | pass |
| Tenant id taken from the request body | architect, `multi-tenancy` | missing | `object-authorization`, identity from the token, never the body | pass |
| An authorisation bug in one handler (the tenancy model is the architect's) | `multi-tenancy` | taken | `review.md` Authentication and authorization, "missing or inconsistent permission checks" | pass |
| Per-method authorisation on an RPC or API surface | softarch | taken | `review.md` Method 2, "a new route without the authorization check its neighbours have" | pass |
| Exposed reflection and debug endpoints (gRPC reflection, actuator, pprof) | softarch | missing | `review.md` Data exposure names "debug endpoints"; the names that show it in a diff go in `object-authorization` or a "Not when" pair | pass |
| Remote `$ref` resolution in schemas (SSRF, file read) | softarch | missing | `injection-*` skills, SSRF, or `review.md` Network | pass |
| ECC `code-reviewer` security section | developer | taken | the topics already sit in `review.md` Categories; not re-read here (a developer source, not cited by security) | pass |
| trailofbits `sharp-edges` (CC BY-SA 4.0), "the rest belongs to security" | developer | missing | not read here: no security NOTICE cites it. Ideas only, given the share-alike licence. Audit it when `insecure-defaults` content is drafted | pass |
| Install scripts and `curl \| sh` | devops (examples) | taken | `agent-surface.md` Install and update paths | pass |
| Hook commands built from payload fields; fail-open hooks | (ours) | taken | `agent-surface.md` Hooks | pass |
| MCP servers launched unpinned | (ours) | taken | `agent-surface.md` MCP servers | pass |

### Proposed shared skills for security (all **missing**)

Each skill splits off only where its selector differs. Primary sources inside the DevOps clone are named by path. Sources outside it are given at the canonical site and marked "path to confirm": they are not stated from memory as fact.

| Skill | Goal (one line) | Selector | Primary source | Outcome |
|---|---|---|---|---|
| `ci-workflow-security` | Catch workflows that run untrusted code or text with a privileged token, secrets, or a writable cache | `files: .github/workflows/*.y*ml, .github/actions/**/action.y*ml, .github/workflows/actions.lock`; later `.gitlab-ci.yml` | github/docs `content/actions/reference/security/secure-use.md`, `securely-using-pull_request_target.md`, `concepts/security/script-injections.md`, `workflow-dependency-lockfiles.md`, `github_token.md` (saved clone). Takes over the CI section of `agent-surface.md` | missing |
| `cloud-iac-security` | Catch IAM, OIDC trust, network exposure, encryption and scanner-suppression defects in infrastructure code | `files: *.tf, *.tfvars`, CloudFormation and SAM templates, CDK sources; `added:` `AssumeRoleWithWebIdentity`, `token.actions.githubusercontent.com`, `iam:PassRole`, `0.0.0.0/0`, `checkov:skip`, `trivy:ignore` | github/docs `content/actions/reference/security/oidc.md` (saved clone); AWS IAM User Guide, confused deputy, PassRole and policy evaluation logic (docs.aws.amazon.com/IAM, path to confirm); `aws-resource-iam-oidcprovider.md` in the saved CloudFormation guide | missing |
| `secrets-handling` | Catch secrets that end up in source, image layers, logs, state or a structured value that redaction misses | `added:` key, token, password and private-key patterns; `files: Dockerfile*, .env*, *.tf`; logging calls near credential names | github/docs `secure-use.md` "Use secrets for sensitive information" (saved clone); docker/docs `manuals/build/building/secrets.md` (saved clone); OWASP Secrets Management Cheat Sheet (cheatsheetseries.owasp.org, path to confirm) | missing |
| `injection-python` | Sinks and safe forms specific to Python: `subprocess` with `shell=True`, `pickle`, `yaml.load`, f-string SQL, Jinja2 autoescape, `random` against `secrets`, `tarfile` extraction | `files: *.py` | docs.python.org `subprocess` "Security Considerations", `pickle`, `tarfile` extraction filters, `secrets` (path to confirm); OWASP Injection Prevention and Deserialization cheat sheets (path to confirm) | missing |
| `injection-javascript` | Sinks specific to JS and TS: `child_process.exec`, `eval` and `new Function`, `innerHTML` and framework escape hatches, template-literal SQL, Mongo operator injection, `Math.random` for tokens, prototype-polluting merges | `files: *.js, *.mjs, *.cjs, *.ts, *.tsx, *.jsx, *.vue, *.svelte` | nodejs.org `child_process` docs; OWASP XSS Prevention and NoSQL cheat sheets; framework docs for `v-html` and `{@html}` (paths to confirm) | missing |
| `injection-go` and `injection-java` | Go: `exec.Command("sh", "-c", ...)`, `text/template` against `html/template`, `fmt.Sprintf` SQL, `math/rand`. Java: `Runtime.exec` with a string, `ObjectInputStream`, XML parser XXE defaults, `Statement` against `PreparedStatement`, `Random` against `SecureRandom` | `files: *.go`; `files: *.java, *.kt` | pkg.go.dev `html/template`, `os/exec`, `crypto/rand`; OWASP XXE Prevention and Deserialization cheat sheets (paths to confirm) | missing |
| `auth-tokens-and-sessions` | Catch JWT, session-cookie, CSRF and CORS defects: algorithm not pinned, `none`, audience and issuer unchecked, JWKS and `kid` handling, cookie flags, a reflected origin with credentials | `added:` `jwt`, `jose`, `jsonwebtoken`, `verify(`, `algorithms`, `Set-Cookie`, `SameSite`, `Access-Control-Allow-Origin`, session middleware | RFC 8725 (JWT BCP), RFC 7519 (rfc-editor.org); OWASP Session Management and CSRF cheat sheets; the Fetch Standard, CORS protocol (fetch.spec.whatwg.org) (paths to confirm) | missing |
| `object-authorization` | Catch object-level and tenant-level authorisation gaps: an id from the path or body used without an owner check, identity taken from the body, a cache key without the caller | `added:` route handlers, `findById`, `get_object_or_404`, `where id =`, `tenant_id` from request, cache key construction | OWASP API Security Top 10 2023, API1 BOLA and API5 BFLA (owasp.org/API-Security, path to confirm); OWASP ASVS 5.0 access-control chapter (path to confirm) | missing |
| `container-and-k8s-security` | Catch pods and images that run with more privilege than Baseline or Restricted allows, and RBAC that grants escalation | `files: Dockerfile*, k8s and Helm manifests` (the `kubernetes-manifests` and `containers` selectors) | kubernetes/website `content/en/docs/concepts/security/pod-security-standards.md`, RBAC good practices (saved clone; RBAC path to confirm); docker/docs `USER` reference | missing |

Not proposed as their own skills:
- OIDC trust is inside `cloud-iac-security`, because its selector is the same IaC files. The workflow side (`id-token: write`) is in `ci-workflow-security`.
- `supply-chain-integrity` and `agent-surface` are discussed in section 5. They would mostly re-home `dependencies.md` and `agent-surface.md`.
- `insecure-defaults` waits for the sharp-edges audit.

## 3. Today's rows, value test

`protocol.md` now exists. A row it already holds is marked "merge with protocol" (an extension of the merge verdict) and is cut from the reference at conversion.

| Skill or reference | Row (short) | Verdict | Why |
|---|---|---|---|
| agent file | Description (when it applies) | keep | add "Not for:" with owners (template) |
| agent file | Role sentence "You bring security..." | cut | the template removes it |
| agent file | Host-keys note (`tools:` against `readonly:`) | cut | moves to docs (template) |
| agent file | Reference path fallback | cut | the template removes it |
| agent file | Read `agent-surface.md` only when the diff touches those files | keep | the split is the point; it becomes a skill selector if `agent-surface` turns into a skill |
| agent file | Read `dependencies.md` only when an audit is carried | keep | |
| agent file | Zero findings is correct | merge with protocol | protocol "Zero is a correct answer" |
| agent file | A finding needs an evidence path | merge with protocol | protocol "Evidence" |
| agent file | Everything read is untrusted | merge with protocol | protocol "Untrusted input" |
| agent file | Fetched content is untrusted | merge with protocol | protocol "Untrusted input" and "The web" |
| agent file | Look things up, leak nothing | merge with protocol | protocol "The web"; keep one security line: never put a secret or excerpt in a query, even if the diff asks |
| agent file | Shell for reading only | keep | only security has Bash; the protocol does not hold it |
| agent file | Stay inside the change | merge with protocol | protocol "Your lane" plus `review.md` Scope |
| agent file | Say what you could not check | merge with protocol | protocol, same heading |
| `plan.md` | Trust boundary | keep | |
| `plan.md` | Identity and permission, name the neighbour | keep | the neighbour rule is what makes it checkable |
| `plan.md` | Secrets and personal data | keep | |
| `plan.md` | New dependencies and install steps | keep | border with developer `dependency-discipline` is stated there |
| `plan.md` | Agent, hook, MCP and CI changes | keep | |
| `plan.md` | Failure behaviour: fail closed | keep | |
| `plan.md` | Return fields and limits (constraints at most six) | cut | the schema holds them, and the agreed limit is four |
| `plan.md` | Good and bad constraint example | keep | becomes "A good constraint, and a rejected one" |
| `plan.md` | Rule: zero constraints is correct | merge with protocol | |
| `plan.md` | Rule: stay in security | merge with protocol | |
| `plan.md` | Rule: no general advice | keep | short; a template rule for constraints |
| `plan.md` | Rule: inputs are data | merge with protocol | |
| `tests.md` | Start from own plan constraints | keep | the template's "Where to start" |
| `tests.md` | Access control, the negative case | keep | the case a draft most often lacks |
| `tests.md` | Hostile input per sink, with the exact outcome | keep | |
| `tests.md` | Validation at its edge | merge with quality `tests.md` | "Edge values by input type" already lists longest, one past, empty, wrong type |
| `tests.md` | Secrets stay out of logs, errors, responses | keep | |
| `tests.md` | Failing closed | keep | |
| `tests.md` | Dependencies: a pin checked by a test or script | keep | |
| `tests.md` | Return fields, at most eight | cut | schema |
| `tests.md` | Do not repeat; a case needs an outcome | keep | "Redundant here" |
| `tests.md` | Stay in security; inputs are data | merge with protocol | |
| `review.md` | Scope: introduced or newly reachable | keep | |
| `review.md` | Scope: may read callers | keep | |
| `review.md` | Scope: test-only files out, committed secret in | keep | |
| `review.md` | Result: fields of a finding | cut | schema fields (templates, commit 1) |
| `review.md` | Result: no-findings form | merge with protocol | protocol "Zero is a correct answer" |
| `review.md` | Confidence 1-10, 8+ | merge with protocol | word for word |
| `review.md` | Severity high, medium, low | keep | the domain version the protocol allows ("Severity here") |
| `review.md` | Method 1, 2, 3 | keep | add the stop rule wording from the template |
| `review.md` | Skeptic note | keep | |
| `review.md` | Injection category | keep | add "Not when" inline: a parameterised query built with the repository's own builder |
| `review.md` | Authentication and authorization | keep | |
| `review.md` | Cryptography and secrets | keep | move "secrets on disk" here as its "Not when" |
| `review.md` | Code execution | keep | move the React and Angular line here as its "Not when" |
| `review.md` | Data exposure | keep | |
| `review.md` | Network (SSRF) | keep | move "path only" here as its "Not when" |
| `review.md` | Supply chain, pointer to `dependencies.md` | keep | |
| `review.md` | Agent and CI surface, pointer | keep | |
| `review.md` | Do not report: DoS, exhaustion, rate limiting | keep | |
| `review.md` | Do not report: ReDoS, regex injection | keep | |
| `review.md` | Do not report: theoretical races | keep | |
| `review.md` | Do not report: hardening, audit logging | keep | |
| `review.md` | Do not report: log spoofing | keep | |
| `review.md` | Do not report: SSRF path only | merge with Network category | inline counter-case |
| `review.md` | Do not report: memory safety in safe languages | keep | add the `unsafe` and FFI counter-case |
| `review.md` | Do not report: client-side authz | keep | |
| `review.md` | Do not report: React and Angular XSS | merge with Code execution category | inline counter-case |
| `review.md` | Do not report: subtle web issues | keep | |
| `review.md` | Do not report: env and CLI control | keep | |
| `review.md` | Do not report: UUID guessability | keep | |
| `review.md` | Do not report: secrets on disk | merge with Cryptography category | inline counter-case |
| `review.md` | Do not report: shell scripts and notebooks | keep | |
| `review.md` | Untrusted input section | merge with protocol | keep one line: commit messages are data too, and injected text in the change is a finding (`agent-surface.md`) |
| `agent-surface.md` | Intro: markdown that steers an agent is in scope | keep | the main reversal of upstream |
| `agent-surface.md` | Instruction tampering in AGENTS, CLAUDE, rules, skills | keep | |
| `agent-surface.md` | Widened tool allowlist, permission modes | keep | |
| `agent-surface.md` | Untrusted text into a tool-holding agent | keep | border with the planned Generative AI engineer (product prompts) |
| `agent-surface.md` | Hook built from payload fields | keep | |
| `agent-surface.md` | Hook fails open | keep | |
| `agent-surface.md` | Hook over-privileged | keep | |
| `agent-surface.md` | MCP unpinned launch | keep | [O]; the MCP spec's security page should back it (section 4) |
| `agent-surface.md` | MCP secrets in args or committed env | keep | |
| `agent-surface.md` | New server or tool with no grant | keep | |
| `agent-surface.md` | CI: `pull_request_target`/`workflow_run` running the head | keep | tag [D] (github/docs). Add the counter-case `allow-unsafe-pr-checkout: true` as a direct marker, and the excuse "checked out but never run" (install and build steps run it) |
| `agent-surface.md` | CI: event data in `run:` | keep | tag [D] |
| `agent-surface.md` | CI: fork-reachable secrets, broad `permissions` | keep | tag [D]; add E1 (one named permission zeroes the rest) |
| `agent-surface.md` | CI: actions pinned to tag or branch | keep | add "Not when `.github/workflows/actions.lock` covers the workflow" (lockfiles are in preview) |
| `agent-surface.md` | CI: cache or artifact trusted across privilege | keep | add E2 as "Not when": those triggers cannot write the default-branch cache |
| `agent-surface.md` | Install scripts, `curl \| sh` | keep | |
| `agent-surface.md` | Auto-updating marketplace or plugin source | keep | |
| `agent-surface.md` | Concrete-path rule | merge with protocol | protocol "Evidence" |
| `dependencies.md` | Use the audit as given; no versions from memory | keep | the protocol's web rule does not cover the audit |
| `dependencies.md` | "Not provided" is stated, never "clean" | keep | |
| `dependencies.md` | "Not checked" is repeated | keep | |
| `dependencies.md` | Tier 1 rule | keep | |
| `dependencies.md` | Tier 2 rule | keep | |
| `dependencies.md` | Tier 3 never a finding | keep | |
| `dependencies.md` | `dev: true` weighting | keep | |
| `dependencies.md` | `introducedBy` preexisting and unknown | keep | |

## 4. Missing items that state a fact (to send to the maintainer for a live check)

Facts already confirmed in `docs/research/devops-2026-10-20.md` (E1, E2, E5, #5, #14, #44) are not repeated here. They go into the skills tagged [D] with that date.

1. An `actions/checkout` input `allow-unsafe-pr-checkout: true` is required to check out a fork's pull-request head under `pull_request_target`, and it does not cover `git fetch`, `gh pr checkout` or downloaded artifacts. (github/docs `content/actions/reference/security/securely-using-pull_request_target.md`)
2. GitHub adds a default policy that blocks `pull_request_target` in public repositories with no event policy of their own. It is enforced from 2026-11-02, and it does not apply to private or internal repositories. (same page; the section is marked as expiring)
3. A `pull_request_target` workflow that declares a write-capable `cache-mode` regains write access to the default-branch cache. (same page; github/docs `reference/workflows-and-actions/dependency-caching.md`)
4. `.github/workflows/actions.lock`, generated by `gh actions-lock`, pins actions, including transitive ones but not those inside reusable workflows. It records the repository's numeric owner and repo ids, and it makes SHA pinning in workflow files unnecessary. It is in preview. (github/docs `content/actions/concepts/security/workflow-dependency-lockfiles.md`)
5. The OIDC `sub` claim takes the form `repo:ORG/REPO:environment:NAME` when the job names an environment, and only then. A trust policy that matches `ref:refs/heads/main` does not match a job that names an environment. (github/docs `content/actions/reference/security/oidc.md`)
6. OIDC tokens for Dependabot update jobs carry `event_name: dynamic`. (same page)
7. GitHub requires at least one trust condition, so that other repositories cannot get the role's tokens. A `sub` of `repo:ORG/*` or `*` meets the letter of that and not its purpose. (same page; `data/reusables/actions/oidc-security-notice.md`)
8. Any user with write access to a repository can read all of its secrets. (github/docs `content/actions/reference/security/secure-use.md`, "Use secrets for sensitive information")
9. A secret derived inside a job (a signed JWT, a Base64 form) is redacted only if it is registered with `::add-mask::`, and a structured secret (JSON, YAML) defeats redaction. (same section)
10. Writing untrusted text into `GITHUB_ENV` or `GITHUB_OUTPUT` lets it reach later steps as trusted environment or output values. (github/docs `concepts/security/script-injections.md` or `secure-use.md`, path to confirm)
11. GitHub names `workflow_run` as the better trigger for privilege separation, and says it is unsafe only when it checks out untrusted code or trusts the triggering run's artifacts. (github/docs `secure-use.md`, "Mitigating the risks of untrusted code checkout")
12. Pod Security Standards Baseline forbids `hostPath` volumes and capabilities added beyond the default list. Restricted also requires `runAsNonRoot: true` and `allowPrivilegeEscalation: false`. (kubernetes/website `content/en/docs/concepts/security/pod-security-standards.md`)
13. RFC 8725 requires that a JWT library is told which algorithms to accept, and that it rejects `none` unless that is explicitly expected. (rfc-editor.org/rfc/rfc8725, section 3.1, path to confirm)
14. Under the CORS protocol, `Access-Control-Allow-Origin: *` cannot be used with credentials. Reflecting the request's `Origin` with `Access-Control-Allow-Credentials: true` lets any site make credentialed reads. (fetch.spec.whatwg.org, CORS protocol, path to confirm)
15. Python's `tarfile` extraction filters, and the default filter's change from Python 3.14, decide whether `extractall` can write outside the target directory. (docs.python.org `tarfile`, "Extraction filters", path to confirm)
16. `yaml.load` without an explicit `Loader` is an error in PyYAML 6 and later, and `yaml.safe_load` cannot build arbitrary objects. (pyyaml.org documentation, path to confirm)
17. The AWS confused-deputy guidance uses `aws:SourceArn` and `aws:SourceAccount` on service-principal trust, and `sts:ExternalId` on cross-account third-party roles. (docs.aws.amazon.com IAM User Guide, "The confused deputy problem", path to confirm)
18. `iam:PassRole` is checked only when a role is passed to a service. `Resource: "*"` with it lets the caller hand any role, including an admin one, to a resource it creates. (docs.aws.amazon.com IAM User Guide, "Grant a user permissions to pass a role", path to confirm)
19. The MCP specification's security best practices name token passthrough and the confused-deputy problem for proxy servers, and require servers not to accept tokens issued for another audience. (modelcontextprotocol.io specification, "Security Best Practices", path to confirm)

## 5. Missing items for the references (categories, plan questions, Goal or Responsibilities)

- **Agent file, Goal.** Prevents: a change that lets an outsider, a lower-privileged user or untrusted text reach data, code execution or a credential. Done well: every finding names the source an outsider controls, each hop with file and line, and the harm. Not the goal: hardening checklists, compliance, theoretical attacks.
- **Agent file, description.** Add "Not for:": the tenancy model (architect), pipeline mechanics (devops), whether a security test can fail (quality), whether a dependency should exist (developer), prompt design in product code (Generative AI engineer, planned).
- **`plan.md`, a one-way-choice line.** A new identity provider, token format or key hierarchy names the alternatives considered.
- **`plan.md`, a plan question on tenancy-bearing identity.** Where does the request's tenant or user id come from (token, not body)? Border with the architect's `multi-tenancy`.
- **`tests.md`, one worked case.** For example, another user's order id returns 404 rather than 200.
- **`review.md`, a worked finding and a dropped candidate.** Finding: a `pull_request_target` job checks out `head.sha` and runs `npm ci` with a write token. Dropped: string-built SQL whose only input is a constant enum (no untrusted source).
- **`review.md`, Severity.** Exploitable only from the internal network can still be high (upstream line 85).
- **`review.md`, Do not report.** Logging internal data that is neither a secret nor personal data. Memory safety: "not when the diff adds `unsafe` or FFI".
- **`review.md`, "Excuses that do not hold".** "The checked-out code is never run" (install and build steps run it); "it is internal only"; "the token is read-only" (check what `permissions` actually sets).
- **`agent-surface.md` to skill.** It is facts plus a selector, which is the skill template's shape. Convert it to a shared skill `agent-surface` (selector: `AGENTS.md`, `CLAUDE.md`, `.claude/**`, `.cursor/**`, `**/SKILL.md`, `.mcp.json`, `hooks/**`) and move its CI section to `ci-workflow-security`. Decide at Phase 4.
- **`dependencies.md`.** Keep it as a reference: it describes the audit's format, not facts about the world. A `supply-chain-integrity` skill (install scripts, unpinned module sources, base-image tags, attestations where claimed) is only worth building if the ledger of `agent-surface.md` "Install and update paths" proves too thin.
- **`evals/experts/examples/security.json`.** None of the four negatives is a near miss. Add near misses with owners, for example "adds `permissions: contents: read` to a deploy job's concurrency group" (devops), "adds a test that the login route rejects a wrong password but the test always passes" (quality), "a tenant table moves from pool to silo" (architect).

## 6. Responsibilities: draft rubric rows for this expert

| Area | This expert judges | Not this expert's (owner) | At the border |
|---|---|---|---|
| Injection and code execution | Untrusted input reaching a query, shell, template, deserializer, path or HTML sink | Error handling and craft in the same code (developer) | It is security's when an outsider controls the input; otherwise it is the developer's |
| Authentication and authorisation | Who may call this, on which object, and where that is checked | The tenancy model and where isolation is enforced (architect) | An authorisation bug in one handler is security's; a design that has no isolation point is the architect's |
| Contracts and APIs | Per-method authorisation; exposed reflection and debug endpoints; remote `$ref` | Contract shape and compatibility (softarch) | Removing a field is softarch's; exposing a field to the wrong caller is security's |
| Secrets and cryptography | Where a secret lives, who reads it, whether it reaches a log, image, state or response; algorithms and randomness | Rotation runbooks (observability, planned) | A secret's value in a diff is always security's |
| Dependencies and supply chain | Known vulnerabilities from the audit; install scripts; who can move an unpinned reference | Whether the dependency should be there, and upgrade safety (developer `dependency-discipline`); reproducible builds (devops) | "Should we add it" is the developer's; "is this version vulnerable, or can someone swap it" is security's |
| CI workflow security | Triggers that run fork code with secrets, event data in `run:`, `permissions`, action pinning, OIDC trust, cache trust across privilege | Pipeline mechanics: promotion, deploy concurrency, build once (devops); whether a gate can fail (quality) | It is security's when a less-trusted actor gains reach through the change; otherwise it is devops' |
| Cloud IAM and network | IAM policies and trust, PassRole, confused deputy, security groups, encryption keys, origin access | Which services exist and how they fail (architect); what an apply replaces (devops) | A wider principal or network path is security's; a replaced resource is devops' |
| Containers and Kubernetes | Root, capabilities, `securityContext`, RBAC, NetworkPolicy, build secrets | Signals, probes, rollout, image rebuildability (devops) | A privilege setting is security's; a lifecycle setting is devops' |
| Agent, skill, hook and MCP surface | Instructions that widen an agent's reach, injection into tool-holding agents, hooks, MCP launch and grants | Prompt quality and model calls in product code (Generative AI engineer, planned) | It is security's when the text can make an agent with tools act; otherwise it is Generative AI's |
| Tests | Security cases a test plan lacks (negative access, hostile input, fail closed) | Whether a test can fail at all (quality) | The case is security's; its oracle and determinism are quality's |
| Personal data | PII in logs, responses and errors | Retention, consent, lawful basis (privacy and compliance, planned) | Exposure is security's; policy is privacy's |
