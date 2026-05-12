require("dotenv").config();

const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");

const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
];

function loadOAuthClient() {
  const credentialsPath = process.env.GOOGLE_OAUTH_CREDENTIALS || "google-credentials.json";
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
  const config = credentials.installed || credentials.web;

  if (!config) {
    throw new Error("OAuth credentials must contain an installed or web client.");
  }

  const redirectUri = (config.redirect_uris || []).find((uri) => uri.includes("localhost")) || config.redirect_uris?.[0];
  return new google.auth.OAuth2(config.client_id, config.client_secret, redirectUri);
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const tokenPath = process.env.GOOGLE_OAUTH_TOKEN || "token.json";
  const oauth2Client = loadOAuthClient();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });

  console.log("Open this URL and approve Google Drive access:");
  console.log(authUrl);
  console.log("");

  const code = await ask("Paste the authorization code here: ");
  const { tokens } = await oauth2Client.getToken(code);

  fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
  console.log(`Saved Drive OAuth token to ${tokenPath}`);
}

main().catch((error) => {
  console.error("Drive auth failed:");
  console.error(error.message);
  process.exit(1);
});
