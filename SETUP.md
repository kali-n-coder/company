# Firebase and Google Drive setup

This workspace is prepared so Codex can use Firebase CLI commands and Google Drive API scripts after you finish Google authentication.

## Installed tooling

- Firebase CLI: `npm.cmd run firebase -- --version`
- Firebase client SDK: `firebase`
- Google Drive API client: `googleapis`
- Environment loader: `dotenv`

## 1. Firebase login

Run:

```powershell
npm.cmd run firebase:login
```

A browser login opens. Sign in with the Google account that owns the Firebase project.

After login, verify:

```powershell
npm.cmd run firebase:projects
```

## 2. Firebase project

Create a Firebase project in the Firebase Console, then enable:

- Authentication
- Firestore Database
- Hosting, if you want to test Firebase Hosting too

For the final free deployment plan, GitHub Pages can host the app and Firebase can provide Auth and Firestore.

## 3. App environment

Copy `.env.example` to `.env`, then fill in your Firebase web app config and Drive folder ID.

Never commit `.env` or Google credential JSON files.

## 4. Google Drive access

For light usage, the app can store Google Drive share links manually.

### Recommended fallback: Google Drive for desktop

If Google Cloud Console is hard to use, use the synced local folder instead. Codex can operate files locally, and Google Drive syncs them automatically.

This machine currently uses:

```txt
G:\マイドライブ\Company App Files
```

Set this in `.env`:

```txt
GOOGLE_DRIVE_LOCAL_PATH=G:\マイドライブ\Company App Files
```

Check local Drive access:

```powershell
npm.cmd run drive-local:check
```

List local Drive files:

```powershell
npm.cmd run drive-local:list
```

Create a synced subfolder:

```powershell
npm.cmd run drive-local:mkdir -- "Manuals"
```

### API option: Google Cloud OAuth

For Codex/API automation, use OAuth so this workspace can operate files in the Drive folder after you approve access once.

1. Open Google Cloud Console for the same project you use with Firebase.
2. Enable **Google Drive API**.
3. Create an OAuth client:
   - Application type: **Desktop app**
   - Download the JSON file.
4. Save it in this folder as `google-credentials.json`.
5. Copy `.env.example` to `.env` and set `GOOGLE_DRIVE_FOLDER_ID`.
6. Run:

```powershell
npm.cmd run drive:auth
```

Open the printed URL, approve access, paste the authorization code back into the terminal, and `token.json` will be created.

Then test Drive folder access:

```txt
GOOGLE_DRIVE_FOLDER_ID=
```

```powershell
npm.cmd run drive:check
```

List files in the folder:

```powershell
npm.cmd run drive:list
```

Create a subfolder:

```powershell
npm.cmd run drive:mkdir -- "Manuals"
```
