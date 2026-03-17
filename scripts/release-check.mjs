import { readFile } from "node:fs/promises";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function readText(path) {
  return readFile(path, "utf8");
}

function readTomlValue(source, key) {
  const pattern = new RegExp(`^${key}\\s*=\\s*"([^"]+)"$`, "m");
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Could not find ${key} in python/pyproject.toml`);
  }
  return match[1];
}

function normalizeTag(tag) {
  if (!tag) {
    return null;
  }
  const refName = tag.replace(/^refs\/tags\//, "");
  return refName.startsWith("v") ? refName.slice(1) : refName;
}

const tsPackage = await readJson(new URL("../typescript/package.json", import.meta.url));
const pyProject = await readText(new URL("../python/pyproject.toml", import.meta.url));

const tsName = tsPackage.name;
const tsVersion = tsPackage.version;
const pyName = readTomlValue(pyProject, "name");
const pyVersion = readTomlValue(pyProject, "version");

if (tsName !== "nopeai") {
  throw new Error(`Expected typescript/package.json name to be "nopeai", got "${tsName}"`);
}

if (pyName !== "nopeai") {
  throw new Error(`Expected python/pyproject.toml name to be "nopeai", got "${pyName}"`);
}

if (tsVersion !== pyVersion) {
  throw new Error(
    `Version mismatch: typescript/package.json has ${tsVersion}, python/pyproject.toml has ${pyVersion}`
  );
}

const tagVersion = normalizeTag(process.argv[2] ?? process.env.GITHUB_REF_NAME ?? "");
if (tagVersion && tagVersion !== tsVersion) {
  throw new Error(`Tag version ${tagVersion} does not match package version ${tsVersion}`);
}

console.log(`Release metadata OK for nopeai@${tsVersion}`);
