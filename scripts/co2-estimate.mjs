// The yearly CO2 estimate of the site, for internal ESG figures. It is never
// published on the site. Run it by hand once a year, after `pnpm test` has
// written page-weight-report.json:
//
//   pnpm co2 --visits 120000 --visits-source "Cloudflare traffic statistics"
//
// The Sustainable Web Design model, version 4, through CO2.js: it multiplies
// the average page weight by the yearly visits and covers the data centre,
// the network and the visitors' devices. The note is written to
// docs/co2/<year>.md.

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { co2 as Co2 } from "@tgwf/co2";

export const MODEL = "Sustainable Web Design";
export const MODEL_VERSION = 4;

const rootDir = fileURLToPath(new URL("..", import.meta.url));

export const USAGE = `Usage: pnpm co2 --visits <number> --visits-source <text> [options]

Required:
  --visits <number>          Visits in the year (a whole number, more than 0)
  --visits-source <text>     Where the visits come from, e.g. "Cloudflare traffic statistics"

Optional:
  --year <yyyy>              The year the figures are for (default: this year)
  --green                    The host is verified green hosting (default: not green)
  --report <file>            Page-weight report (default: page-weight-report.json)
  --out <file>               Note to write (default: docs/co2/<year>.md)
  --force                    Overwrite a note that exists
  --help                     Show this text`;

function positive(name, text, { integer = false } = {}) {
  const value = Number(text);
  if (text === undefined || text.trim() === "" || !Number.isFinite(value) || value <= 0 || (integer && !Number.isInteger(value))) {
    throw new Error(`${name} must be ${integer ? "a whole number" : "a number"} more than 0, got "${text}".`);
  }
  return value;
}

function nonEmpty(name, text) {
  if (!text || text.trim() === "") throw new Error(`${name} is required: say where the figure comes from.`);
  return text.trim();
}

/** Reads the command line into options. Throws an Error with a plain message when it is wrong. */
export function parseCliArgs(argv, now = new Date()) {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      strict: true,
      options: {
        visits: { type: "string" },
        "visits-source": { type: "string" },
        year: { type: "string" },
        green: { type: "boolean", default: false },
        report: { type: "string" },
        out: { type: "string" },
        force: { type: "boolean", default: false },
        help: { type: "boolean", default: false },
      },
    }));
  } catch (error) {
    throw new Error(error.message, { cause: error });
  }
  if (values.help) return { help: true };

  const year = values.year === undefined ? now.getUTCFullYear() : positive("--year", values.year, { integer: true });
  if (year < 2000 || year > 2100) throw new Error(`--year must be a year like 2026, got "${values.year}".`);

  const options = {
    visits: positive("--visits", values.visits, { integer: true }),
    visitsSource: nonEmpty("--visits-source", values["visits-source"]),
    year,
    green: values.green,
    report: values.report ?? join(rootDir, "page-weight-report.json"),
    out: values.out ?? join(rootDir, "docs", "co2", `${year}.md`),
    force: values.force,
  };

  return options;
}

/** The web part: kg CO2e per visit and per year for an average page weight. CO2.js returns grams. */
export function calculate({ averageBytes, visits, green = false }) {
  if (!Number.isFinite(averageBytes) || averageBytes <= 0) throw new Error("The average page weight must be more than 0 bytes.");
  const swd = new Co2({ model: "swd", version: MODEL_VERSION });
  const gramsPerVisit = swd.perByte(averageBytes, green);
  return { kgPerVisit: gramsPerVisit / 1000, kgPerYear: (gramsPerVisit * visits) / 1000 };
}

const kg = (value) => (value >= 1 ? value.toFixed(1) : value.toPrecision(2));
const grams = (valueKg) => `${(valueKg * 1000).toPrecision(2)} g`;
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

/** The yearly note, as Markdown. */
export function buildNote({ year, date, averageBytes, pageCount, visits, visitsSource, green, co2jsVersion, result }) {
  const lines = [
    `# CO2 estimate ${year}`,
    "",
    "For internal ESG figures. Do not publish it on the site.",
    "",
    `Written on ${date}.`,
    "",
    "## Web part",
    "",
    "| | |",
    "| --- | --- |",
    `| Average page weight | ${kb(averageBytes)} (${averageBytes} bytes, ${pageCount} pages, from page-weight-report.json) |`,
    `| Visits in ${year} | ${visits} |`,
    `| Source of the visits | ${visitsSource} |`,
    `| Model | ${MODEL}, version ${MODEL_VERSION} |`,
    `| Library | CO2.js (@tgwf/co2) ${co2jsVersion} |`,
    `| Green hosting | ${green ? "yes, set by --green" : "no (assumption)"} |`,
    `| Result per visit | ${grams(result.kgPerVisit)} CO2e |`,
    `| **Result per year** | **${kg(result.kgPerYear)} kg CO2e** |`,
    "",
    "The result is calculated from the measured page weight and the visits above. It is as good as the visit count.",
    "",
    "Assumptions:",
    "",
    "- A visit loads one page of the average weight. A visit that loads more pages causes more CO2.",
    "- Every visit loads the page without a cache. Repeat visits that use the browser cache would cause less.",
    green
      ? "- The host is counted as green hosting, so its electricity is counted as renewable."
      : "- The host is not counted as green hosting. Not counting it is the safe side; set --green only for a host verified against the Green Web Foundation list.",
    "- The model covers the data centre, the network and the visitors' devices.",
    "",
    "Only the web part is counted. Shared infrastructure is not split per site and is not in the figures above.",
    "",
  ];
  return lines.join("\n");
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  let options;
  try {
    options = parseCliArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`co2: ${error.message}\n\n${USAGE}`);
    process.exit(1);
  }
  if (options.help) {
    console.log(USAGE);
    return;
  }

  let report;
  try {
    report = JSON.parse(await readFile(options.report, "utf8"));
  } catch {
    console.error(`co2: cannot read ${options.report}. Run \`pnpm test\` (or \`pnpm build\` and \`pnpm check:built\`) first.`);
    process.exit(1);
  }

  const averageBytes = report.averageBytes;
  const result = calculate({ averageBytes, visits: options.visits, green: options.green });
  const { version: co2jsVersion } = JSON.parse(await readFile(join(rootDir, "node_modules", "@tgwf", "co2", "package.json"), "utf8"));

  if (!options.force && (await exists(options.out))) {
    console.error(`co2: ${options.out} exists. Use --force to overwrite it.`);
    process.exit(1);
  }

  const note = buildNote({
    year: options.year,
    date: new Date().toISOString().slice(0, 10),
    averageBytes,
    pageCount: report.pages?.length ?? 0,
    visits: options.visits,
    visitsSource: options.visitsSource,
    green: options.green,
    co2jsVersion,
    result,
  });
  await mkdir(dirname(options.out), { recursive: true });
  await writeFile(options.out, note);

  console.log(`co2: average page weight ${kb(averageBytes)}, ${options.visits} visits (${options.visitsSource}).`);
  console.log(`co2: ${kg(result.kgPerYear)} kg CO2e in ${options.year} (${grams(result.kgPerVisit)} per visit), ${MODEL} v${MODEL_VERSION}, CO2.js ${co2jsVersion}.`);
  console.log(`co2: note written to ${options.out}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
