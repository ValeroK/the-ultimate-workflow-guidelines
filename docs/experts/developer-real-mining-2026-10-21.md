# developer-real: mining record (2026-10-21)

Criteria: `docs/experts/real-defects-2026-10-21.md`. Result: 12 seeded (`hard: real`), 8 benign, 8 sibling. `check-real.js` prints `"ok": true`.
Corpus: `developer-real.raw.json`. Scripts, spec and the saved case diffs are under `work/` (`mine.py`, `mine_all.py`, `cands.py`, `benign.py`, `build.py`, `spec.json`, `diffs/`).

## Method as run

- Partial clones (`--filter=blob:none`), then one `fetch --refetch --no-filter` per repo so that blame ran locally. Nothing was built or executed from the repos.
- `mine.py`: non-merge commits since 2026-06-01 whose message matches fix|bug|regression|crash|panic|wrong|incorrect. For each one it blamed (`git blame -w <fix>^`) the lines the fix removes or changes in non-test, non-doc files, and recorded the introducing commit(s) and the size of each one (changed lines, docs and lock files excluded).
- Automatic filters, in this order: not a code bug fix (docs, ci, deps, typo, lint), pure addition (nothing to blame), several introducing commits, no test file in the fix, introducing commit over 300 lines. Rust keeps tests inline, so I rechecked single-intro Rust fixes for an added `#[test]`.
- Every remaining single-intro fix was reviewed by hand against the introducing diff. The fix's author date and commit date are both on or after 2026-06-01 for every kept case.
- Case diff: `git show --format= <introduced>` with docs, changelogs, release notes, `.changeset`, lock files and generated mirrors (`deno_dist/`) left out. No line was edited. Summary: the introducing commit's first paragraph with `(#NNN)`, `#NNN` and links removed.
- Benign check, two passes.
  - Pass 1 (`benign.py`): candidates are non-merge commits in the seeded modules whose message names no bug. For every later commit on the same files whose message names a bug (fix, bug, regression, crash, panic, wrong, incorrect, broken, revert, leak, overflow, race, issue, correct, error), I blamed the lines it removed in its parent. A candidate passes only when none of those lines came from it.
  - Pass 2 (`touched.py`), for the chosen eight: every later commit of any kind whose removed lines blame to the candidate was listed and read, because some projects word fixes without bug words ("Reject ...", "Preserve ...", security squashes titled "Merge commit from fork"). `whyOk` names what was found.
  - aiohttp 34a626da passed pass 1 but was replaced by ffcf9dc4. A later cookie-limits rewrite with a bugfix changelog (b1f6c87b) changed 9 of its lines.
  - Security-advisory squashes were not used as benign cases.
- Sibling check: `touched.py` was also run on each sibling's introducing commit. A sibling is dropped when a later developer-domain fix blames into its production code, because then the expert flagging it would be right.

## Repositories

Cloned and mined: 30. Fix commits examined by the script (since 2026-06-01, matching the bug pattern): 1961.

| repo | language | fixes examined |
|---|---|---|
| gin-gonic/gin | Go | 17 |
| go-resty/resty | Go | 39 |
| urfave/cli | Go | 74 |
| labstack/echo | Go | 28 |
| gofiber/fiber | Go | 496 |
| spf13/cobra | Go | dead since 2026-07 (1 commit), not mined |
| honojs/hono | TypeScript | 120 |
| TanStack/query | TypeScript/React | 202 |
| fastify/fastify | JavaScript (types in TS) | 45 |
| pydantic/pydantic | Python | 48 |
| Kludex/starlette | Python | 4 |
| aio-libs/aiohttp | Python | 163 |
| pallets/click | Python | 14 |
| encode/httpx | Python | no commits since 2026-02, not mined |
| netty/netty | Java | 172 |
| apache/commons-lang | Java | 120 |
| FasterXML/jackson-databind | Java | 84 |
| FasterXML/jackson-core | Java | 47 |
| jhy/jsoup | Java | 45 |
| google/gson | Java | 17 |
| mockito/mockito | Java | 7 |
| square/retrofit | Java | 2 |
| square/okhttp | Kotlin (not a covered language; no seeded case) | 24 |
| tokio-rs/tokio | Rust | 56 |
| tokio-rs/axum | Rust | 13 |
| clap-rs/clap | Rust | 17 |
| hyperium/hyper | Rust | 25 |
| ratatui/ratatui | Rust | 55 |
| BurntSushi/ripgrep | Rust | 17 |
| serde-rs/json, seanmonstar/reqwest, tokio-rs/tracing | Rust | 3, 4, 3 |

The cases come from 12 of these: resty, urfave/cli, fiber, hono, TanStack/query, fastify, pydantic, starlette, aiohttp, netty, jsoup, tokio.

## Drops

Automatic, over all 1961 fixes:

| criterion | count |
|---|---|
| several introducing commits | 916 |
| pure addition, nothing to blame | 232 |
| introducing commit over 300 lines | 233 |
| not a code bug fix (docs, ci, deps, typo, lint) | 177 |
| fix adds no test (test-file heuristic) | 158 |
| single introducing commit, left for review by hand | 245 |

By hand. I reviewed about 55 of the 245 single-intro fixes in depth, including the 12 kept as seeded cases. I chose them by language need and plausibility, and skimmed the rest of the list by subject. Of those reviewed:

- **Blamed commit did not introduce the defect** (the defective logic predates it, or the commit only moved, renamed or re-indented it; the "blame is not proof of origin" limit): 15.
  - gin 4a3eb31f (757a638b only renamed a parameter)
  - pydantic 05bc5da8 (the line was later simplified by another commit; its diff also contains FIXME)
  - TanStack f608f933, 9656dc4e
  - hono 5ca49b07
  - jackson-databind ee072047, b5d39be5 (code moved from Comparators)
  - ratatui 81e667f3
  - starlette 37309255
  - jsoup 1fb2c97f
  - commons-lang 9288e2c9, 86ed42da (rename only), 0edbb4ae
  - hyper 3534d75c
  - axum 3f06eadb (manifests only after a later change)
- **Defect needs code or tool knowledge outside the diff**: 9.
  - axum f660aa90 (the panic is in `format_ident!` outside the diff; it also predates the commit)
  - tokio 482eadde (time-driver unpark semantics)
  - jackson-databind 6a9d24f8, 6ab788a8
  - clap dee8b8e4 (nushell `directory` type)
  - urfave 4d431a57 (side effect hidden in `lookupAppliedFlag`)
  - netty 0332676f (constructor parameter meaning)
  - hono 271dd0b1 (JSR CLI semantics; was a devops sibling candidate)
  - TanStack 53bd7875 (a one-line introducing commit shows nothing)
- **Not a defect visible as such in the diff** (behaviour documented as intended there, a design decision, or cosmetic): 7.
  - fiber d878daf3, 74e5f865, 9d451e1c
  - ratatui a1a90d9d
  - jackson-databind 92c57884, 93a315d5
  - commons-lang 66f93099
- **Several developer defects from the same introducing commit**, so a single `planted` would be ambiguous: 4 groups.
  - netty e66ce347 (d99a8f75 also produced two other fixes)
  - hono c3053ccf, 546eca0c and 2126289c (all from f356702e)
  - aiohttp 5789546e and c4de9838 (both from fbf555c3)
- **Edge or reserve, not used**: hono 43379d93 (cloneElement), hono f5a53463, fiber ae47f40b (uint64 counter wrap), resty 4e64897f.
- **Giveaway word in the diff**: 1 (pydantic 05bc5da8, FIXME; it was already dropped for blame). `build.py` dropped none of the 28 kept diffs.
- **Introducing commit is a merge**: 0 among the kept cases.
- **Sibling candidates dropped by hand**: 3, plus the two devops candidates already counted above.
  - gin d8f2d588 <- 93ff771e (security): the missing ReadHeaderTimeout predates the commit, since the old code was `http.ListenAndServe`.
  - fiber a730faf5 <- e19d29b2 (security): the blamed lines are doc comments only.
  - fiber 51f312f4 <- 7a17195c (quality): later developer fixes 3f2fb535 and 23415e28 blame into its client/core.go lines.

## Language spread

| kind | Go | TypeScript | Python | Java | other |
|---|---|---|---|---|---|
| seeded (12) | 4 (resty x3, urfave/cli) | 4 (hono x2, TanStack x2) | 3 (pydantic, starlette, aiohttp) | 1 (netty) | 0 |
| benign (8) | 2 (resty, urfave/cli) | 3 (hono x2, TanStack) | 3 (pydantic, starlette, aiohttp) | 0 | 0 |
| sibling (8) | 1 (fiber) | 2 (fastify types, hono types) | 2 (aiohttp x2) | 1 (jsoup) | 2 YAML workflows (fastify CI, tokio CI) |

- Seeded cases cover 4 languages.
- **Rust has no seeded case.** Every Rust single-intro fix failed by hand: blame pointed at a refactor that predated the defect, the defect needed code outside the diff, or the change was a design call.
- **Java has one.** The other Java candidates failed the same way.
- I did not loosen any criterion to fill these.

## Siblings by domain

- security: 3 (fiber session store error sent to the client, fastify CI `secrets: inherit`, jsoup Cleaner)
- quality: 3 (tokio CI gate, aiohttp flaky fd test, aiohttp 0.2 s timeout test)
- softarch: 2 (fastify public types, hono public types)
- No architect or devops case met the dating and blame rules with a defect visible in the diff.

The two CI siblings (fastify, tokio) change workflow files only, where the project has no tests, so their fixes add no test.

## Points for the validity agent

- **Other later fixes that blame into a seeded diff** (`work/seeded-touched.txt` lists every later commit that changed a line of a seeded diff):
  - netty 0b576697: 69b78511 (2026-06-24) removed `trim()` so control bytes around the version token are rejected. That is request-smuggling hardening (security), so it is not a second developer defect.
  - resty 48a1a594: 22ccb8e9 (2026-06-15) changed one line of it, `r.ctxCancelFunc = nil` in Clone. That line resets the receiver rather than the clone, the same pattern the surrounding pre-existing lines already had.
  - aiohttp 8ae650be: 22170b21 (2023-11) fixed the MAX_TIME probe on PyPy/Windows (it caught OSError only). This is a platform-specific second defect, fixed before the date window.
  - TanStack 4bbfe2ab: 36c02b6f (2021) made the `broadcastChannel` option optional in its type (it had a default but was typed as required).
  - Every other later commit on the seeded diffs is a feature, a refactor, docs or the recorded fix.
- **urfave 57bfb1c9 (seeded):** `MapFlagKeyValueSeparator` was new in that commit. The regression is the slice separator, which is no longer inherited (fixed by bf96dc85 on 2026-10-11). The map half is fixed by d5d3902c, which is the recorded `fixed`.
- **aiohttp 9e08ba02 (seeded):** the fix also adds `resp.close()` in client.py, which is unrelated to the introducing commit. Only the cookiejar part is planted.
- **Domain tension:** the criteria file gives the developer expert correctness, error handling, concurrency and resources. `domains.json` puts "wrong results on boundary inputs" under `review`. I preferred error-handling and resource cases (resty context leak, broadcast tx flag, pretty-json throw, cookie OverflowError, SecretStr TypeError). The rest are boundary-input correctness (q-values, `??` with null, empty hostname, int overflow, divide by zero, separator inheritance).
