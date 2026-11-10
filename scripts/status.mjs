// `pnpm status`: what runs where. For each Environment, the version (a tag
// vX.Y.Z, or a commit for dev) of its newest GitHub deployment, its state and
// when it was made. The deploy workflows record every deploy as a GitHub
// deployment (docs/deployment.md). Needs the GitHub CLI `gh`, signed in.

import { execFileSync } from "node:child_process";

const ENVIRONMENTS = ["dev", "staging", "production"];

function gh(path) {
  return JSON.parse(execFileSync("gh", ["api", path], { encoding: "utf8" }));
}

const repo = execFileSync("gh", ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"], {
  encoding: "utf8",
}).trim();

const rows = ENVIRONMENTS.map((environment) => {
  const [deployment] = gh(`repos/${repo}/deployments?environment=${environment}&per_page=1`);
  if (!deployment) return [environment, "-", "never deployed", ""];
  const [status] = gh(`repos/${repo}/deployments/${deployment.id}/statuses?per_page=1`);
  const ref = /^[0-9a-f]{40}$/.test(deployment.ref) ? deployment.ref.slice(0, 7) : deployment.ref;
  return [environment, ref, status?.state ?? "pending", deployment.created_at];
});

const header = ["ENVIRONMENT", "VERSION", "STATE", "DEPLOYED"];
const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
for (const row of [header, ...rows]) console.log(row.map((cell, i) => cell.padEnd(widths[i])).join("  "));
