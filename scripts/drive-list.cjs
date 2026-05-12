require("dotenv").config();

const { getDrive } = require("./drive-client.cjs");

async function main() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    console.error("GOOGLE_DRIVE_FOLDER_ID is not set.");
    process.exit(1);
  }

  const drive = getDrive();
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id,name,mimeType,webViewLink,modifiedTime)",
    orderBy: "folder,name",
    pageSize: 50,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  console.log(JSON.stringify(res.data.files || [], null, 2));
}

main().catch((error) => {
  console.error("Drive list failed:");
  console.error(error.message);
  process.exit(1);
});
