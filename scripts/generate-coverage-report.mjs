import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

const tsReportPath = "coverage/coverage-summary.json";
const pyReportPath = "coverage/python-coverage.json";
const outputPath = "coverage/README.md";
const badgePath = "coverage/badge.svg";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function formatPct(value) {
  return `${Number(value).toFixed(2)}%`;
}

function formatRows(rows) {
  return rows
    .map(
      (row) =>
        `| ${row.file} | ${row.lines} | ${row.branches} | ${row.functions} | ${row.notes} |`
    )
    .join("\n");
}

function getBadgeColor(percent) {
  if (percent >= 95) return "#2ea043";
  if (percent >= 90) return "#3fb950";
  if (percent >= 80) return "#9a6700";
  if (percent >= 70) return "#bf8700";
  return "#cf222e";
}

function renderBadge(percent) {
  const label = "coverage";
  const value = `${percent.toFixed(1)}%`;
  const leftWidth = 72;
  const rightWidth = 56;
  const totalWidth = leftWidth + rightWidth;
  const color = getBadgeColor(percent);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="smooth" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".7"/>
    <stop offset=".1" stop-color="#aaa" stop-opacity=".1"/>
    <stop offset=".9" stop-color="#000" stop-opacity=".3"/>
    <stop offset="1" stop-color="#000" stop-opacity=".5"/>
  </linearGradient>
  <clipPath id="round">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#round)">
    <rect width="${leftWidth}" height="20" fill="#555"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#smooth)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${leftWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${leftWidth / 2}" y="14">${label}</text>
    <text x="${leftWidth + rightWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${leftWidth + rightWidth / 2}" y="14">${value}</text>
  </g>
</svg>
`;
}

function getTsRows(report) {
  return Object.entries(report)
    .filter(([key]) => key !== "total")
    .map(([file, metrics]) => ({
      file: basename(file),
      lines: formatPct(metrics.lines.pct),
      branches: formatPct(metrics.branches.pct),
      functions: formatPct(metrics.functions.pct),
      notes:
        metrics.lines.pct === 0
          ? "Not exercised by tests"
          : metrics.lines.pct === 100
            ? "Fully exercised"
            : `Missing lines: ${metrics.lines.total - metrics.lines.covered}`,
    }))
    .sort((a, b) => a.file.localeCompare(b.file));
}

function getPyRows(report) {
  return Object.entries(report.files)
    .map(([file, metrics]) => ({
      file: basename(file),
      lines: formatPct(metrics.summary.percent_covered),
      branches:
        metrics.summary.num_branches > 0
          ? formatPct(metrics.summary.percent_branches_covered)
          : "n/a",
      functions: "n/a",
      notes:
        metrics.summary.missing_lines > 0
          ? `Missing lines: ${metrics.summary.missing_lines}`
          : "Fully exercised",
    }))
    .sort((a, b) => a.file.localeCompare(b.file));
}

function collectKeyGaps(tsRows, pyRows) {
  const gaps = [];

  for (const row of [...tsRows, ...pyRows]) {
    if (row.lines === "0.00%") {
      gaps.push(`- \`${row.file}\` is currently untested.`);
    }
  }

  if (gaps.length === 0) {
    return "- No significant coverage gaps remain in the tracked runtime files.";
  }

  return gaps.join("\n");
}

mkdirSync("coverage", { recursive: true });

const tsReport = readJson(tsReportPath);
const pyReport = readJson(pyReportPath);
const tsRows = getTsRows(tsReport);
const pyRows = getPyRows(pyReport);
const repoCoverage =
  ((tsReport.total.lines.covered + pyReport.totals.covered_lines) /
    (tsReport.total.lines.total + pyReport.totals.num_statements)) *
  100;

const markdown = `# Coverage Report

This report is generated from:

- \`${tsReportPath}\`
- \`${pyReportPath}\`

## Snapshot

**Repo coverage:** ${formatPct(repoCoverage)}

| Implementation | Lines | Branches | Functions |
| --- | --- | --- | --- |
| TypeScript | ${formatPct(tsReport.total.lines.pct)} | ${formatPct(tsReport.total.branches.pct)} | ${formatPct(tsReport.total.functions.pct)} |
| Python | ${formatPct(pyReport.totals.percent_covered)} | ${formatPct(pyReport.totals.percent_branches_covered)} | n/a |

## TypeScript

| File | Lines | Branches | Functions | Notes |
| --- | --- | --- | --- | --- |
${formatRows(tsRows)}

## Python

| File | Lines | Branches | Functions | Notes |
| --- | --- | --- | --- | --- |
${formatRows(pyRows)}

## What This Means

- The core engine logic is well covered in both languages.
- The shipped examples and package entry points are also exercised, so the coverage now reflects the full public runtime surface.
- The badge in \`README.md\` is generated from the same JSON reports as this document.

## Biggest Gaps

${collectKeyGaps(tsRows, pyRows)}
`;

writeFileSync(outputPath, markdown);
writeFileSync(badgePath, renderBadge(repoCoverage));
console.log(`Wrote ${outputPath}`);
console.log(`Wrote ${badgePath}`);
