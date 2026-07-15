import { readFileSync } from "node:fs";
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

if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(`NLS consistency OK (${englishKeys.length} keys)`);
}
