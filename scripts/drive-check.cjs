require("dotenv").config();

const { getDrive } = require("./drive-client.cjs");

async function main() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    console.error("GOOGLE_DRIVE_FOLDER_ID is not set. Copy .env.example to .env and add a Drive folder ID.");
    process.exit(1);
  }

  const drive = getDrive();
  const res = await drive.files.get({
    fileId: folderId,
    fields: "id,name,mimeType,webViewLink",
    supportsAllDrives: true,
  });

  console.log("Drive folder access OK:");
  console.log(JSON.stringify(res.data, null, 2));
}

main().catch((error) => {
  console.error("Drive check failed:");
  console.error(error.message);
  process.exit(1);
});
