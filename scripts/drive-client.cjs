const fs = require("fs");
const { google } = require("googleapis");

const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
];

function createClientFromOAuth() {
  const credentialsPath = process.env.GOOGLE_OAUTH_CREDENTIALS || "google-credentials.json";
  const tokenPath = process.env.GOOGLE_OAUTH_TOKEN || "token.json";

  if (!fs.existsSync(credentialsPath) || !fs.existsSync(tokenPath)) {
    return null;
  }

  const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
  const config = credentials.installed || credentials.web;
  const redirectUri = (config.redirect_uris || []).find((uri) => uri.includes("localhost")) || config.redirect_uris?.[0];
  const oauth2Client = new google.auth.OAuth2(config.client_id, config.client_secret, redirectUri);

  oauth2Client.setCredentials(JSON.parse(fs.readFileSync(tokenPath, "utf8")));
  return oauth2Client;
}

function createClientFromApplicationCredentials() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return null;
  }

  return new google.auth.GoogleAuth({ scopes: SCOPES });
}

function getDrive() {
  const auth = createClientFromOAuth() || createClientFromApplicationCredentials();

  if (!auth) {
    throw new Error("Drive credentials are not configured. Run npm.cmd run drive:auth after adding google-credentials.json.");
  }

  return google.drive({ version: "v3", auth });
}

module.exports = { getDrive };
