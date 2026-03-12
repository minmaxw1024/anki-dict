import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";

const browser = process.argv[2];
if (!browser) {
  console.error("Usage: node scripts/zip.mjs <browser>");
  process.exit(1);
}

const distDir = resolve("dist", browser);
const outZip = resolve("dist", `anki-dict-${browser}.zip`);

if (!existsSync(distDir)) {
  console.error(`dist/${browser} does not exist. Run build first.`);
  process.exit(1);
}

// Use PowerShell Compress-Archive on Windows, zip on Unix
const isWindows = process.platform === "win32";

if (isWindows) {
  // Remove existing zip to avoid Compress-Archive error
  execSync(
    `powershell -NoProfile -Command "if (Test-Path '${outZip}') { Remove-Item '${outZip}' }; Compress-Archive -Path '${distDir}\\*' -DestinationPath '${outZip}'"`,
    { stdio: "inherit" }
  );
} else {
  execSync(`cd "${distDir}" && zip -r "../anki-dict-${browser}.zip" .`, {
    stdio: "inherit",
  });
}

console.log(`Created ${outZip}`);
