const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const testsDirectory = __dirname;
const runnerName = path.basename(__filename);
const testFiles = fs.readdirSync(testsDirectory)
  .filter((name) => name.endsWith("-tests.js") && name !== runnerName)
  .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));

let totalPassed = 0;
let totalTests = 0;
let failedFiles = 0;

for (const fileName of testFiles) {
  const filePath = path.join(testsDirectory, fileName);
  const child = spawnSync(process.execPath, [filePath], {
    cwd: path.dirname(testsDirectory),
    encoding: "utf8",
  });
  const output = `${child.stdout || ""}\n${child.stderr || ""}`;
  const summaries = output.split(/\r?\n/)
    .map((line) => line.match(/(?:^|\s)(\d+)\s*\/\s*(\d+)(?:\s|$)/))
    .filter(Boolean);
  const summary = summaries.at(-1);
  const passed = summary ? Number(summary[1]) : null;
  const total = summary ? Number(summary[2]) : null;
  const hasValidSummary = Number.isInteger(passed)
    && Number.isInteger(total)
    && total >= 0
    && passed >= 0
    && passed <= total;
  const succeeded = child.status === 0 && !child.error && hasValidSummary;

  if (succeeded) {
    totalPassed += passed;
    totalTests += total;
    console.log(`✓ ${fileName}: ${passed}/${total} bestanden`);
    continue;
  }

  failedFiles += 1;
  if (hasValidSummary) {
    totalPassed += passed;
    totalTests += total;
    console.error(`✗ ${fileName}: ${passed}/${total} (Fehlercode ${child.status ?? "spawn"})`);
  } else {
    console.error(`✗ ${fileName}: keine verlässliche Testzusammenfassung (Fehlercode ${child.status ?? "spawn"})`);
  }
  if (output.trim()) console.error(output.trimEnd());
}

if (failedFiles > 0) {
  console.error(`Gesamt: ${totalPassed}/${totalTests} Tests bestanden – NICHT GRÜN (${failedFiles} Datei(en) fehlgeschlagen).`);
  process.exitCode = 1;
} else {
  console.log(`Gesamt: ${totalPassed}/${totalTests} Tests bestanden – GRÜN.`);
}
