require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { ensureDriveFolder, ensureInsideDrive } = require("./drive-local.cjs");

try {
  const basePath = ensureDriveFolder();
  const name = process.argv.slice(2).join(" ").trim();

  if (!name) {
    console.error("Usage: npm.cmd run drive-local:mkdir -- <folder name>");
    process.exit(1);
  }

  const targetPath = path.resolve(basePath, name);
  ensureInsideDrive(basePath, targetPath);
  fs.mkdirSync(targetPath, { recursive: true });

  console.log("Created folder:");
  console.log(targetPath);
} catch (error) {
  console.error("Drive local mkdir failed:");
  console.error(error.message);
  process.exit(1);
}
