// Takes the next release of this repository's template, the routine part of the
// update-from-template skill (.agents/skills/update-from-template/SKILL.md,
// docs/upgrading/README.md). The same file in every template; owned by the platform.
//
//   node scripts/update-from-template.mjs                    # what the next update brings; changes nothing
//   node scripts/update-from-template.mjs --apply            # applies it and bumps .template-version
//     --report <file>       with --apply: write the PR title and body (Markdown) to this file
//     --outputs <file>      append key=value lines (state, target, branch, title, needs_agent) for $GITHUB_OUTPUT
//     --wait-for-canary     stop with state=waiting until the canary repository has taken the target
//     --source <url|path>   the template repository to fetch from (default: its GitHub repository)
//
// It reads .template-version, fetches the template's tags into refs/template/<template>/*,
// chooses the next minor after the base (with its highest patch), and applies the
// difference between the two tags path by path by the ownership in the target's
// template-manifest.yaml: platform copied, shared 3-way merged (git merge-file),
// product left alone and shown as a suggestion, template-only and sample skipped.
// It rewrites the template block of AGENTS.md, collects the release notes and lists
// every conflict. It never commits: the template-update workflow or a person does.
// It stops when a template skill would take the name of a project skill.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, appendFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const ORG = 'TrislabCompany';
/** The repository of each template; its releases are tags <template>/vX.Y.Z there. */
export const TEMPLATE_REPOS = {
  'template-website': 'tl-template-website',
  'template-webapp': 'tl-product-webapp',
  'template-saas': 'tl-product-saas',
};
/** Where the canary of each template is listed: the first active product with that template. */
export const PRODUCTS_CATALOG = { repo: 'tl-cloud-infrastructure', path: 'catalog/products.yaml' };
export const BLOCK_START = '<!-- template-skills:start -->';
export const BLOCK_END = '<!-- template-skills:end -->';
const YAML_VERSION = '2.9.1';
const REPORT_LIMIT = 60000;

// ---- YAML: the yaml package of the repository, or a copy installed once in the temp folder.

let yamlParse;
export function parseYaml(text) {
  if (!yamlParse) yamlParse = loadYaml();
  return yamlParse(text) ?? {};
}

function loadYaml() {
  const bases = [process.env.TEMPLATE_UPDATE_YAML_DIR, 'web', '.'].filter(Boolean).map((b) => resolve(b, 'package.json'));
  const cache = join(tmpdir(), `trislab-template-update-yaml-${YAML_VERSION}`);
  bases.push(join(cache, 'package.json'));
  for (const base of bases) {
    try {
      return createRequire(base)('yaml').parse;
    } catch {
      // the next place
    }
  }
  mkdirSync(cache, { recursive: true });
  const r = spawnSync('npm', ['install', '--no-save', '--no-package-lock', '--silent', '--prefix', cache, `yaml@${YAML_VERSION}`], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) throw new Error(`could not install yaml@${YAML_VERSION}; install it, or set TEMPLATE_UPDATE_YAML_DIR`);
  return createRequire(join(cache, 'package.json'))('yaml').parse;
}

// ---- Versions

export function parseVersion(v) {
  const m = /^v(\d+)\.(\d+)\.(\d+)$/.exec(v ?? '');
  return m ? m.slice(1).map(Number) : undefined;
}

export function compareVersions(a, b) {
  const [pa, pb] = [parseVersion(a), parseVersion(b)];
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

/** The releases after the base, oldest first; prereleases and other tags are ignored. */
export function laterReleases(base, versions) {
  return versions.filter((v) => parseVersion(v) && compareVersions(v, base) > 0).sort(compareVersions);
}

/**
 * The next update: the highest patch of the first minor after the base's minor
 * (v0.1.x -> the highest v0.2.*), never more than one minor. Without a later minor,
 * the highest patch of the base's own minor. Undefined when the base is the newest.
 */
export function chooseTarget(base, versions) {
  const later = laterReleases(base, versions);
  if (later.length === 0) return undefined;
  const [bM, bm] = parseVersion(base);
  const next = later.find((v) => {
    const [M, m] = parseVersion(v);
    return M !== bM || m !== bm;
  });
  const [M, m] = parseVersion(next ?? base);
  return later.filter((v) => parseVersion(v)[0] === M && parseVersion(v)[1] === m).at(-1);
}

// ---- Small text helpers

/** .template-version with a new version and commit; comments and other lines kept. */
export function writeTemplateVersion(text, { version, commit }) {
  let out = text;
  for (const [key, value] of [['version', version], ['commit', commit]]) {
    const re = new RegExp(`^${key}:.*$`, 'm');
    out = re.test(out) ? out.replace(re, `${key}: ${value}`) : `${out.replace(/\s*$/, '\n')}${key}: ${value}\n`;
  }
  return out;
}

/** The text under `## <heading>` up to the next `## ` heading, trimmed; undefined when absent. */
export function section(markdown, heading) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (start < 0) return undefined;
  const end = lines.findIndex((l, i) => i > start && /^## /.test(l));
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n').trim();
}

/** Whether the upgrade steps of a release ask for something ("None." and the like don't). */
export function hasSteps(text) {
  const t = (text ?? '').trim();
  return t !== '' && !/^(none|nothing|no\b)/i.test(t);
}

/** AGENTS.md with its template block replaced by the target's; undefined when either lacks the markers. */
export function replaceBlock(local, target) {
  const block = (t) => {
    const s = t.indexOf(BLOCK_START);
    const e = t.indexOf(BLOCK_END);
    return s < 0 || e < s ? undefined : [s, e + BLOCK_END.length];
  };
  const [l, t] = [block(local), block(target)];
  if (!l || !t) return undefined;
  const eol = local.includes('\r\n') ? '\r\n' : '\n';
  const newBlock = target.slice(t[0], t[1]).replace(/\r?\n/g, eol);
  return local.slice(0, l[0]) + newBlock + local.slice(l[1]);
}

/** The repository of the first active product made from the template, in catalog order. */
export function firstActiveRepo(catalog, templateRepo) {
  for (const tenant of catalog.tenants ?? []) {
    for (const product of tenant.products ?? []) {
      if (product.template === templateRepo && (product.state ?? 'active') === 'active') return product.repo;
    }
  }
  return undefined;
}

// ---- Git

function git(cwd, args, { allowFail = false, buffer = false } = {}) {
  const r = spawnSync('git', ['-C', cwd, ...args], { encoding: buffer ? 'buffer' : 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0 && !allowFail) {
    throw new Error(`git ${args.join(' ')} failed: ${(r.stderr ?? '').toString().trim()}`);
  }
  return r;
}

const show = (cwd, ref, path) => {
  const r = git(cwd, ['show', `${ref}:${path}`], { allowFail: true, buffer: true });
  return r.status === 0 ? r.stdout : undefined;
};
const blobId = (cwd, ref, path) => {
  const r = git(cwd, ['rev-parse', '--verify', '--quiet', `${ref}:${path}`], { allowFail: true });
  return r.status === 0 ? r.stdout.trim() : undefined;
};
/** The blob id of the working file, after the repository's filters (so CRLF checkouts compare equal). */
const fileId = (cwd, path) => git(cwd, ['hash-object', '--', path]).stdout.trim();
const isBinary = (buf) => buf.includes(0);

// ---- Plan

/** Reads the state of the repository and the template; changes nothing but refs/template/*. */
export function planUpdate({ cwd = process.cwd(), source } = {}) {
  const versionFile = join(cwd, '.template-version');
  if (!existsSync(versionFile)) {
    return existsSync(join(cwd, 'template-manifest.yaml'))
      ? { state: 'template', message: 'This is the template itself: it has no .template-version.' }
      : { state: 'untracked', message: 'No .template-version: the first update is done with the update-from-template skill ("An untracked repository").' };
  }
  const versionText = readFileSync(versionFile, 'utf8');
  const current = parseYaml(versionText);
  const template = current.template;
  const repoName = TEMPLATE_REPOS[template];
  if (!repoName) throw new Error(`.template-version names an unknown template: ${template}`);
  if (!parseVersion(current.version)) throw new Error(`.template-version has no version vX.Y.Z: ${current.version}`);

  const from = source ?? `https://github.com/${ORG}/${repoName}.git`;
  git(cwd, ['fetch', '--quiet', '--no-tags', '--force', from, `refs/tags/${template}/*:refs/template/${template}/*`]);
  const prefix = `refs/template/${template}/`;
  const versions = git(cwd, ['for-each-ref', '--format=%(refname)', prefix])
    .stdout.split('\n')
    .filter(Boolean)
    .map((r) => r.slice(prefix.length));
  if (!versions.includes(current.version)) throw new Error(`the template has no release ${template}/${current.version}`);

  const base = current.version;
  const target = chooseTarget(base, versions);
  const common = { template, repoName, base, versionText };
  if (!target) return { ...common, state: 'up-to-date', message: `Up to date with ${template}/${base}.` };

  const baseRef = prefix + base;
  const targetRef = prefix + target;
  const baseManifest = parseYaml(show(cwd, baseRef, 'template-manifest.yaml')?.toString() ?? '');
  const targetManifest = parseYaml(show(cwd, targetRef, 'template-manifest.yaml')?.toString() ?? '');
  if (!targetManifest.paths) throw new Error(`${template}/${target} has no template-manifest.yaml`);

  // A folder in .agents/skills/ that the base doesn't list is a project skill; the target may not take its name.
  const skillsDir = join(cwd, '.agents', 'skills');
  const local = existsSync(skillsDir) ? readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [];
  const projectSkills = local.filter((n) => !(n in (baseManifest.skills ?? {})));
  const clash = Object.keys(targetManifest.skills ?? {}).filter((n) => projectSkills.includes(n));
  if (clash.length > 0) {
    return {
      ...common,
      state: 'clash',
      target,
      message: `${template}/${target} adds the skill ${clash.join(', ')}, the name of a project skill here. Rename the project skill first.`,
    };
  }

  const changes = git(cwd, ['diff', '--name-status', '--no-renames', baseRef, targetRef])
    .stdout.split('\n')
    .filter(Boolean)
    .map((line) => {
      const [status, path] = line.split('\t');
      const manifest = status === 'D' ? baseManifest : targetManifest;
      return { status: status[0], path, ownership: ownershipOf(manifest, path) };
    });

  const releases = laterReleases(base, versions).filter((v) => compareVersions(v, target) <= 0);
  return {
    ...common,
    state: 'ready',
    target,
    baseRef,
    targetRef,
    commit: git(cwd, ['rev-parse', `${targetRef}^{commit}`]).stdout.trim(),
    releases: releases.map((v) => ({ version: v, commit: git(cwd, ['rev-parse', `${prefix}${v}^{commit}`]).stdout.trim() })),
    changes,
    message: `${template}: ${base} -> ${target}, ${changes.length} changed paths.`,
  };
}

/** `*` matches within one folder, `**` across folders; the first matching rule wins. */
export function ownershipOf(manifest, path) {
  for (const rule of manifest.paths ?? []) {
    let re = '';
    for (let i = 0; i < rule.path.length; i++) {
      const c = rule.path[i];
      if (c === '*' && rule.path[i + 1] === '*') {
        re += '.*';
        i++;
      } else if (c === '*') re += '[^/]*';
      else re += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    }
    if (new RegExp(`^${re}$`).test(path)) return rule.ownership;
  }
  return undefined;
}

/** Whether the canary has taken the target. The canary itself, or a template with no canary, goes at once. */
export function canaryGate({ plan, thisRepo, readFile }) {
  const catalog = parseYaml(readFile(PRODUCTS_CATALOG.repo, PRODUCTS_CATALOG.path));
  const canary = firstActiveRepo(catalog, plan.repoName);
  if (!canary || canary === thisRepo) return { go: true, canary };
  const theirs = parseYaml(readFile(canary, '.template-version') ?? '');
  const go = parseVersion(theirs.version) !== undefined && compareVersions(theirs.version, plan.target) >= 0;
  return { go, canary, canaryVersion: theirs.version };
}

// ---- Apply

/** Applies the plan to the working tree; returns what was done, file by file. */
export function applyUpdate(plan, { cwd = process.cwd() } = {}) {
  const done = { platform: [], shared: [], skipped: [], conflicts: [], kept: [], suggestions: [], problems: [] };
  const tmp = mkdtempSync(join(tmpdir(), 'template-update-'));
  const checkout = (path) => git(cwd, ['checkout', plan.targetRef, '--', path]);
  const remove = (path) => {
    git(cwd, ['rm', '-q', '-f', '--ignore-unmatch', '--', path]);
    rmSync(join(cwd, path), { force: true });
  };
  try {
    for (const { status, path, ownership } of plan.changes) {
      const here = existsSync(join(cwd, path));
      switch (ownership) {
        case 'platform':
          if (status === 'D') remove(path);
          else checkout(path);
          done.platform.push(`${status} ${path}`);
          break;
        case 'shared':
          mergeShared({ cwd, plan, status, path, here, tmp, done, checkout, remove });
          break;
        case 'product':
          done.suggestions.push({
            path,
            status,
            diff: git(cwd, ['diff', plan.baseRef, plan.targetRef, '--', path]).stdout,
          });
          break;
        case 'template-only':
        case 'sample':
          if (status === 'D' && here) remove(path);
          done.skipped.push(`${status} ${path}`);
          break;
        default:
          done.problems.push(`\`${path}\` (${status}): no ownership in the template's manifest; not applied`);
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  const agentsPath = join(cwd, 'AGENTS.md');
  const targetAgents = show(cwd, plan.targetRef, 'AGENTS.md')?.toString();
  if (existsSync(agentsPath) && targetAgents) {
    const before = readFileSync(agentsPath, 'utf8');
    const after = replaceBlock(before, targetAgents);
    if (after === undefined) done.problems.push('`AGENTS.md`: no template skills block (`<!-- template-skills:start -->`); not rewritten');
    else if (after !== before) {
      writeFileSync(agentsPath, after);
      done.shared.push('AGENTS.md: the template skills block rewritten');
    }
  }

  writeFileSync(join(cwd, '.template-version'), writeTemplateVersion(plan.versionText, { version: plan.target, commit: plan.commit }));

  const notes = plan.releases.map(({ version, commit }) => {
    const text = show(cwd, plan.targetRef, `docs/upgrading/template-${version}.md`)?.toString();
    if (!text) done.problems.push(`no release notes \`docs/upgrading/template-${version}.md\``);
    return {
      version,
      commit,
      breaking: text && section(text, 'Breaking'),
      requires: text && section(text, 'Requires'),
      steps: text && section(text, 'Upgrade steps'),
    };
  });
  const needsAgent =
    done.conflicts.length > 0 || done.kept.length > 0 || done.problems.length > 0 || notes.some((n) => hasSteps(n.steps));
  return { ...done, notes, needsAgent };
}

function mergeShared({ cwd, plan, status, path, here, tmp, done, checkout, remove }) {
  const targetId = blobId(cwd, plan.targetRef, path);
  const baseId = blobId(cwd, plan.baseRef, path);
  if (status === 'D') {
    if (!here) return;
    if (fileId(cwd, path) === baseId) {
      remove(path);
      done.shared.push(`D ${path}`);
    } else done.kept.push(`\`${path}\`: deleted in the template, changed here; kept`);
    return;
  }
  if (!here) {
    if (status === 'A') {
      checkout(path);
      done.shared.push(`A ${path}`);
    } else done.kept.push(`\`${path}\`: changed in the template, deleted here; left deleted`);
    return;
  }
  const localId = fileId(cwd, path);
  if (localId === targetId) return;
  if (localId === baseId) {
    checkout(path);
    done.shared.push(`${status} ${path}`);
    return;
  }
  const ours = readFileSync(join(cwd, path));
  const baseBuf = baseId ? show(cwd, plan.baseRef, path) : Buffer.alloc(0);
  const theirs = show(cwd, plan.targetRef, path);
  if ([ours, baseBuf, theirs].some(isBinary)) {
    done.conflicts.push(`\`${path}\`: a binary file changed here and in the template; this repository's file kept`);
    return;
  }
  // Merge on LF; a CRLF checkout gets CRLF back.
  const crlf = ours.includes('\r\n');
  const lf = (b) => b.toString('utf8').replace(/\r\n/g, '\n');
  const files = ['ours', 'base', 'theirs'].map((n) => join(tmp, n));
  [ours, baseBuf, theirs].forEach((b, i) => writeFileSync(files[i], lf(b)));
  const r = git(cwd, ['merge-file', '-p', '-L', 'this repository', '-L', plan.base, '-L', plan.target, ...files], { allowFail: true });
  if (r.status < 0 || r.status === null || r.status > 127) throw new Error(`git merge-file failed on ${path}: ${r.stderr}`);
  // This repository already has the template's change.
  if (r.status === 0 && r.stdout === lf(ours)) return;
  writeFileSync(join(cwd, path), crlf ? r.stdout.replace(/\n/g, '\r\n') : r.stdout);
  if (r.status > 0) done.conflicts.push(`\`${path}\`: ${r.status} conflict${r.status > 1 ? 's' : ''}, marked in the file`);
  else done.shared.push(`${status} ${path} (merged with this repository's changes)`);
}

// ---- Report

export function buildReport(plan, done, { repo } = {}) {
  const title = `chore(template): ${plan.template}/${plan.target}`;
  const link = (n) => (repo ? `[${n.version}](https://github.com/${ORG}/${plan.repoName}/blob/${n.commit}/docs/upgrading/template-${n.version}.md)` : n.version);
  const list = (items, none = 'none') => (items.length ? items.map((i) => `- ${i}`).join('\n') : none);
  const perRelease = (key, none) =>
    done.notes.map((n) => `- **${n.version}:** ${(n[key] ?? 'no notes').split(/\n\s*\n/)[0].replace(/\n/g, ' ')}`).join('\n') || none;
  const out = [
    `Takes \`${plan.template}\` from ${plan.base} to ${plan.target}: ${done.notes.map(link).join(', ')}. Applied path by path by the ownership in the template's \`template-manifest.yaml\` with \`scripts/update-from-template.mjs\` ([docs/upgrading/README.md](docs/upgrading/README.md)).`,
    '',
    done.needsAgent
      ? '**Needs an agent:** there are conflicts, kept files or upgrade steps below. Finish this PR with the `update-from-template` skill, on this branch.'
      : 'No conflicts and no upgrade steps: a person reviews it, and it merges once `ci / ci` is green.',
    '',
    '## Breaking',
    '',
    perRelease('breaking', 'none'),
    '',
    '## Requires',
    '',
    perRelease('requires', 'nothing'),
    '',
    '## Changes by ownership',
    '',
    `### platform (copied from the template)\n\n${list(done.platform.map((p) => `\`${p}\``))}`,
    '',
    `### shared (merged)\n\n${list(done.shared.map((p) => `\`${p}\``))}`,
    '',
    `### template-only (not copied)\n\n${done.skipped.length} paths`,
    '',
    '## Conflicts',
    '',
    list(done.conflicts),
    '',
    ...(done.kept.length ? ['## Kept or left deleted', '', list(done.kept), ''] : []),
    ...(done.problems.length ? ['## Problems', '', list(done.problems), ''] : []),
    '## Upgrade steps',
    '',
    done.notes.map((n) => `### ${n.version}\n\n${n.steps ?? 'no notes'}`).join('\n\n'),
    '',
  ];
  const tail = ['', '## Checks', '', '`ci / ci` runs on this PR. Before merging, the product also checks its own screens and features against the changes.'];
  let body = out.join('\n');
  const suggestions = ['## Suggestions for product paths', '', done.suggestions.length ? 'The template changed these paths, which are this repository\'s own. Take what fits.' : 'none', ''];
  for (const s of done.suggestions) {
    const block = `<details><summary><code>${s.path}</code> (${s.status})</summary>\n\n\`\`\`diff\n${s.diff.trimEnd()}\n\`\`\`\n\n</details>\n`;
    const room = REPORT_LIMIT - body.length - suggestions.join('\n').length - tail.join('\n').length;
    suggestions.push(
      block.length < room
        ? block
        : `- \`${s.path}\` (${s.status}): \`git diff ${plan.baseRef} ${plan.targetRef} -- ${s.path}\``,
    );
  }
  body += `\n${suggestions.join('\n')}${tail.join('\n')}\n`;
  return { title, body };
}

// ---- Command line

export function parseArgs(argv) {
  const opts = { apply: false, waitForCanary: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') opts.apply = true;
    else if (a === '--wait-for-canary') opts.waitForCanary = true;
    else if (['--report', '--outputs', '--source'].includes(a) && argv[i + 1]) opts[a.slice(2)] = argv[++i];
    else throw new Error(`unknown option ${a}`);
  }
  return opts;
}

function ghRaw(repo, path) {
  const r = spawnSync('gh', ['api', `repos/${ORG}/${repo}/contents/${path}`, '-H', 'Accept: application/vnd.github.raw'], { encoding: 'utf8' });
  if (r.status !== 0) {
    if (/Not Found|404/.test(r.stderr)) return undefined;
    throw new Error(`gh api ${repo}/${path}: ${r.stderr.trim()}`);
  }
  return r.stdout;
}

function thisRepoName(cwd) {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY.split('/')[1];
  const url = git(cwd, ['remote', 'get-url', 'origin'], { allowFail: true }).stdout?.trim() ?? '';
  return basename(url).replace(/\.git$/, '');
}

function main(argv) {
  const opts = parseArgs(argv);
  const cwd = process.cwd();
  const plan = planUpdate({ cwd, source: opts.source });
  const outputs = { state: plan.state };
  if (plan.state === 'ready' && opts.waitForCanary) {
    const gate = canaryGate({ plan, thisRepo: thisRepoName(cwd), readFile: ghRaw });
    if (!gate.go) {
      plan.state = 'waiting';
      plan.message = `Waiting for the canary ${gate.canary} to take ${plan.template}/${plan.target} (it is on ${gate.canaryVersion ?? 'no release'}).`;
      outputs.state = 'waiting';
    }
  }
  console.log(plan.message);
  if (plan.target) {
    outputs.target = plan.target;
    outputs.branch = `${plan.template}-${plan.target}`;
    outputs.title = `chore(template): ${plan.template}/${plan.target}`;
  }
  if (plan.state === 'ready' && !opts.apply) {
    const by = {};
    for (const c of plan.changes) (by[c.ownership ?? 'none'] ??= []).push(`${c.status} ${c.path}`);
    for (const [o, paths] of Object.entries(by)) console.log(`  ${o}: ${paths.length}\n${paths.map((p) => `    ${p}`).join('\n')}`);
  }
  if (plan.state === 'ready' && opts.apply) {
    const done = applyUpdate(plan, { cwd });
    const { title, body } = buildReport(plan, done, { repo: thisRepoName(cwd) });
    if (opts.report) {
      mkdirSync(dirname(resolve(opts.report)), { recursive: true });
      writeFileSync(opts.report, body);
    }
    outputs.needs_agent = String(done.needsAgent);
    console.log(
      `${title}: ${done.platform.length} platform, ${done.shared.length} shared, ${done.suggestions.length} suggestions, ${done.conflicts.length} conflicts${done.needsAgent ? '; needs an agent' : ''}`,
    );
    for (const c of [...done.conflicts, ...done.kept, ...done.problems]) console.log(`  ${c}`);
  }
  if (opts.outputs) appendFileSync(opts.outputs, Object.entries(outputs).map(([k, v]) => `${k}=${v}\n`).join(''));
  return plan.state === 'clash' ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    console.error(`update-from-template: ${e.message}`);
    process.exitCode = 1;
  }
}
