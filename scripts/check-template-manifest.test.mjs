import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blockSkills, checkManifest, globToRegExp, ownershipOf } from './check-template-manifest.mjs';

const manifest = {
  template: 'template-website',
  skills: { release: 'platform', 'release-template': 'template-only' },
  paths: [
    { path: '.agents/skills/release-template/**', ownership: 'template-only' },
    { path: '.agents/skills/release/**', ownership: 'platform' },
    { path: '.github/workflows/*', ownership: 'platform' },
    { path: 'src/**', ownership: 'product' },
    { path: 'AGENTS.md', ownership: 'shared' },
  ],
};
const skill = (name, ownership) =>
  `---\nname: ${name}\ndescription: x\nmetadata:\n  owner: template-website\n  ownership: ${ownership}\n---\n# ${name}\n`;
const agents = '# x\n<!-- template-skills:start -->\n| Skill | Use |\n| --- | --- |\n| [`release`](x) | y |\n<!-- template-skills:end -->\n';
const valid = () => ({
  manifest,
  files: ['src/a/b.ts', '.github/workflows/ci.yml', 'AGENTS.md', '.agents/skills/release/SKILL.md'],
  skillFiles: { release: skill('release', 'platform'), 'release-template': skill('release-template', 'template-only') },
  agentsMd: agents,
});

test('globs: * stays in one folder, ** crosses folders', () => {
  assert.ok(globToRegExp('.github/workflows/*').test('.github/workflows/ci.yml'));
  assert.ok(!globToRegExp('.github/workflows/*').test('.github/workflows/a/ci.yml'));
  assert.ok(globToRegExp('src/**').test('src/pages/[...lang]/index.astro'));
  assert.ok(globToRegExp('docs/upgrading/template-*.md').test('docs/upgrading/template-v0.1.0.md'));
  assert.ok(!globToRegExp('docs/upgrading/template-*.md').test('docs/upgrading/README.md'));
});

test('the first matching rule wins', () => {
  assert.equal(ownershipOf(manifest, '.agents/skills/release-template/SKILL.md'), 'template-only');
  assert.equal(ownershipOf(manifest, '.agents/skills/release/SKILL.md'), 'platform');
  assert.equal(ownershipOf(manifest, 'README.md'), undefined);
});

test('a valid template passes', () => {
  assert.deepEqual(checkManifest(valid()), []);
});

test('a file without a rule fails', () => {
  const input = valid();
  input.files.push('README.md');
  assert.match(checkManifest(input).join('\n'), /README.md matches no rule/);
});

test('an unlisted skill folder fails', () => {
  const input = valid();
  input.skillFiles.extra = skill('extra', 'shared');
  assert.match(checkManifest(input).join('\n'), /\.agents\/skills\/extra is not listed/);
});

test('front matter must repeat the owner and ownership', () => {
  const input = valid();
  input.skillFiles.release = skill('release', 'shared');
  assert.match(checkManifest(input).join('\n'), /metadata.ownership must be platform/);
});

test('the AGENTS.md block lists the skills a product gets, not template-only ones', () => {
  assert.deepEqual(blockSkills(agents), ['release']);
  const input = valid();
  input.agentsMd = agents.replace('| [`release`](x) | y |', '| [`release`](x) | y |\n| `release-template` | z |');
  assert.match(checkManifest(input).join('\n'), /expected \[release\]/);
  input.agentsMd = '# no block';
  assert.match(checkManifest(input).join('\n'), /needs a template skills block/);
});
