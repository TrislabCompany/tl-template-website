---
paths:
  - "scripts/**"
---

# Scripts and checks

Checked by: `pnpm test:unit` (`node --test "scripts/*.test.mjs"`) and ESLint. What each check covers is in [docs/quality-checks.md](../../docs/quality-checks.md).

- **One script, one job,** in plain Node ESM (`.mjs`), no dependencies beyond `package.json`. It starts with a comment saying what it checks, why, and who runs it ("Run by `pnpm test` …").
- **Logic is exported, the run is guarded.** Pure functions are exported for the test; the script runs only when called directly: `if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();`.
- **Every script has a test** `scripts/<name>.test.mjs` with `node:test` and `node:assert/strict`, covering the success and each problem it reports. Test names are sentences.
- **Messages are for the person who must fix it.** One line per problem on stderr, prefixed with the check's name, naming the file and the fix: `console.error("security.txt: no Contact field. Set securityTxt.contact in src/site.config.ts.")`. Report every problem, then `process.exit(1)`; success prints nothing or one summary line.
- **No secrets in output.** A script that reads a token (deploy-time ones) never prints it, not even in an error.
- Platform scripts (`write-config.mjs`, `version.mjs`, `status.mjs`, `check-template-manifest.mjs`) are replaced by every template update: change them in the template.
