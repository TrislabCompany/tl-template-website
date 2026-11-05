// Checks template-manifest.yaml in a template repository (docs/template-releases.md):
// every file has an ownership, every skill folder is listed with matching front matter,
// and the template block of AGENTS.md lists the skills a product repository gets.
// A product repository has no manifest, so there the check passes at once.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parse } from 'yaml';

export const OWNERSHIPS = ['platform', 'shared', 'product', 'template-only'];
export const BLOCK_START = '<!-- template-skills:start -->';
export const BLOCK_END = '<!-- template-skills:end -->';

/** `*` matches within one folder, `**` across folders; everything else is literal. */
export function globToRegExp(glob) {
  let out = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      out += '.*';
      i++;
    } else if (c === '*') {
      out += '[^/]*';
    } else {
      out += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${out}$`);
}

/** The ownership of a path: the first rule that matches, or undefined. */
export function ownershipOf(manifest, path) {
  for (const rule of manifest.paths ?? []) {
    if (globToRegExp(rule.path).test(path)) return rule.ownership;
  }
  return undefined;
}

export function frontMatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  return m ? (parse(m[1]) ?? {}) : {};
}

/** The skill names in the template block of AGENTS.md, from the first column of its table. */
export function blockSkills(agentsMd) {
  const start = agentsMd.indexOf(BLOCK_START);
  const end = agentsMd.indexOf(BLOCK_END);
  if (start < 0 || end < start) return undefined;
  const names = [];
  for (const line of agentsMd.slice(start, end).split(/\r?\n/)) {
    const m = /^\|\s*\[?`([a-z0-9-]+)`/.exec(line);
    if (m) names.push(m[1]);
  }
  return names;
}

/**
 * @param {object} input
 * @param {object} input.manifest  the parsed template-manifest.yaml
 * @param {string[]} input.files   every path of the repository
 * @param {Record<string, string>} input.skillFiles  folder name -> SKILL.md text (undefined when missing)
 * @param {string | undefined} input.agentsMd
 * @returns {string[]} the errors
 */
export function checkManifest({ manifest, files, skillFiles, agentsMd }) {
  const errors = [];
  if (!/^template-(website|webapp|saas)$/.test(manifest.template ?? '')) {
    errors.push(`template must be template-website, template-webapp or template-saas, not ${manifest.template}`);
  }
  for (const rule of manifest.paths ?? []) {
    if (!rule.path || !OWNERSHIPS.includes(rule.ownership)) {
      errors.push(`rule ${JSON.stringify(rule)} needs a path and one of ${OWNERSHIPS.join(', ')}`);
    }
  }
  for (const file of files) {
    if (!ownershipOf(manifest, file)) errors.push(`${file} matches no rule in template-manifest.yaml`);
  }

  const skills = manifest.skills ?? {};
  for (const name of Object.keys(skillFiles)) {
    if (!(name in skills)) errors.push(`.agents/skills/${name} is not listed under skills in template-manifest.yaml`);
  }
  for (const [name, ownership] of Object.entries(skills)) {
    if (!OWNERSHIPS.includes(ownership) || ownership === 'product') {
      errors.push(`skill ${name}: ownership must be platform, shared or template-only, not ${ownership}`);
      continue;
    }
    const text = skillFiles[name];
    if (text === undefined) {
      errors.push(`skill ${name} is listed but .agents/skills/${name}/SKILL.md does not exist`);
      continue;
    }
    const pathOwnership = ownershipOf(manifest, `.agents/skills/${name}/SKILL.md`);
    if (pathOwnership !== ownership) {
      errors.push(`skill ${name} is ${ownership} under skills but its path is ${pathOwnership}`);
    }
    const fm = frontMatter(text);
    if (fm.name !== name) errors.push(`skill ${name}: front matter name is ${fm.name}`);
    if (fm.metadata?.owner !== manifest.template) {
      errors.push(`skill ${name}: metadata.owner must be ${manifest.template}, not ${fm.metadata?.owner}`);
    }
    if (fm.metadata?.ownership !== ownership) {
      errors.push(`skill ${name}: metadata.ownership must be ${ownership}, not ${fm.metadata?.ownership}`);
    }
  }

  const listed = agentsMd === undefined ? undefined : blockSkills(agentsMd);
  if (listed === undefined) {
    errors.push(`AGENTS.md needs a template skills block between ${BLOCK_START} and ${BLOCK_END}`);
  } else {
    const expected = Object.entries(skills)
      .filter(([, o]) => o !== 'template-only')
      .map(([n]) => n)
      .sort();
    const got = [...listed].sort();
    if (expected.join(',') !== got.join(',')) {
      errors.push(`AGENTS.md template skills block lists [${got.join(', ')}], expected [${expected.join(', ')}]`);
    }
  }
  return errors;
}

function main() {
  if (!existsSync('template-manifest.yaml')) {
    console.log('check-template-manifest: no template-manifest.yaml, not a template repository; skipped');
    return;
  }
  const manifest = parse(readFileSync('template-manifest.yaml', 'utf8'));
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    encoding: 'utf8',
  })
    .split('\0')
    .filter((f) => f && existsSync(f));
  const skillsDir = '.agents/skills';
  const skillFiles = {};
  if (existsSync(skillsDir)) {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const file = `${skillsDir}/${entry.name}/SKILL.md`;
      skillFiles[entry.name] = existsSync(file) ? readFileSync(file, 'utf8') : undefined;
    }
  }
  const agentsMd = existsSync('AGENTS.md') ? readFileSync('AGENTS.md', 'utf8') : undefined;
  const errors = checkManifest({ manifest, files, skillFiles, agentsMd });
  if (errors.length) {
    for (const e of errors) console.error(`check-template-manifest: ${e}`);
    process.exit(1);
  }
  console.log(`check-template-manifest: ${files.length} files, ${Object.keys(manifest.skills ?? {}).length} skills, ok`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
