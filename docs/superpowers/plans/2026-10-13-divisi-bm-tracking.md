# Divisi BM Tracking & Koordinasi Antar-Divisi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun sub-halaman detail dan tracking divisi (`/workspace/:id/divisions/:divisionId`) dengan modul native in-app (Kas Bulanan, Infaq Anggota, Data Jamaah, Kendala & Koordinasi Antar-Divisi, Snapshot Laporan Bulanan) yang tersinkronisasi dengan Google Spreadsheet.

**Architecture:** Menerapkan pola hybrid: seluruh pencatatan data operasional (transaksi kas, infaq anggota, direktori jamaah, dan kendala/koordinasi) dibuat sebagai entitas MongoDB dan UI native yang responsif dan interaktif, dengan integrasi Google Sheets API v4 sebagai sarana sinkronisasi data cloud / backup resmi via iframe dan tombol sync. Hak akses kas dan infaq diisolasi di tingkat controller agar hanya dapat diakses oleh anggota divisi dan Owner/Admin.

**Tech Stack:** Node.js, Express, MongoDB/Mongoose, Next.js 14 App Router, React, Tailwind CSS, shadcn/ui, Google Sheets API (`googleapis`), Socket.io, Sonner Toast.

**Spec:** `docs/superpowers/specs/2026-10-13-divisi-bm-tracking-design.md`

---

## Global Constraints & Review Focus

- Data kas dan infaq adalah **data sensitif**: controller wajib memeriksa keanggotaan divisi (`assertCanViewDivisionItem` atau role `owner`/`admin`), dan menolak dengan status 403 bagi anggota divisi lain.
- Format mata uang selalu Rupiah (IDR). Nominal uang kas dan infaq tidak boleh bernilai negatif.
- Tombol WhatsApp Jamaah menggunakan format URL `https://wa.me/<nomorClean>` di mana `08...` dinormalisasi menjadi `628...`.
- Permohonan bantuan antar-divisi memicu notifikasi in-app dan WhatsApp ke ketua & anggota divisi target.
- Google Spreadsheet sync bekerja secara additive / overwriting sheet range agar data terbaru di web selalu tercermin di Google Sheet tanpa merusak format header.

---

### Task 1: Model Data Mongoose Baru & Update WorkspaceDivision

**Files:**
- Modify: `server/src/models/WorkspaceDivision.js`
- Create: `server/src/models/DivisionCashTransaction.js`
- Create: `server/src/models/DivisionInfaqRecord.js`
- Create: `server/src/models/DivisionCongregant.js`
- Create: `server/src/models/DivisionIssue.js`
- Create: `server/src/models/DivisionMonthlyReport.js`

- [ ] **Step 1: Update `WorkspaceDivision.js` dengan field Google Spreadsheet & divisionType**

Tambahkan field `googleSpreadsheetId`, `googleSpreadsheetUrl`, dan `divisionType` ke schema:
```js
// Tambahkan di dalam schema WorkspaceDivision.js:
    googleSpreadsheetId: {
      type: String,
      default: null,
    },
    googleSpreadsheetUrl: {
      type: String,
      default: null,
    },
    divisionType: {
      type: String,
      enum: ["general", "bm", "event"],
      default: "general",
    },
```

- [ ] **Step 2: Buat model `DivisionCashTransaction.js`**

```js
// server/src/models/DivisionCashTransaction.js
const mongoose = require("mongoose");

const divisionCashTransactionSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    divisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkspaceDivision",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: [true, "Tipe transaksi harus diisi (income/expense)"],
    },
    amount: {
      type: Number,
      required: [true, "Nominal transaksi harus diisi"],
      min: [0, "Nominal tidak boleh negatif"],
    },
    category: {
      type: String,
      required: [true, "Kategori transaksi harus diisi"],
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    description: {
      type: String,
      required: [true, "Keterangan transaksi harus diisi"],
      trim: true,
      maxlength: [500, "Keterangan maksimal 500 karakter"],
    },
    receiptUrl: {
      type: String,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

divisionCashTransactionSchema.index({ divisionId: 1, date: -1 });

module.exports = mongoose.model(
  "DivisionCashTransaction",
  divisionCashTransactionSchema
);
```

- [ ] **Step 3: Buat model `DivisionInfaqRecord.js`**

```js
// server/src/models/DivisionInfaqRecord.js
const mongoose = require("mongoose");

const divisionInfaqRecordSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    divisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkspaceDivision",
      required: true,
    },
    memberUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

divisionInfaqRecordSchema.index(
  { divisionId: 1, month: 1, year: 1, memberUserId: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "DivisionInfaqRecord",
  divisionInfaqRecordSchema
);
```

- [ ] **Step 4: Buat model `DivisionCongregant.js`**

```js
// server/src/models/DivisionCongregant.js
const mongoose = require("mongoose");

const divisionCongregantSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    divisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkspaceDivision",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Nama jamaah harus diisi"],
      trim: true,
      maxlength: [120, "Nama maksimal 120 karakter"],
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    address: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      enum: ["mustahik", "donatur", "jamaah_rutin", "lainnya"],
      default: "jamaah_rutin",
    },
    notes: {
      type: String,
      default: "",
    },
    lastVisitedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

divisionCongregantSchema.index({ workspaceId: 1, divisionId: 1, name: 1 });

module.exports = mongoose.model("DivisionCongregant", divisionCongregantSchema);
```

- [ ] **Step 5: Buat model `DivisionIssue.js`**

```js
// server/src/models/DivisionIssue.js
const mongoose = require("mongoose");

const divisionIssueSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    divisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkspaceDivision",
      required: true,
    },
    type: {
      type: String,
      enum: ["internal_issue", "cross_division_help"],
      default: "internal_issue",
    },
    targetDivisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkspaceDivision",
      default: null,
    },
    title: {
      type: String,
      required: [true, "Judul kendala harus diisi"],
      trim: true,
      maxlength: [200, "Judul maksimal 200 karakter"],
    },
    description: {
      type: String,
      default: "",
    },
    picId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    targetPicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved"],
      default: "open",
    },
    actionPlan: {
      type: String,
      default: "",
    },
    month: {
      type: Number,
      default: () => new Date().getMonth() + 1,
    },
    year: {
      type: Number,
      default: () => new Date().getFullYear(),
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

divisionIssueSchema.index({ workspaceId: 1, divisionId: 1, status: 1 });
divisionIssueSchema.index({ workspaceId: 1, targetDivisionId: 1 });

module.exports = mongoose.model("DivisionIssue", divisionIssueSchema);
```

- [ ] **Step 6: Buat model `DivisionMonthlyReport.js`**

```js
// server/src/models/DivisionMonthlyReport.js
const mongoose = require("mongoose");

const divisionMonthlyReportSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    divisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkspaceDivision",
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    summaryCash: {
      totalIncome: { type: Number, default: 0 },
      totalExpense: { type: Number, default: 0 },
      balance: { type: Number, default: 0 },
    },
    summaryInfaq: {
      totalCollected: { type: Number, default: 0 },
      paidMembersCount: { type: Number, default: 0 },
      totalMembersCount: { type: Number, default: 0 },
    },
    summaryJamaah: {
      totalCongregants: { type: Number, default: 0 },
    },
    summaryIssues: {
      openCount: { type: Number, default: 0 },
      inProgressCount: { type: Number, default: 0 },
      resolvedCount: { type: Number, default: 0 },
    },
    notes: {
      type: String,
      default: "",
    },
    isLocked: {
      type: Boolean,
      default: true,
    },
    createdById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

divisionMonthlyReportSchema.index(
  { divisionId: 1, month: 1, year: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "DivisionMonthlyReport",
  divisionMonthlyReportSchema
);
```

- [ ] **Step 7: Verifikasi sintaks Node.js untuk seluruh model**

Jalankan perintah pemeriksaan sintaks:
`node -c server/src/models/DivisionCashTransaction.js server/src/models/DivisionInfaqRecord.js server/src/models/DivisionCongregant.js server/src/models/DivisionIssue.js server/src/models/DivisionMonthlyReport.js`
Ekspektasi: exit code 0.

- [ ] **Step 8: Commit**
`git add server/src/models/`
`git commit -m "feat(server): add Mongoose models for division tracking"`

---

### Task 2: Backend Kas Bulanan (Controller & Routes)

**Files:**
- Create: `server/src/controllers/divisionCash.controller.js`
- Create: `server/src/routes/divisionCash.routes.js`
- Modify: `server/src/app.js`

- [ ] **Step 1: Buat `divisionCash.controller.js`**

Implementasikan:
- `getCashSummaryAndList`: Menghitung total saldo kumulatif, total income bulan terpilih, total expense bulan terpilih, dan pagination/filter transaksi. Memastikan user memiliki izin akses divisi.
- `createTransaction`: Membuat transaksi baru, validasi nominal, mencatat ActivityLog.
- `updateTransaction`: Mengubah transaksi kas.
- `deleteTransaction`: Menghapus transaksi kas.

- [ ] **Step 2: Buat `divisionCash.routes.js`**
Definisikan rute:
- `GET /` $\rightarrow$ `getCashSummaryAndList`
- `POST /` $\rightarrow$ `createTransaction`
- `PUT /:transactionId` $\rightarrow$ `updateTransaction`
- `DELETE /:transactionId` $\rightarrow$ `deleteTransaction`

- [ ] **Step 3: Hubungkan di `server/src/app.js`**
Mount rute:
`app.use("/api/workspaces/:id/divisions/:divisionId/cash", divisionCashRoutes);`

- [ ] **Step 4: Verifikasi & Commit**
`node -c server/src/controllers/divisionCash.controller.js server/src/routes/divisionCash.routes.js`
`git commit -m "feat(server): add division cash transaction API endpoints"`

---

### Task 3: Backend Infaq Anggota & Data Jamaah

**Files:**
- Create: `server/src/controllers/divisionInfaq.controller.js`
- Create: `server/src/routes/divisionInfaq.routes.js`
- Create: `server/src/controllers/divisionCongregant.controller.js`
- Create: `server/src/routes/divisionCongregant.routes.js`
- Modify: `server/src/app.js`

- [ ] **Step 1: Buat controller & routes untuk Infaq Anggota**
- `getInfaqRecords`: Mengambil daftar seluruh anggota divisi untuk bulan & tahun yang diminta, digabungkan dengan record pembayaran infaq (jika belum ada, kembalikan status `isPaid: false`).
- `recordInfaq`: Menyimpan atau meng-update status infaq anggota (`isPaid`, `amount`, `paymentDate`, `notes`).
- Mount di `server/src/app.js`: `/api/workspaces/:id/divisions/:divisionId/infaq`.

- [ ] **Step 2: Buat controller & routes untuk Data Jamaah**
- `listCongregants`: Menampilkan daftar jamaah dengan filter pencarian nama & kategori.
- `createCongregant`, `updateCongregant`, `deleteCongregant`.
- Mount di `server/src/app.js`: `/api/workspaces/:id/divisions/:divisionId/congregants`.

- [ ] **Step 3: Verifikasi & Commit**
`node -c server/src/controllers/divisionInfaq.controller.js server/src/controllers/divisionCongregant.controller.js`
`git commit -m "feat(server): add infaq and congregant tracking API endpoints"`

---

### Task 4: Backend Kendala, Bantuan Antar-Divisi, & Laporan Bulanan

**Files:**
- Create: `server/src/controllers/divisionIssue.controller.js`
- Create: `server/src/routes/divisionIssue.routes.js`
- Create: `server/src/controllers/divisionMonthlyReport.controller.js`
- Create: `server/src/routes/divisionMonthlyReport.routes.js`
- Modify: `server/src/app.js`

- [ ] **Step 1: Buat controller & routes Kendala Antar-Divisi**
- `createIssue`: Saat `type === 'cross_division_help'`, kirimkan notifikasi ke anggota divisi tujuan menggunakan `NotificationService` dan WebSocket.
- `listIssues`: Ambil kendala divisi sendiri + kendala yang meminta bantuan ke divisi ini.
- `updateIssue`: Update status (`open`/`in_progress`/`resolved`) dan `actionPlan`.

- [ ] **Step 2: Buat controller & routes Laporan Bulanan (Snapshot)**
- `createMonthlyReport`: Melakukan agregasi otomatis saldo kas per tanggal akhir bulan, total infaq, jumlah jamaah, dan jumlah kendala, lalu menyimpan dokumen snapshot yang terkunci.
- `listMonthlyReports`: Menampilkan daftar snapshot bulanan.

- [ ] **Step 3: Mount di `server/src/app.js` & Commit**
`git commit -m "feat(server): add division issues coordination and monthly reports API"`

---

### Task 5: Backend Google Spreadsheet Creation & Sync

**Files:**
- Modify: `server/src/services/googleSheets.service.js`
- Modify: `server/src/controllers/workspaceDivision.controller.js`
- Modify: `server/src/routes/workspaceDivision.routes.js`

- [ ] **Step 1: Tambahkan method `createDivisionSpreadsheet` di `googleSheets.service.js`**
Membuat spreadsheet dengan 3 sheet bertab nama: `Kas Bulanan`, `Infaq Anggota`, `Data Jamaah` lengkap dengan header kolomnya.

- [ ] **Step 2: Tambahkan method `syncDivisionDataToSheet` di `googleSheets.service.js`**
Mengambil data MongoDB (`DivisionCashTransaction`, `DivisionInfaqRecord`, `DivisionCongregant`) lalu menuliskan data baris ke masing-masing sheet.

- [ ] **Step 3: Daftarkan endpoints di `workspaceDivision.routes.js`**
- `POST /api/workspaces/:id/divisions/:divisionId/google-sheet`
- `POST /api/workspaces/:id/divisions/:divisionId/google-sheet/sync`

- [ ] **Step 4: Verifikasi & Commit**
`node -c server/src/services/googleSheets.service.js server/src/controllers/workspaceDivision.controller.js`
`git commit -m "feat(server): add Google Sheets division creation and data synchronization"`

---

### Task 6: Frontend Hooks & API Integration

**Files:**
- Create: `client/hooks/use-division-cash.js`
- Create: `client/hooks/use-division-infaq.js`
- Create: `client/hooks/use-division-congregants.js`
- Create: `client/hooks/use-division-issues.js`
- Create: `client/hooks/use-division-reports.js`

- [ ] **Step 1: Buat hook `use-division-cash.js`**
Mengelola state saldo, filter bulan/tahun, daftar transaksi, dan fungsi catat/edit/hapus transaksi kas.

- [ ] **Step 2: Buat hook `use-division-infaq.js`**
Mengelola data infaq per bulan/tahun, hitungan persentase lunas, dan fungsi toggle status pembayaran anggota.

- [ ] **Step 3: Buat hook `use-division-congregants.js`**
Mengelola data jamaah, pencarian, dan mutasi data jamaah.

- [ ] **Step 4: Buat hook `use-division-issues.js` & `use-division-reports.js`**
Mengelola status kendala dan pembuatan snapshot laporan bulanan.

- [ ] **Step 5: Commit**
`git add client/hooks/`
`git commit -m "feat(client): add data management hooks for division tracking"`

---

### Task 7: Frontend Komponen Native In-App Tabs

**Files:**
- Create: `client/components/divisions/tracking/division-cash-tab.js`
- Create: `client/components/divisions/tracking/division-infaq-tab.js`
- Create: `client/components/divisions/tracking/division-congregants-tab.js`
- Create: `client/components/divisions/tracking/division-issues-tab.js`
- Create: `client/components/divisions/tracking/division-reports-tab.js`
- Create: `client/components/divisions/tracking/division-spreadsheet-tab.js`

- [ ] **Step 1: Buat `division-cash-tab.js`**
Menampilkan StatCard Saldo, Pemasukan, Pengeluaran, modal input `Catat Kas`, dan tabel transaksi dengan format Rupiah.

- [ ] **Step 2: Buat `division-infaq-tab.js`**
Menampilkan progress bar infaq bulan ini, pemilih bulan/tahun, tabel anggota dengan badge Lunas/Belum, dan tombol aksi bayar infaq.

- [ ] **Step 3: Buat `division-congregants-tab.js`**
Menampilkan tabel data jamaah, modal tambah jamaah, dan tombol **Chat WhatsApp** (`https://wa.me/...`).

- [ ] **Step 4: Buat `division-issues-tab.js`**
Menampilkan daftar kendala internal & koordinasi bantuan antar-divisi, dialog tambah kendala, penugasan PIC, dan update status.

- [ ] **Step 5: Buat `division-reports-tab.js`**
Menampilkan kartu riwayat laporan bulanan, rincian agregasi, dan tombol pembuatan laporan baru.

- [ ] **Step 6: Buat `division-spreadsheet-tab.js`**
Menampilkan iframe Google Spreadsheet responsif, tombol refresh, dan tombol aksi *"Sinkronkan Data ke Google Sheet"*.

- [ ] **Step 7: Commit**
`git add client/components/divisions/tracking/`
`git commit -m "feat(client): implement native in-app tabs for division tracking"`

---

### Task 8: Halaman Utama Detail Divisi & Navigasi

**Files:**
- Create: `client/app/workspace/[id]/divisions/[divisionId]/page.js`
- Modify: `client/components/divisions/division-manager.js`

- [ ] **Step 1: Buat rute halaman `client/app/workspace/[id]/divisions/[divisionId]/page.js`**
Menampilkan header detail divisi (nama, warna, ketua dengan ikon Crown, jumlah anggota), tab navigasi interaktif (*Dashboard & Kas*, *Infaq Anggota*, *Data Jamaah*, *Kendala & Koordinasi*, *Laporan Bulanan*, *Google Spreadsheet*), dan memuat tab terkait.

- [ ] **Step 2: Tambahkan tombol "Tracking & Detail" di `division-manager.js`**
Pada header setiap kartu divisi di halaman daftar divisi (`/workspace/[id]/divisions`), tambahkan tombol navigasi ke `/workspace/${workspaceId}/divisions/${div._id}`.

- [ ] **Step 3: Commit**
`git add client/`
`git commit -m "feat(client): add division tracking page and entry points"`

---

### Task 9: Verifikasi, Testing, & Update TODO.md

**Files:**
- Modify: `TODO.md`

- [ ] **Step 1: Lakukan verifikasi fungsionalitas end-to-end**
Pastikan:
1. Server berjalan tanpa error.
2. Form transaksi kas menghitung saldo dengan benar.
3. Checklist infaq anggota bekerja per bulan dan tahun.
4. Tombol WhatsApp jamaah menghasilkan link yang tepat.
5. Permohonan bantuan antar-divisi mencatat PIC dan status.
6. Tombol sinkronisasi Google Sheet berhasil mengirim data.
7. Hak akses kas terlindungi dari user divisi lain.

- [ ] **Step 2: Centang fitur yang selesai di `TODO.md`**
Perbarui `TODO.md` Bagian 3:
- `[x] Update uang kas bulanan.`
- `[x] Update infaq anggota.`
- `[x] Update data jamaah.`
- `[x] Mencatat kendala internal divisi BM.`
- `[x] Mencatat kebutuhan bantuan dari divisi lain.`
- `[x] Mencatat tindak lanjut dan penanggung jawab kendala.`
- `[x] Menyediakan riwayat laporan bulanan.`

- [ ] **Step 3: Commit akhir**
`git add TODO.md`
`git commit -m "docs: check off completed division BM tracking features in TODO.md"`
