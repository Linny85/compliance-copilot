#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, "../src/lib/i18n.ts");
const requiredNamespaces = ["checks", "aiSystems", "common", "training", "nav", "controls", "evidence"];
const requiredLanguages = ["en", "de", "sv"];

console.log("🔍 Verifying embedded i18n structure...\n");

const content = fs.readFileSync(root, "utf-8");

let hasErrors = false;

// Check for required languages
for (const lang of requiredLanguages) {
  if (!content.includes(`${lang}: {`)) {
    console.error(`❌ Missing language: ${lang}`);
    hasErrors = true;
  } else {
    console.log(`✅ Language found: ${lang}`);
  }
}

console.log();

// Check for required namespaces in all languages
for (const ns of requiredNamespaces) {
  const regex = new RegExp(`${ns}:\\s*\\{`, "g");
  const matches = content.match(regex);
  
  if (!matches || matches.length < requiredLanguages.length) {
    console.error(`❌ Missing namespace in one or more languages: ${ns}`);
    hasErrors = true;
  } else {
    console.log(`✅ Namespace complete: ${ns} (found in ${matches.length} languages)`);
  }
}

console.log();

// Check for specific critical keys that caused the blocker
const criticalKeys = [
  "checks.form.new_rule_title",
  "checks.form.hint.sandbox",
  "checks.form.fields.code",
  "checks.form.fields.help_code",
  "checks.labels.title",
  "checks.labels.code",
];

for (const key of criticalKeys) {
  const keyParts = key.split(".");
  const searchPattern = keyParts[keyParts.length - 1];
  
  if (!content.includes(`${searchPattern}:`)) {
    console.error(`❌ Missing critical key: ${key}`);
    hasErrors = true;
  } else {
    console.log(`✅ Critical key present: ${key}`);
  }
}

console.log();

if (hasErrors) {
  console.error("❌ i18n verification failed! Please ensure all required namespaces and keys are present in src/lib/i18n.ts");
  process.exit(1);
}

console.log("✅ All required i18n namespaces and critical keys present!");
console.log("✅ Embedded translations structure verified successfully!");
