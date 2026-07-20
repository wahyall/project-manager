const { google } = require("googleapis");

/**
 * Get Google API client with OAuth 2.0 (preferred) or JWT fallback.
 */
function getGoogleClients() {
  let auth;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
    ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined;

  if (refreshToken && clientId && clientSecret) {
    auth = new google.auth.OAuth2(clientId, clientSecret);
    auth.setCredentials({ refresh_token: refreshToken });
  } else if (clientEmail && privateKey) {
    auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
      ],
    });
  } else {
    throw new Error(
      "Google OAuth 2.0 / Service Account credentials not configured in environment variables."
    );
  }

  return {
    sheets: google.sheets({ version: "v4", auth }),
    drive: google.drive({ version: "v3", auth }),
  };
}

/**
 * Creates a new Google Spreadsheet file on Google Drive
 * @param {string} title Spreadsheet title
 * @param {string} [folderId] Optional Drive folder ID
 * @returns {Promise<{ spreadsheetId: string, spreadsheetUrl: string }>}
 */
async function createGoogleSpreadsheet(
  title,
  folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
) {
  const { sheets, drive } = getGoogleClients();

  let spreadsheetId;
  if (folderId) {
    const file = await drive.files.create({
      requestBody: {
        name: title,
        mimeType: "application/vnd.google-apps.spreadsheet",
        parents: [folderId],
      },
      fields: "id",
    });
    spreadsheetId = file.data.id;
  } else {
    const res = await sheets.spreadsheets.create({
      requestBody: { properties: { title } },
    });
    spreadsheetId = res.data.spreadsheetId;
  }

  // Grant public edit permission so the sheet can be embedded & edited in an iframe
  try {
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        role: "writer",
        type: "anyone",
      },
    });
  } catch (permErr) {
    console.warn(
      "Could not set public permissions on Google Sheet:",
      permErr.message
    );
  }

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  return { spreadsheetId, spreadsheetUrl };
}

module.exports = {
  getGoogleClients,
  createGoogleSpreadsheet,
};
