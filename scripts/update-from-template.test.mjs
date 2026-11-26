import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import {
  applyUpdate,
  buildReport,
  canaryGate,
  chooseTarget,
  firstActiveRepo,
  hasSteps,
  ownershipOf,
  parseArgs,
  planUpdate,
  replaceBlock,
  section,
  writeTemplateVersion,
} from './update-from-template.mjs';

test('takes the highest patch of the next minor, never two minors', () => {
  const tags = ['v0.1.0', 'v0.1.1', 'v0.2.0', 'v0.2.1', 'v0.3.0', 'v0.4.0-rc.1'];
  assert.equal(chooseTarget('v0.1.0', tags), 'v0.2.1');
  assert.equal(chooseTarget('v0.2.0', tags), 'v0.3.0');
  assert.equal(chooseTarget('v0.3.0', tags), undefined);
  // Only patches left in the same minor.
  assert.equal(chooseTarget('v0.1.0', ['v0.1.0', 'v0.1.1', 'v0.1.2']), 'v0.1.2');
  // Across a major.
  assert.equal(chooseTarget('v0.9.1', ['v0.9.1', 'v1.0.0', 'v1.0.1', 'v1.1.0']), 'v1.0.1');
  // Versions compare as numbers.
  assert.equal(chooseTarget('v0.9.0', ['v0.9.0', 'v0.10.0']), 'v0.10.0');
});

test('bumps .template-version and keeps its comments', () => {
  const text = '# the template\ntemplate: template-webapp\nversion: v0.1.0\ncommit: abc\n';
  assert.equal(
    writeTemplateVersion(text, { version: 'v0.2.0', commit: 'def' }),
    '# the template\ntemplate: template-webapp\nversion: v0.2.0\ncommit: def\n',
  );
  assert.equal(writeTemplateVersion('template: x\nversion: v0.1.0', { version: 'v0.2.0', commit: 'd' }), 'template: x\nversion: v0.2.0\ncommit: d\n');
});

test('reads a section of the release notes', () => {
  const md = '# v0.2.0\n\nIntro.\n\n## Breaking\n\nNo.\n\n## Upgrade steps\n\n1. Run it.\n2. Check it.\n\n## Other\n\nx\n';
  assert.equal(section(md, 'Breaking'), 'No.');
  assert.equal(section(md, 'Upgrade steps'), '1. Run it.\n2. Check it.');
  assert.equal(section(md, 'Requires'), undefined);
  assert.equal(hasSteps('1. Run it.'), true);
  assert.equal(hasSteps('None.'), false);
  assert.equal(hasSteps('Nothing to do.'), false);
  assert.equal(hasSteps(undefined), false);
});

test('rewrites only the template block of AGENTS.md, in the file\'s line endings', () => {
  const S = '<!-- template-skills:start -->';
  const E = '<!-- template-skills:end -->';
  const local = `# Mine\r\n\r\n${S}\r\n| old |\r\n${E}\r\n\r\nProject skills\r\n`;
  const target = `# Template\n\n${S}\n| new |\n| newer |\n${E}\n`;
  assert.equal(replaceBlock(local, target), `# Mine\r\n\r\n${S}\r\n| new |\r\n| newer |\r\n${E}\r\n\r\nProject skills\r\n`);
  assert.equal(replaceBlock('no block', target), undefined);
});

test('the first matching rule gives the ownership', () => {
  const manifest = { paths: [{ path: 'docs/upgrading/template-*.md', ownership: 'template-only' }, { path: 'docs/**', ownership: 'shared' }] };
  assert.equal(ownershipOf(manifest, 'docs/upgrading/template-v0.1.0.md'), 'template-only');
  assert.equal(ownershipOf(manifest, 'docs/a/b.md'), 'shared');
  assert.equal(ownershipOf(manifest, 'README.md'), undefined);
});

test('the canary is the first active product of the template', () => {
  const catalog = {
    tenants: [
      { slug: 'a', products: [{ repo: 'a-website-x', template: 'tl-template-website' }, { repo: 'a-webapp-old', template: 'tl-product-webapp', state: 'archived' }] },
      { slug: 'b', products: [{ repo: 'b-webapp-y', template: 'tl-product-webapp', state: 'active' }, { repo: 'b-webapp-z', template: 'tl-product-webapp' }] },
    ],
  };
  assert.equal(firstActiveRepo(catalog, 'tl-product-webapp'), 'b-webapp-y');
  assert.equal(firstActiveRepo(catalog, 'tl-product-saas'), undefined);

  const files = {
    'tl-cloud-infrastructure/catalog/products.yaml': 'tenants:\n  - slug: b\n    products:\n      - { repo: b-webapp-y, template: tl-product-webapp }\n',
    'b-webapp-y/.template-version': 'template: template-webapp\nversion: v0.2.0\n',
  };
  const readFile = (repo, path) => files[`${repo}/${path}`];
  const plan = { repoName: 'tl-product-webapp', target: 'v0.2.0' };
  assert.deepEqual(canaryGate({ plan, thisRepo: 'b-webapp-z', readFile }), { go: true, canary: 'b-webapp-y', canaryVersion: 'v0.2.0' });
  assert.equal(canaryGate({ plan: { ...plan, target: 'v0.3.0' }, thisRepo: 'b-webapp-z', readFile }).go, false);
  assert.equal(canaryGate({ plan: { ...plan, target: 'v0.3.0' }, thisRepo: 'b-webapp-y', readFile }).go, true);
});

test('parses the options', () => {
  assert.deepEqual(parseArgs(['--apply', '--report', 'r.md', '--wait-for-canary']), { apply: true, waitForCanary: true, report: 'r.md' });
  assert.throws(() => parseArgs(['--merge']));
});

// ---- An update end to end, on a template and a product in temporary repositories.

const root = mkdtempSync(join(tmpdir(), 'update-from-template-test-'));
after(() => rmSync(root, { recursive: true, force: true }));

function sh(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, '-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', '-c', 'tag.gpgsign=false', ...args], {
    encoding: 'utf8',
  }).trim();
}
function init(dir) {
  mkdirSync(dir, { recursive: true });
  sh(dir, 'init', '-q', '-b', 'main');
  sh(dir, 'config', 'core.autocrlf', 'false');
}
function write(dir, files) {
  for (const [path, text] of Object.entries(files)) {
    const file = join(dir, path);
    if (text === null) rmSync(file, { force: true });
    else {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, text);
    }
  }
}
function release(dir, version, files) {
  write(dir, files);
  sh(dir, 'add', '-A');
  sh(dir, 'commit', '-q', '-m', version);
  sh(dir, 'tag', '-a', '-m', version, `template-webapp/${version}`);
  return sh(dir, 'rev-parse', 'HEAD');
}

const manifest = (skills) =>
  [
    'template: template-webapp',
    'skills:',
    ...skills.map((s) => `  ${s}: platform`),
    'paths:',
    '  - { path: template-manifest.yaml, ownership: template-only }',
    '  - { path: docs/upgrading/template-*.md, ownership: template-only }',
    '  - { path: .github/workflows/*, ownership: platform }',
    '  - { path: .agents/skills/release/**, ownership: platform }',
    '  - { path: .agents/skills/update-from-template/**, ownership: platform }',
    '  - { path: README.md, ownership: product }',
    '  - { path: "**", ownership: shared }',
    '',
  ].join('\n');
const block = (skills) => `<!-- template-skills:start -->\n${skills.map((s) => `| \`${s}\` |`).join('\n')}\n<!-- template-skills:end -->`;
const lines = (...l) => `${l.join('\n')}\n`;

const template = join(root, 'tl-product-webapp');
init(template);
const v010 = release(template, 'v0.1.0', {
  'template-manifest.yaml': manifest(['release']),
  'docs/upgrading/template-v0.1.0.md': '# v0.1.0\n\n## Breaking\n\nYes: the first release.\n',
  '.github/workflows/ci.yml': 'ci: 1\n',
  '.agents/skills/release/SKILL.md': 'release 1\n',
  'AGENTS.md': `# Template\n\n${block(['release'])}\n`,
  'README.md': 'The template.\n',
  'docs/merge.md': lines('1', '2', '3', '4', '5', '6'),
  'docs/conflict.md': lines('a', 'b', 'c'),
  'docs/gone.md': 'gone\n',
  'docs/gone-kept.md': 'kept\n',
  'docs/same.md': 'same\n',
  'docs/has-it.md': lines('x', 'y', 'z'),
  'docs/image.bin': Buffer.from([1, 0, 2]),
  'scripts/run.sh': '#!/bin/sh\necho 1\n',
});
release(template, 'v0.1.1', {
  'docs/upgrading/template-v0.1.1.md': '# v0.1.1\n\n## Breaking\n\nNo.\n\n## Upgrade steps\n\nNone.\n',
  '.github/workflows/ci.yml': 'ci: 1.1\n',
});
const v020 = release(template, 'v0.2.0', {
  'template-manifest.yaml': manifest(['release', 'update-from-template']),
  'docs/upgrading/template-v0.2.0.md': '# v0.2.0\n\n## Breaking\n\nNo.\n\n## Requires\n\nNothing new.\n\n## Upgrade steps\n\n1. Set the variable X.\n',
  '.github/workflows/ci.yml': 'ci: 2\n',
  '.agents/skills/update-from-template/SKILL.md': 'update 2\n',
  'AGENTS.md': `# Template\n\n${block(['release', 'update-from-template'])}\n`,
  'README.md': 'The template, better.\n',
  'docs/merge.md': lines('1 template', '2', '3', '4', '5', '6'),
  'docs/conflict.md': lines('a', 'b template', 'c'),
  'docs/gone.md': null,
  'docs/gone-kept.md': null,
  'docs/new.md': 'new\n',
  'docs/has-it.md': lines('x template', 'y', 'z'),
  'docs/image.bin': Buffer.from([1, 0, 3]),
});
release(template, 'v0.3.0', { 'docs/upgrading/template-v0.3.0.md': '# v0.3.0\n', 'docs/new.md': 'newer\n' });

function product(name, extra = {}) {
  const dir = join(root, name);
  init(dir);
  write(dir, {
    '.template-version': `# made from the template\ntemplate: template-webapp\nversion: v0.1.0\ncommit: ${v010}\n`,
    '.github/workflows/ci.yml': 'ci: 1\n',
    '.agents/skills/release/SKILL.md': 'release 1\n',
    '.agents/skills/mine/SKILL.md': 'my skill\n',
    'AGENTS.md': `# My product\n\n${block(['release'])}\n\nMy rules.\n`,
    'README.md': 'My product.\n',
    'docs/merge.md': lines('1', '2', '3', '4', '5', '6 mine'),
    'docs/conflict.md': lines('a', 'b mine', 'c'),
    'docs/gone.md': 'gone\n',
    'docs/gone-kept.md': 'kept, and changed here\n',
    'docs/same.md': 'same\n',
    'docs/has-it.md': lines('x template', 'y', 'z mine'),
    'docs/image.bin': Buffer.from([1, 0, 9]),
    'scripts/run.sh': '#!/bin/sh\necho 1\n',
    ...extra,
  });
  sh(dir, 'add', '-A');
  sh(dir, 'commit', '-q', '-m', 'product');
  return dir;
}

test('applies the next minor path by path, and lists what a person must do', () => {
  const dir = product('acme-webapp-x');
  const plan = planUpdate({ cwd: dir, source: template });
  assert.equal(plan.state, 'ready');
  assert.equal(plan.target, 'v0.2.0');
  assert.deepEqual(plan.releases.map((r) => r.version), ['v0.1.1', 'v0.2.0']);
  assert.equal(plan.commit, v020);

  const done = applyUpdate(plan, { cwd: dir });
  const read = (p) => readFileSync(join(dir, p), 'utf8');
  // platform: copied, a new skill included.
  assert.equal(read('.github/workflows/ci.yml'), 'ci: 2\n');
  assert.equal(read('.agents/skills/update-from-template/SKILL.md'), 'update 2\n');
  // shared: both sides' changes merged; a clash marked; deletions only when unchanged here.
  assert.equal(read('docs/merge.md'), lines('1 template', '2', '3', '4', '5', '6 mine'));
  assert.match(read('docs/conflict.md'), /<<<<<<< this repository\nb mine\n=======\nb template\n>>>>>>> v0.2.0/);
  assert.equal(existsSync(join(dir, 'docs/gone.md')), false);
  assert.equal(read('docs/gone-kept.md'), 'kept, and changed here\n');
  assert.equal(read('docs/new.md'), 'new\n');
  assert.deepEqual(readFileSync(join(dir, 'docs/image.bin')), Buffer.from([1, 0, 9]));
  // product, template-only and project skills: untouched.
  assert.equal(read('README.md'), 'My product.\n');
  assert.equal(existsSync(join(dir, 'template-manifest.yaml')), false);
  assert.equal(existsSync(join(dir, 'docs/upgrading/template-v0.2.0.md')), false);
  assert.equal(read('.agents/skills/mine/SKILL.md'), 'my skill\n');
  // AGENTS.md: the block from the template, the rest merged.
  assert.match(read('AGENTS.md'), /\| `update-from-template` \|/);
  assert.match(read('AGENTS.md'), /My rules\./);
  // .template-version: bumped, comment kept.
  assert.equal(read('.template-version'), `# made from the template\ntemplate: template-webapp\nversion: v0.2.0\ncommit: ${v020}\n`);

  assert.equal(done.conflicts.length, 2);
  assert.match(done.conflicts.join('\n'), /docs\/conflict\.md.*1 conflict/);
  assert.match(done.conflicts.join('\n'), /docs\/image\.bin.*binary/);
  assert.deepEqual(done.kept, ['`docs/gone-kept.md`: deleted in the template, changed here; kept']);
  assert.deepEqual(done.suggestions.map((s) => s.path), ['README.md']);
  // A merge that changes nothing here is not listed.
  assert.equal(done.shared.some((s) => s.includes('docs/has-it.md')), false);
  assert.equal(read('docs/has-it.md'), lines('x template', 'y', 'z mine'));
  assert.equal(done.needsAgent, true);

  const { title, body } = buildReport(plan, done, { repo: 'acme-webapp-x' });
  assert.equal(title, 'chore(template): template-webapp/v0.2.0');
  assert.match(body, /## Conflicts\n\n- `docs\/conflict\.md`/);
  assert.match(body, /### v0\.2\.0\n\n1\. Set the variable X\./);
  assert.match(body, /<summary><code>README\.md<\/code> \(M\)<\/summary>/);
  assert.match(body, /\*\*Needs an agent:\*\*/);
});

test('a clean update with no upgrade steps needs no agent', () => {
  const dir = product('acme-webapp-clean', {
    'docs/merge.md': lines('1', '2', '3', '4', '5', '6'),
    'docs/conflict.md': lines('a', 'b', 'c'),
    'docs/gone-kept.md': 'kept\n',
    'docs/image.bin': Buffer.from([1, 0, 2]),
    'docs/new.md': 'new\n',
    '.template-version': `template: template-webapp\nversion: v0.2.0\ncommit: ${v020}\n`,
  });
  const plan = planUpdate({ cwd: dir, source: template });
  assert.equal(plan.target, 'v0.3.0');
  const done = applyUpdate(plan, { cwd: dir });
  assert.equal(readFileSync(join(dir, 'docs/new.md'), 'utf8'), 'newer\n');
  assert.equal(done.needsAgent, false);
  assert.equal(planUpdate({ cwd: dir, source: template }).state, 'up-to-date');
});

test('stops when the template adds a skill with the name of a project skill', () => {
  const dir = product('acme-webapp-clash', { '.agents/skills/update-from-template/SKILL.md': 'my own\n' });
  const plan = planUpdate({ cwd: dir, source: template });
  assert.equal(plan.state, 'clash');
  assert.match(plan.message, /update-from-template/);
});

test('does nothing in the template itself or in a repository without .template-version', () => {
  assert.equal(planUpdate({ cwd: template }).state, 'template');
  const dir = join(root, 'untracked');
  init(dir);
  assert.equal(planUpdate({ cwd: dir }).state, 'untracked');
});
