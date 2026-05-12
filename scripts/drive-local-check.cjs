require("dotenv").config();

const { ensureDriveFolder } = require("./drive-local.cjs");

try {
  const folder = ensureDriveFolder();
  console.log("Google Drive local folder access OK:");
  console.log(folder);
} catch (error) {
  console.error("Drive local check failed:");
  console.error(error.message);
  process.exit(1);
}
