# Google Sheets Integration: OAuth 2.0 Setup Guide

This document outlines the setup process for the Google Sheets API integration in the YN Key application, utilizing **OAuth 2.0 User Authentication** instead of standard Service Accounts.

## Why OAuth 2.0 instead of Service Accounts?

Historically, Google Cloud allowed Service Accounts to have a default 15GB Google Drive storage limit. However, due to recent policy changes designed to combat storage abuse, **newly created Service Accounts are often hardcapped at a 0.00 GB storage limit**.

Because a Service Account with a 0GB limit cannot "own" files, it is physically impossible for it to create new Google Spreadsheets (even if the file is immediately placed into a shared folder).

To solve this and maintain the architecture of creating a unique Spreadsheet for every `Kelas`, we use **OAuth 2.0**. This allows the application to act as your **personal Google Account**, utilizing your real 15GB Drive quota.

---

## Step 1: Create OAuth Credentials

1. Go to your [Google Cloud Console](https://console.cloud.google.com/).
2. Navigate to **APIs & Services** > **Credentials**.
3. Click **+ CREATE CREDENTIALS** at the top and select **OAuth client ID**.
4. _(If prompted to configure the Consent Screen first, select "External", fill in the required app name and email fields, and save)._
5. For **Application Type**, select **Web application**.
6. Under **Authorized redirect URIs**, add this exact URL:
   `https://developers.google.com/oauthplayground`
7. Click **Create**.
8. Copy the generated **Client ID** and **Client Secret**.

---

## Step 2: Configure the OAuth Consent Screen & Publish

If your app remains in "Testing" mode, Google will impose a strict 7-day expiration limit on your Refresh Tokens. To make the token valid forever, you must publish the app.

1. In the Google Cloud Console, navigate to **OAuth consent screen** (on the left menu).
2. Under "Publishing status", click the **PUBLISH APP** button.
3. You will receive a warning that your app needs verification because it uses sensitive scopes (Google Drive). **You do not need to verify it.** Just click **Push to production**.
4. Your app is now "In production" but "Unverified". Because you are the sole user, this is perfectly fine.
   _(Note: If you decide to keep it in "Testing" mode, you MUST add your email to the "Test users" list, and you will have to regenerate the Refresh Token every 7 days)._

---

## Step 3: Generate the Refresh Token

We use the official Google OAuth Playground to easily generate a long-lived Refresh Token without writing a custom OAuth callback server.

1. Go to the [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. Click the **Gear Icon** ⚙️ in the top right to open OAuth 2.0 configuration.
3. Check the box for **"Use your own OAuth credentials"**.
4. Paste your **OAuth Client ID** and **OAuth Client secret** into the respective fields and click **Close**.
5. On the left sidebar under _"Step 1: Select & authorize APIs"_, find the text box labeled _"Input your own scopes"_.
6. Paste the following scopes exactly:
   ```text
   https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive
   ```
7. Click the **Authorize APIs** button.
8. You will be redirected to Google to log in. Log in with the email you added to the "Test users" list.
   _Note: If you receive a warning stating "Google hasn't verified this app", click "Advanced" -> "Go to [Your App Name] (unsafe)"._
9. Click **Continue** to grant the required permissions.
10. You will be redirected back to the Playground. Under _"Step 2: Exchange authorization code for tokens"_, click the blue **Exchange authorization code for tokens** button.
11. Copy the generated **Refresh token** (it typically starts with `1//0...`).

---

## Step 4: Environment Variables Setup

Open your `.env` file and populate the variables you obtained from the steps above:

```env
# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REFRESH_TOKEN="1//0...your-refresh-token..."

# Optional: Place the spreadsheets inside a specific Drive Folder
GOOGLE_DRIVE_FOLDER_ID="your-folder-id"
```

---

## Step 5: Verify the Implementation

The authentication logic in `src/lib/googleSheets.ts` is configured to dynamically switch to OAuth 2.0 if the environment variables are detected:

```typescript
// src/lib/googleSheets.ts
function clients() {
  let auth;
  // Automatically use OAuth 2.0 if Refresh Token is present
  if (
    env.googleRefreshToken() &&
    env.googleClientId() &&
    env.googleClientSecret()
  ) {
    auth = new google.auth.OAuth2(
      env.googleClientId(),
      env.googleClientSecret(),
    );
    auth.setCredentials({ refresh_token: env.googleRefreshToken() });
  } else {
    // Fallback to Service Account (JWT)
    auth = new google.auth.JWT({
      email: env.googleClientEmail(),
      key: env.googlePrivateKey(),
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
      ],
    });
  }
  return {
    sheets: google.sheets({ version: "v4", auth }),
    drive: google.drive({ version: "v3", auth }),
  };
}
```

Restart your Next.js server. When a new `Kelas` is created, the system will use your personal Google account to create the Spreadsheet, completely bypassing the Service Account storage limits. You can monitor your remaining storage directly at [drive.google.com/settings/storage](https://drive.google.com/settings/storage).

---

## Managing Google Spreadsheets (Code Snippets)

If you'd like to apply this same integration in other apps, here is a cheat sheet of the most common Google Sheets operations using the Node.js `googleapis` library.

### 1. Creating a New Spreadsheet

```typescript
export async function createSpreadsheet(title: string, folderId?: string) {
  const { sheets, drive } = clients(); // See Step 5 for the clients() function

  if (folderId) {
    // Creates the file directly inside a specific Drive folder
    const file = await drive.files.create({
      requestBody: {
        name: title,
        mimeType: "application/vnd.google-apps.spreadsheet",
        parents: [folderId],
      },
      fields: "id",
    });
    return file.data.id;
  } else {
    // Creates the file in the root of the Google Drive
    const res = await sheets.spreadsheets.create({
      requestBody: { properties: { title } },
    });
    return res.data.spreadsheetId;
  }
}
```

### 2. Ensuring a Tab Exists (and Adding Headers)

```typescript
async function ensureTab(
  spreadsheetId: string,
  tabName: string,
  headers: string[],
) {
  const { sheets } = clients();

  // 1. Get the current spreadsheet info to see if the tab exists
  const ss = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = ss.data.sheets?.some((s) => s.properties?.title === tabName);

  if (!exists) {
    // 2. Create the tab if it doesn't exist
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: tabName } } }],
      },
    });

    // 3. Write the header row
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tabName}!A1`, // Start at top-left
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [headers] },
    });
  }
}
```

### 3. Appending a Single Row

```typescript
export async function appendRow(
  spreadsheetId: string,
  tabName: string,
  rowData: any[],
) {
  const { sheets } = clients();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A:Z`, // The API will automatically find the next empty row
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [rowData], // Must be an array of arrays (e.g., [["Alice", 95, "Pass"]])
    },
  });
}
```

### 4. Overwriting / Replacing All Rows

If you need to sync an entire database table to a sheet, it's often easiest to clear the existing data and write it all from scratch.

```typescript
export async function exportAllRows(
  spreadsheetId: string,
  tabName: string,
  rows: any[][],
) {
  const { sheets } = clients();

  // 1. Clear existing data (keeping the header in row 1 intact)
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${tabName}!A2:Z`,
  });

  if (!rows.length) return;

  // 2. Bulk insert the new rows starting from A2
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A2`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: rows,
    },
  });
}
```
