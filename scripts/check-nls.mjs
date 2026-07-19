import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const english = JSON.parse(readFileSync(path.join(root, "package.nls.json"), "utf8"));
const japanese = JSON.parse(readFileSync(path.join(root, "package.nls.ja.json"), "utf8"));
const errors = [];

const englishKeys = Object.keys(english).sort();
const japaneseKeys = Object.keys(japanese).sort();
if (JSON.stringify(englishKeys) !== JSON.stringify(japaneseKeys)) {
  errors.push(`NLS key sets differ: en=${englishKeys.length}, ja=${japaneseKeys.length}`);
}

function placeholders(value) {
  return [...String(value).matchAll(/\{(\d+)\}/g)].map((match) => match[1]).sort();
}

for (const key of englishKeys) {
  if (JSON.stringify(placeholders(english[key])) !== JSON.stringify(placeholders(japanese[key]))) {
    errors.push(`NLS placeholders differ for ${key}`);
  }
}

const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
function walk(value) {
  if (typeof value === "string") {
    for (const match of value.matchAll(/%([^%]+)%/g)) {
      if (!(match[1] in english)) errors.push(`package.json references missing NLS key: ${match[1]}`);
    }
  } else if (Array.isArray(value)) {
    value.forEach(walk);
  } else if (value && typeof value === "object") {
    Object.values(value).forEach(walk);
  }
}
walk(packageJson);

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(entryPath);
    return entry.name.endsWith(".ts") ? [entryPath] : [];
  });
}

const userMessagePattern = /userMessage\(\s*(['"])([^'"]+)\1([\s\S]*?)\)/g;
for (const sourcePath of sourceFiles(path.join(root, "src"))) {
  const source = readFileSync(sourcePath, "utf8");
  for (const match of source.matchAll(userMessagePattern)) {
    const key = match[2];
    const argumentsText = match[3].trim();
    if (!(key in english)) {
      errors.push(`userMessage call references missing NLS key ${key}: ${sourcePath}`);
      continue;
    }

    if (!key || !argumentsText) {
      if (key && placeholders(english[key]).length > 0) {
        errors.push(`userMessage call has no arguments for ${key}: ${sourcePath}`);
      }
      continue;
    }

    const argumentCount = argumentsText.split(",").length;
    const requiredArguments = placeholders(english[key]).reduce((max, index) => Math.max(max, Number(index) + 1), 0);
    if (argumentCount < requiredArguments) {
      errors.push(`userMessage call has too few arguments for ${key}: ${sourcePath}`);
    }
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(`NLS consistency OK (${englishKeys.length} keys)`);
}
