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

/**
 * Creates a specialized division Google Spreadsheet with 3 tabs:
 * 1. Kas Bulanan
 * 2. Infaq Anggota
 * 3. Data Jamaah
 */
async function createDivisionSpreadsheet(
  title,
  folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
) {
  const { sheets, drive } = getGoogleClients();

  // Create spreadsheet with 3 pre-defined sheets
  const res = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title },
      sheets: [
        { properties: { title: "Kas Bulanan", sheetId: 0 } },
        { properties: { title: "Infaq Anggota", sheetId: 1 } },
        { properties: { title: "Data Jamaah", sheetId: 2 } },
      ],
    },
  });

  const spreadsheetId = res.data.spreadsheetId;

  // Move to folder if specified
  if (folderId) {
    try {
      await drive.files.update({
        fileId: spreadsheetId,
        addParents: folderId,
        fields: "id, parents",
      });
    } catch (moveErr) {
      console.warn("Could not move sheet to specified drive folder:", moveErr.message);
    }
  }

  // Grant public write permission
  try {
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        role: "writer",
        type: "anyone",
      },
    });
  } catch (permErr) {
    console.warn("Could not set public permissions on Google Sheet:", permErr.message);
  }

  // Write headers for each sheet
  try {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: [
          {
            range: "'Kas Bulanan'!A1:F1",
            values: [["Tanggal", "Tipe", "Kategori", "Nominal (Rp)", "Keterangan", "Pencatat"]],
          },
          {
            range: "'Infaq Anggota'!A1:G1",
            values: [["Nama Anggota", "Bulan", "Tahun", "Status", "Nominal (Rp)", "Tanggal Bayar", "Catatan"]],
          },
          {
            range: "'Data Jamaah'!A1:F1",
            values: [["Nama Jamaah", "No. Telepon / WA", "Alamat", "Kategori", "Kunjungan Terakhir", "Catatan"]],
          },
        ],
      },
    });
  } catch (headerErr) {
    console.warn("Could not populate default headers on Google Sheet:", headerErr.message);
  }

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Synchronizes data from MongoDB to the Division Google Spreadsheet
 */
async function syncDivisionDataToSheet(spreadsheetId, { transactions = [], infaqRecords = [], congregants = [] }) {
  const { sheets } = getGoogleClients();

  const formatDate = (d) => {
    if (!d) return "-";
    const date = new Date(d);
    return isNaN(date.getTime()) ? "-" : date.toISOString().split("T")[0];
  };

  // 1. Data Kas
  const cashRows = transactions.map((t) => [
    formatDate(t.date),
    t.type === "income" ? "Pemasukan" : "Pengeluaran",
    t.category || "",
    t.amount || 0,
    t.description || "",
    t.createdBy?.name || "",
  ]);

  // 2. Data Infaq
  const infaqRows = infaqRecords.map((r) => [
    r.member?.name || "",
    r.month || "",
    r.year || "",
    r.isPaid ? "LUNAS" : "BELUM BAYAR",
    r.amount || 0,
    r.paymentDate ? formatDate(r.paymentDate) : "-",
    r.notes || "",
  ]);

  // 3. Data Jamaah
  const congregantRows = congregants.map((c) => [
    c.name || "",
    c.phone || "-",
    c.address || "-",
    c.category || "jamaah_rutin",
    c.lastVisitedAt ? formatDate(c.lastVisitedAt) : "-",
    c.notes || "",
  ]);

  // Clear existing rows (from row 2 downwards) then write new rows
  const updates = [];

  if (cashRows.length > 0) {
    updates.push({
      range: `'Kas Bulanan'!A2:F${cashRows.length + 1}`,
      values: cashRows,
    });
  }

  if (infaqRows.length > 0) {
    updates.push({
      range: `'Infaq Anggota'!A2:G${infaqRows.length + 1}`,
      values: infaqRows,
    });
  }

  if (congregantRows.length > 0) {
    updates.push({
      range: `'Data Jamaah'!A2:F${congregantRows.length + 1}`,
      values: congregantRows,
    });
  }

  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: updates,
      },
    });
  }

  return {
    success: true,
    syncedCounts: {
      cash: cashRows.length,
      infaq: infaqRows.length,
      congregants: congregantRows.length,
    },
  };
}

module.exports = {
  getGoogleClients,
  createGoogleSpreadsheet,
  createDivisionSpreadsheet,
  syncDivisionDataToSheet,
};
