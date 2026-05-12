# Company Hub

社内向けの全部入り業務アプリです。GitHub Pagesで無料公開し、重いファイルはGoogle Drive for desktopの同期フォルダで扱う構成です。

## 機能

- 社員・メンバー管理
- 勤怠、休暇申請、シフト管理
- 社内お知らせ、掲示板
- 書類・マニュアル・規程のDriveリンク管理
- タスク管理、依頼管理
- 経費申請、承認フロー
- 顧客・案件管理
- 売上、請求、入金状況の管理
- 日報・週報
- チャット、コメント
- 権限管理、管理者画面

## 開発

```powershell
npm.cmd install
npm.cmd run dev -- --port 5180
```

ローカルURL:

```txt
http://localhost:5180/company/
```

## ビルド

```powershell
npm.cmd run build
```

## Firebase

Firebase project:

```txt
company-b9fe9
```

Web app:

```txt
1:1044279774875:web:5fd86bd37baf883798403e
```

The app now uses Firebase Authentication and Firestore when those services are enabled in the Firebase Console.

Required Firebase Console settings:

- Authentication: enable Email/Password sign-in
- Authentication: optionally enable Google sign-in
- Firestore Database: create the default database

Deploy Firestore rules:

```powershell
npm.cmd run firebase:rules
```

## Google Drive

このPCではGoogle Drive for desktopの同期フォルダを使います。

```txt
G:\マイドライブ\Company App Files
```

確認:

```powershell
npm.cmd run drive-local:check
npm.cmd run drive-local:list
```
