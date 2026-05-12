require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { ensureDriveFolder } = require("./drive-local.cjs");

try {
  const folder = ensureDriveFolder();
  const rows = fs.readdirSync(folder, { withFileTypes: true }).map((entry) => {
    const fullPath = path.join(folder, entry.name);
    const stat = fs.statSync(fullPath);

    return {
      name: entry.name,
      type: entry.isDirectory() ? "folder" : "file",
      modifiedAt: stat.mtime.toISOString(),
      size: entry.isDirectory() ? null : stat.size,
    };
  });

  console.log(JSON.stringify(rows, null, 2));
} catch (error) {
  console.error("Drive local list failed:");
  console.error(error.message);
  process.exit(1);
}
