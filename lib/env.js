const fs = require("node:fs");
const path = require("node:path");

function parseEnv(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (key) env[key] = value;
  }
  return env;
}

function loadEnv(rootDir) {
  const envPath = path.join(rootDir, ".env");
  if (!fs.existsSync(envPath)) {
    throw new Error('No .env file found. Run "npm run setup" first to register this machine.');
  }
  const env = parseEnv(envPath);
  if (!env.MACHINE_ID) {
    throw new Error('MACHINE_ID not set in .env. Run "npm run setup" to register this machine.');
  }
  return env;
}

module.exports = { parseEnv, loadEnv };
