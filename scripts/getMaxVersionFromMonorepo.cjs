const fs = require("fs");
const path = require("path");
const glob = require("glob");
const semver = require("semver");

const files = glob.sync("packages/*/package.json", { ignore: "**/node_modules/**" });

const versions = [];

for (const f of files) {
  try {
    const pkg = require(path.resolve(f));
    if (semver.valid(pkg.version)) versions.push(pkg.version);
  } catch {}
}

if (versions.length === 0) {
  console.error("❌ No valid package versions found.");
  process.exit(1);
}

const max = versions.sort(semver.rcompare)[0];
console.log("Found versions:", versions.join(", "));
console.log("Highest version:", max);

// For CI integration with GitHub Actions
fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${max}\n`);