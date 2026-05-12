const fs = require("fs");
const path = require("path");

function getDriveLocalPath() {
  const configured = process.env.GOOGLE_DRIVE_LOCAL_PATH;

  if (!configured) {
    throw new Error("GOOGLE_DRIVE_LOCAL_PATH is not set.");
  }

  return path.resolve(configured);
}

function ensureInsideDrive(basePath, targetPath) {
  const relative = path.relative(basePath, targetPath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Target path must stay inside GOOGLE_DRIVE_LOCAL_PATH.");
  }
}

function ensureDriveFolder() {
  const basePath = getDriveLocalPath();

  if (!fs.existsSync(basePath)) {
    throw new Error(`Drive local folder does not exist: ${basePath}`);
  }

  if (!fs.statSync(basePath).isDirectory()) {
    throw new Error(`Drive local path is not a folder: ${basePath}`);
  }

  return basePath;
}

module.exports = { ensureDriveFolder, ensureInsideDrive };
