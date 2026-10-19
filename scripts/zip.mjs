import { execSync } from "node:child_process";
import { existsSync, renameSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import webExt from "web-ext";

const browser = process.argv[2];
if (!browser) {
  console.error("Usage: node scripts/zip.mjs <browser>");
  process.exit(1);
}

const distDir = resolve("dist", browser);
const outName = `anki-dict-${browser}.zip`;
const outZip = resolve("dist", outName);

if (!existsSync(distDir)) {
  console.error(`dist/${browser} does not exist. Run build first.`);
  process.exit(1);
}

// AMO reviewers rebuild from the LF sources in git; a file an editor saved
// with CRLF would make this package differ from their build.
const crlfFiles = execSync("git ls-files --eol", { encoding: "utf-8" })
  .split("\n")
  .filter((line) => /\bw\/(crlf|mixed)\b/.test(line))
  .map((line) => line.split("\t").pop())
  .filter((file) => !file.startsWith("web/"));
if (crlfFiles.length > 0) {
  console.error("These files have CRLF line endings; convert them to LF and rebuild:");
  crlfFiles.forEach((file) => console.error(`  ${file}`));
  process.exit(1);
}

// web-ext writes standard zips with forward-slash paths on every OS.
// (PowerShell's Compress-Archive uses backslashes, which AMO rejects.)
const tmpDir = resolve("dist", `.zip-${browser}`);
rmSync(tmpDir, { recursive: true, force: true });

await webExt.cmd.build(
  { sourceDir: distDir, artifactsDir: tmpDir, filename: outName, overwriteDest: true },
  { shouldExitProgram: false },
);

rmSync(outZip, { force: true });
renameSync(resolve(tmpDir, outName), outZip);
rmSync(tmpDir, { recursive: true, force: true });

console.log(`Created ${outZip}`);
