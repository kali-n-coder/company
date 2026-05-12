require("dotenv").config();

const { getDrive } = require("./drive-client.cjs");

async function main() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const name = process.argv.slice(2).join(" ").trim();

  if (!folderId) {
    console.error("GOOGLE_DRIVE_FOLDER_ID is not set.");
    process.exit(1);
  }

  if (!name) {
    console.error("Usage: npm.cmd run drive:mkdir -- <folder name>");
    process.exit(1);
  }

  const drive = getDrive();
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [folderId],
    },
    fields: "id,name,webViewLink",
    supportsAllDrives: true,
  });

  console.log(JSON.stringify(res.data, null, 2));
}

main().catch((error) => {
  console.error("Drive mkdir failed:");
  console.error(error.message);
  process.exit(1);
});
