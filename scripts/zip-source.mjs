// Creates the source archive that addons.mozilla.org reviewers need to
// rebuild the Firefox package (the shipped code is bundled by Vite).
// It archives the committed HEAD, so commit before running it.
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const dirty = execSync("git status --porcelain --untracked-files=no", { encoding: "utf-8" }).trim();
if (dirty) {
  console.error("Working tree has uncommitted changes; the archive would not match the build.");
  console.error("Commit them first, then run this again.");
  process.exit(1);
}

mkdirSync(resolve("dist"), { recursive: true });
const outZip = resolve("dist", "anki-dict-firefox-source.zip");

// web/ is a separate app that isn't part of the extension.
execSync(
  `git archive --format=zip --output="${outZip}" HEAD -- . ":(exclude)web" ":(exclude).claude"`,
  { stdio: "inherit" },
);

console.log(`Created ${outZip}`);
