#!/usr/bin/env node
'use strict';

// Deterministic router from changed paths to domain experts, plus the reader and
// writer for the `experts:` line in a plan file's frontmatter.
//
// It exists because workflow scripts have no filesystem or shell: they cannot see
// the diff or the plan. The plan and review commands run this from the shell and
// pass the result to the workflow as `args.experts`. Standard library only, so the
// install stays one command with no dependencies.
//
//   git diff --name-status main..HEAD | node route.js                  routes, prints JSON
//   git diff --name-status main..HEAD | node route.js --write-plan P   records into plan P
//   node route.js --read-plan P                                         prints the plan's experts
//
// The plan file is always named explicitly. Nothing here picks "the newest PLAN-*.md".
// Exit code 2 means the input was unusable, with the reason on stderr.

const fs = require('node:fs');

const DOC_EXT = new Set(['.md', '.txt', '.rst', '.adoc']);

const NAME_TOKENS = new Set([
  'auth', 'authn', 'authz', 'oauth', 'oauth2', 'login', 'logout', 'signin', 'signup',
  'session', 'sessions', 'jwt', 'token', 'tokens', 'crypto', 'cryptography', 'secret',
  'secrets', 'password', 'passwords', 'passwd', 'credential', 'credentials', 'permission',
  'permissions', 'acl', 'rbac', 'sso', 'saml', 'csrf', 'cors', 'sanitize', 'sanitizer',
  'middleware', 'route', 'routes', 'controller', 'controllers', 'handler', 'handlers',
  'webhook', 'webhooks', 'upload', 'uploads', 'endpoint', 'endpoints', 'cookie', 'cookies',
])

const MANIFESTS = new Set([
  'package.json', 'package-lock.json', 'npm-shrinkwrap.json', 'pnpm-lock.yaml', 'yarn.lock',
  'pyproject.toml', 'uv.lock', 'poetry.lock', 'pipfile', 'pipfile.lock', 'setup.py',
  'go.mod', 'go.sum', 'cargo.toml', 'cargo.lock', 'gemfile', 'gemfile.lock', 'pom.xml',
  'build.gradle', 'build.gradle.kts', 'composer.json', 'composer.lock', '.mcp.json', 'mcp.json',
])

const SCRIPT_EXT = new Set(['.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd'])
const KEY_EXT = new Set(['.pem', '.key', '.p12', '.pfx', '.crt', '.cer', '.jks'])
const IAC_EXT = new Set(['.tf', '.tfvars'])
const CI_BASES = new Set(['.gitlab-ci.yml', 'azure-pipelines.yml', 'jenkinsfile'])
const PLUGIN_CONFIG_BASES = new Set(['plugin.json', 'marketplace.json', 'hooks.json'])
const AGENT_BASES = new Set(['agents.md', 'claude.md', 'gemini.md', '.cursorrules'])

function describe(raw) {
  const orig = String(raw).replace(/\r/g, '').trim().replace(/\\/g, '/').replace(/^\.\//, '')
  const p = orig.toLowerCase()
  const base = p.slice(p.lastIndexOf('/') + 1)
  const dot = base.lastIndexOf('.')
  const ext = dot > 0 ? base.slice(dot) : ''
  const isTest =
    /(^|\/)(tests?|__tests__|specs?)\//.test(p) ||
    /\.(test|spec)\.[a-z0-9]+$/.test(base) ||
    /^test_.*\.py$/.test(base) ||
    /_test\.(go|py|rb)$/.test(base)
  const tokens = orig
    .split('/')
    .map((seg, i, all) => (i === all.length - 1 && seg.lastIndexOf('.') > 0 ? seg.slice(0, seg.lastIndexOf('.')) : seg))
    .flatMap((seg) => seg.split(/(?<=[a-z0-9])(?=[A-Z])|[^A-Za-z0-9]+/))
    .map((t) => t.toLowerCase())
    .filter(Boolean)
  return { p, base, ext, isTest, isDoc: DOC_EXT.has(ext), tokens }
}

// Each rule is (lowercased normalized path, details) => boolean. A path routes to
// an expert when any of that expert's rules says yes.
const RULES = {
  security: [
    // Dependency manifests and lockfiles.
    (p, d) => MANIFESTS.has(d.base) || /^requirements[\w.-]*\.txt$/.test(d.base),
    // Container, CI and infrastructure definitions.
    (p, d) => /^dockerfile(\.[a-z0-9_-]+)?$/.test(d.base) && !d.isDoc,
    (p, d) => d.ext === '.dockerfile' || /^docker-compose[\w.-]*\.ya?ml$/.test(d.base),
    (p) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(p) || /(^|\/)\.circleci\/config\.yml$/.test(p),
    (p, d) => CI_BASES.has(d.base) || IAC_EXT.has(d.ext),
    // Anything that executes, and key material.
    (p, d) => SCRIPT_EXT.has(d.ext) || KEY_EXT.has(d.ext) || d.base.startsWith('.env'),
    // The agent surface: instructions and configuration that steer an agent or run hooks.
    (p, d) => AGENT_BASES.has(d.base) || d.ext === '.mdc' || PLUGIN_CONFIG_BASES.has(d.base),
    (p) => /(^|\/)\.(claude|cursor)\//.test(p),
    (p, d) => /(^|\/)(agents|commands)\/[^/]+\.md$/.test(p) && d.ext === '.md',
    (p) => /(^|\/)skills\/.+\.md$/.test(p),
    (p) => /(^|\/)\.(cursor|claude)-plugin\//.test(p) && /(^|\/)hooks\//.test(p),
    // Names that say a path handles identity, secrets or untrusted input.
    (p, d) => !d.isTest && !d.isDoc && d.tokens.some((t) => NAME_TOKENS.has(t)),
  ],
}

function parseNameStatus(text) {
  const out = []
  for (const line of String(text).split(/\r?\n/)) {
    if (!line.trim()) continue
    if (!line.includes('\t')) {
      out.push(line.trim())
      continue
    }
    const parts = line.split('\t')
    const status = parts[0].trim()
    if (/^[RC]\d*$/.test(status)) out.push(...parts.slice(1, 3))
    else out.push(...parts.slice(1, 2))
  }
  return out.filter(Boolean)
}

function routeExperts(paths, rules = RULES) {
  const details = paths.map((raw) => {
    const d = describe(raw)
    return d
  })
  return Object.keys(rules).filter((expert) =>
    details.some((d) => rules[expert].some((rule) => rule(d.p, d)))
  )
}

// ---- plan frontmatter ----

function frontmatter(text) {
  const bom = text.charCodeAt(0) === 0xfeff ? '﻿' : ''
  const body = text.slice(bom.length)
  const open = /^---[ \t]*\r?\n/.exec(body)
  if (!open) return null
  const rest = body.slice(open[0].length)
  const close = /^---[ \t]*(\r?\n|$)/m.exec(rest)
  if (!close) return null
  return {
    bom,
    open: open[0],
    block: rest.slice(0, close.index),
    after: rest.slice(close.index),
    eol: open[0].endsWith('\r\n') ? '\r\n' : '\n',
  }
}

const EXPERTS_LINE = /^experts[ \t]*:[ \t]*(.*?)[ \t]*$/m

function readExperts(text) {
  const fm = frontmatter(text)
  if (!fm) return { present: false, experts: [] }
  const m = EXPERTS_LINE.exec(fm.block)
  if (!m) return { present: false, experts: [] }
  const value = m[1].replace(/\r$/, '')
  if (value === '') {
    return { present: true, experts: [], error: 'unsupported `experts:` value: write an inline list such as `experts: [security]` or `experts: []`' }
  }
  const inner = value.replace(/^\[/, '').replace(/\]$/, '')
  const names = [...new Set(inner.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean))]
  const unknown = names.filter((n) => !Object.prototype.hasOwnProperty.call(RULES, n))
  if (unknown.length > 0) {
    return {
      present: true,
      experts: [],
      error: `Unknown expert(s) in plan: ${unknown.join(', ')} (known: ${Object.keys(RULES).join(', ')})`,
    }
  }
  return { present: true, experts: names }
}

function format(list) {
  return `experts: [${list.join(', ')}]`
}

function writeExperts(text, routed, { force = false } = {}) {
  const unknown = routed.filter((n) => !Object.prototype.hasOwnProperty.call(RULES, n))
  if (unknown.length > 0) throw new Error(`Unknown expert(s): ${unknown.join(', ')}`)
  const fm = frontmatter(text)
  if (!fm) throw new Error('the plan file has no frontmatter block (--- ... ---) to record experts in')
  const current = readExperts(text)
  if (current.error) throw new Error(current.error)

  if (!current.present) {
    return {
      text: fm.bom + fm.open + fm.block + format(routed) + fm.eol + fm.after,
      changed: true,
      differs: false,
      routed,
      current: [],
    }
  }
  const same = current.experts.length === routed.length && current.experts.every((e, i) => e === routed[i])
  if (same) return { text, changed: false, differs: false, routed, current: current.experts }
  if (!force) return { text, changed: false, differs: true, routed, current: current.experts }
  const block = fm.block.replace(/^experts[ \t]*:.*$/m, format(routed))
  return {
    text: fm.bom + fm.open + block + fm.after,
    changed: true,
    differs: true,
    routed,
    current: current.experts,
  }
}

// ---- command line ----

function fail(message) {
  process.stderr.write(`route.js: ${message}\n`)
  process.exit(2)
}

function main(argv) {
  let planFile = ''
  let mode = 'route'
  let force = false
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--name-status') continue
    else if (a === '--force') force = true
    else if (a === '--write-plan' || a === '--read-plan') {
      mode = a === '--write-plan' ? 'write' : 'read'
      planFile = argv[++i] || ''
      if (!planFile) fail(`${a} needs a plan file path`)
    } else fail(`unknown argument: ${a}`)
  }

  const readPlan = () => {
    try {
      return fs.readFileSync(planFile, 'utf8')
    } catch (err) {
      fail(`cannot read plan file ${planFile}: ${err.message}`)
    }
  }

  if (mode === 'read') {
    const r = readExperts(readPlan())
    if (r.error) fail(r.error)
    process.stdout.write(JSON.stringify({ file: planFile, present: r.present, experts: r.experts }) + '\n')
    return
  }

  const routed = routeExperts(parseNameStatus(fs.readFileSync(0, 'utf8')))
  if (mode === 'route') {
    process.stdout.write(JSON.stringify({ experts: routed }) + '\n')
    return
  }

  let result
  try {
    result = writeExperts(readPlan(), routed, { force })
  } catch (err) {
    fail(err.message)
  }
  if (result.changed) fs.writeFileSync(planFile, result.text)
  process.stdout.write(
    JSON.stringify({ file: planFile, experts: routed, changed: result.changed, differs: result.differs, current: result.current }) + '\n'
  )
}

module.exports = { RULES, routeExperts, parseNameStatus, readExperts, writeExperts }

if (require.main === module) main(process.argv.slice(2))
