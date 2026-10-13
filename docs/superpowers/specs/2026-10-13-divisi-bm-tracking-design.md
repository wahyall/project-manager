# Spek Desain: Tracking Bulanan Divisi BM & Koordinasi Antar-Divisi

- **Tanggal:** 2026-10-13
- **Status:** Disetujui, siap masuk rencana implementasi
- **Cakupan:** Halaman detail/tracking divisi (`/workspace/:id/divisions/:divisionId`), modul native in-app (Kas, Infaq Anggota, Data Jamaah, Kendala & Koordinasi, Laporan Bulanan), integrasi Google Spreadsheet sync, skema database baru, serta endpoint dan kontrol akses terkait.

---

## 1. Latar Belakang dan Tujuan

Pada `TODO.md` Bagian 3 (*Template Tracking Bulanan Divisi BM*) dan Bagian 5 (*Fitur Koordinasi Antar-Divisi*), divisi Baitul Maal / Barisan Muda (BM) membutuhkan sistem pelaporan dan pemantauan berkala bulanan yang mencakup:
1. Uang kas bulanan (pemasukan, pengeluaran, saldo).
2. Infaq anggota bulanan.
3. Direktori data jamaah.
4. Pencatatan kendala internal divisi dan kebutuhan bantuan antar-divisi (divisi peminta & terkait, PIC, notifikasi, tindak lanjut).
5. Riwayat laporan bulanan (snapshot).

Pengguna menginstruksikan bahwa fitur ini **tidak hanya sekadar iframe spreadsheet**, melainkan memiliki **fitur native in-app** yang kaya (dashboard, tabel, form input cepat, tombol WhatsApp jamaah), dengan **Google Spreadsheet terintegrasi sebagai backup/sinkronisasi resmi** (seperti fitur Google Sheet pada Event).

Arsitektur ini didesain fleksibel: dibuat sebagai sub-halaman detail divisi (`/workspace/:id/divisions/:divisionId`) sehingga divisi lain nantinya juga bisa menggunakan pola tracking ini, dengan Divisi BM mendapatkan template dan modul bawaan (*Kas, Infaq, Jamaah*).

### Keputusan Kunci (Hasil Brainstorming)
1. **Rute & Lokasi:** `/workspace/:id/divisions/:divisionId`. Halaman daftar divisi saat ini (`/workspace/:id/divisions`) tetap menjadi pusat navigasi seluruh divisi, dengan tombol *"Buka Tracking & Detail"* pada setiap card divisi.
2. **Pendekatan Hybrid (In-App + Google Sheet Sync):**
   - **In-App:** Input transaksi kas, checklist status infaq anggota per bulan, form tambah/edit jamaah, dan pencatatan kendala/bantuan antar-divisi dilakukan secara instan langsung di UI web.
   - **Google Spreadsheet:** Menjadi companion/mirror resmi di Google Drive. Terdapat tombol *"Sinkronkan ke Google Sheet"* yang menulis data in-app ke tab sheet terkait (`Kas Bulanan`, `Infaq Anggota`, `Data Jamaah`).
3. **Koordinasi Antar-Divisi Native:**
   - Kendala internal dan permintaan bantuan antar-divisi dicatat native di web agar dapat me-mention anggota (`@`), menunjuk PIC divisi peminta dan PIC divisi terkait, serta mengirimkan **notifikasi in-app dan WhatsApp** ke divisi yang bersangkutan.
4. **Riwayat Laporan Bulanan (Snapshot):**
   - Satu Google Spreadsheet aktif digunakan per divisi, dan sistem web menyediakan fitur *"Buat Snapshot Laporan Bulanan"* yang mengunci angka saldo kas, infaq terkumpul, jumlah jamaah, dan status kendala bulan tersebut beserta catatan evaluasi ketua divisi.
5. **Hak Akses Data Sensitif (Kas & Infaq):**
   - **Owner & Admin Workspace:** Akses penuh monitoring.
   - **Anggota Divisi BM:** Akses melihat dan mengelola kas, infaq, jamaah, dan kendala divisinya.
   - **Member Luar Divisi:** **Dilarang (403)** mengakses data kas dan infaq Divisi BM.

### Yang Sengaja Dikecualikan (YAGNI)
- Otomatisasi mutasi bank via webhook/API perbankan (cukup input kas manual + upload bukti struk).
- Multi-currency (hanya mendukung format mata uang Rupiah / IDR).
- Formula parsing kompleks client-side (perhitungan saldo kas dilakukan otomatis di database MongoDB).

---

## 2. Model Data (MongoDB)

### 2.1 Perubahan pada `server/src/models/WorkspaceDivision.js`
Menambahkan field integrasi Google Sheets dan tipe divisi:
```js
// Field tambahan pada workspaceDivisionSchema:
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

---

### 2.2 Model Baru: `server/src/models/DivisionCashTransaction.js`
Mencatat transaksi uang kas divisi (pemasukan/pengeluaran).

| Field | Tipe | Keterangan |
|---|---|---|
| `workspaceId` | ObjectId, ref `Workspace` | Wajib, di-index |
| `divisionId` | ObjectId, ref `WorkspaceDivision` | Wajib, di-index |
| `type` | String enum `['income', 'expense']` | Wajib |
| `amount` | Number | Wajib, minimal 0 |
| `category` | String | Wajib, misal: "Infaq", "Operasional", "Sosial", "Lainnya" |
| `date` | Date | Wajib, default: `Date.now` |
| `description` | String | Wajib, maks 500 karakter |
| `receiptUrl` | String | Opsional (link upload bukti/nota via Puter.js) |
| `createdBy` | ObjectId, ref `User` | Wajib |

**Indexes:**
- `{ workspaceId: 1, divisionId: 1, date: -1 }`

---

### 2.3 Model Baru: `server/src/models/DivisionInfaqRecord.js`
Mencatat setoran infaq anggota divisi per periode bulan dan tahun.

| Field | Tipe | Keterangan |
|---|---|---|
| `workspaceId` | ObjectId, ref `Workspace` | Wajib |
| `divisionId` | ObjectId, ref `WorkspaceDivision` | Wajib |
| `memberUserId` | ObjectId, ref `User` | Wajib, anggota divisi yang berinfaq |
| `month` | Number | 1 - 12 (Januari - Desember) |
| `year` | Number | Contoh: 2026 |
| `amount` | Number | Default: 0 |
| `isPaid` | Boolean | Default: false |
| `paymentDate` | Date | Default: null |
| `notes` | String | Opsional |
| `recordedBy` | ObjectId, ref `User` | Wajib |

**Indexes:**
- `{ divisionId: 1, month: 1, year: 1, memberUserId: 1 }` (Unique compound index)

---

### 2.4 Model Baru: `server/src/models/DivisionCongregant.js`
Direktori data jamaah/warga binaan divisi BM.

| Field | Tipe | Keterangan |
|---|---|---|
| `workspaceId` | ObjectId, ref `Workspace` | Wajib |
| `divisionId` | ObjectId, ref `WorkspaceDivision` | Wajib |
| `name` | String | Wajib, nama jamaah |
| `phone` | String | Opsional, nomor WhatsApp/telepon |
| `address` | String | Opsional, alamat |
| `category` | String | Enum: `mustahik`, `donatur`, `jamaah_rutin`, `lainnya` |
| `notes` | String | Catatan kondisi/kebutuhan khusus |
| `lastVisitedAt` | Date | Tanggal kunjungan/interaksi terakhir |
| `createdBy` | ObjectId, ref `User` | Wajib |

**Indexes:**
- `{ workspaceId: 1, divisionId: 1, name: 1 }`

---

### 2.5 Model Baru: `server/src/models/DivisionIssue.js`
Kendala internal divisi dan koordinasi permohonan bantuan antar-divisi.

| Field | Tipe | Keterangan |
|---|---|---|
| `workspaceId` | ObjectId, ref `Workspace` | Wajib |
| `divisionId` | ObjectId, ref `WorkspaceDivision` | Divisi asal/pembuat |
| `type` | String enum | `internal_issue` (kendala tim BM) atau `cross_division_help` (bantuan antar-divisi) |
| `targetDivisionId` | ObjectId, ref `WorkspaceDivision` | Wajib jika `type === 'cross_division_help'` |
| `title` | String | Judul kendala / kebutuhan |
| `description` | String | Penjelasan rinci (rich text / mention `@`) |
| `picId` | ObjectId, ref `User` | PIC divisi asal |
| `targetPicId` | ObjectId, ref `User` | PIC dari divisi yang dimintai bantuan |
| `status` | String enum | `open`, `in_progress`, `resolved` |
| `actionPlan` | String | Tindak lanjut dan solusi |
| `month` | Number | Periode bulan |
| `year` | Number | Periode tahun |
| `createdBy` | ObjectId, ref `User` | Wajib |

---

### 2.6 Model Baru: `server/src/models/DivisionMonthlyReport.js`
Arsip snapshot laporan bulanan divisi.

| Field | Tipe | Keterangan |
|---|---|---|
| `workspaceId` | ObjectId, ref `Workspace` | Wajib |
| `divisionId` | ObjectId, ref `WorkspaceDivision` | Wajib |
| `month` | Number | 1 - 12 |
| `year` | Number | Contoh: 2026 |
| `title` | String | Contoh: *"Laporan Bulanan BM - Oktober 2026"* |
| `summaryCash` | Object | `{ totalIncome, totalExpense, balance }` |
| `summaryInfaq` | Object | `{ totalCollected, paidMembersCount, totalMembersCount }` |
| `summaryJamaah` | Object | `{ totalCongregants }` |
| `summaryIssues` | Object | `{ openCount, inProgressCount, resolvedCount }` |
| `notes` | String | Catatan evaluasi ketua divisi |
| `isLocked` | Boolean | Default: true (setelah snapshot dibuat) |
| `createdById` | ObjectId, ref `User` | Wajib |

---

## 3. Integrasi & Sinkronisasi Google Sheets

### 3.1 Template Bawaan Google Sheet Divisi BM
Ketika endpoint pembuatan Google Spreadsheet dipanggil (`POST /api/workspaces/:id/divisions/:divisionId/google-sheet`):
1. Memanggil `googleSheetsService.createGoogleSpreadsheet(title)`.
2. Menambahkan 3 lembar sheet otomatis via Google Sheets API batchUpdate:
   - **Sheet 1 (`Kas Bulanan`):**
     - Header baris 1: `[No, Tanggal, Keterangan, Kategori, Pemasukan (Rp), Pengeluaran (Rp), Saldo, Bukti]`
   - **Sheet 2 (`Infaq Anggota`):**
     - Header baris 1: `[No, Nama Anggota, Periode Bulan, Nominal (Rp), Tanggal Setor, Status, Catatan]`
   - **Sheet 3 (`Data Jamaah`):**
     - Header baris 1: `[No, Nama Jamaah, No. WhatsApp, Alamat, Kategori, Terakhir Dikunjungi, Catatan]`
3. Menyimpan `googleSpreadsheetId` dan `googleSpreadsheetUrl` ke dokumen `WorkspaceDivision`.

### 3.2 Endpoint Sinkronisasi Data ke Google Sheet
- `POST /api/workspaces/:id/divisions/:divisionId/google-sheet/sync`
- Alur kerja:
  1. Mengambil data transaksi kas, data infaq anggota, dan data jamaah dari MongoDB.
  2. Menuliskan baris-baris data tersebut ke sheet masing-masing di Google Sheets menggunakan `spreadsheets.values.update`.
  3. Mengembalikan respons status sukses dan waktu sinkronisasi terakhir.

---

## 4. API Endpoints

Semua endpoint dilindungi oleh middleware auth (`protect`) dan workspace membership (`verifyWorkspaceMembership`).

### 4.1 Transaksi Kas
- `GET /api/workspaces/:id/divisions/:divisionId/cash` — Ambil ringkasan saldo & daftar transaksi kas (filter `month`, `year`, `search`).
- `POST /api/workspaces/:id/divisions/:divisionId/cash` — Catat transaksi pemasukan/pengeluaran baru.
- `PUT /api/workspaces/:id/divisions/:divisionId/cash/:transactionId` — Update transaksi kas.
- `DELETE /api/workspaces/:id/divisions/:divisionId/cash/:transactionId` — Hapus transaksi kas.

### 4.2 Infaq Anggota
- `GET /api/workspaces/:id/divisions/:divisionId/infaq?month=10&year=2026` — Daftar status infaq seluruh anggota divisi untuk bulan/tahun tertentu.
- `POST /api/workspaces/:id/divisions/:divisionId/infaq/toggle` — Catat/toggle status bayar infaq per anggota.

### 4.3 Data Jamaah
- `GET /api/workspaces/:id/divisions/:divisionId/congregants` — Daftar jamaah (filter kategori, pencarian nama).
- `POST /api/workspaces/:id/divisions/:divisionId/congregants` — Tambah jamaah baru.
- `PUT /api/workspaces/:id/divisions/:divisionId/congregants/:congregantId` — Update data jamaah.
- `DELETE /api/workspaces/:id/divisions/:divisionId/congregants/:congregantId` — Hapus data jamaah.

### 4.4 Kendala & Koordinasi Antar-Divisi
- `GET /api/workspaces/:id/divisions/:divisionId/issues` — Daftar kendala divisi BM & permohonan bantuan dari divisi lain.
- `POST /api/workspaces/:id/divisions/:divisionId/issues` — Buat kendala baru / permohonan bantuan divisi lain (+ kirim notifikasi).
- `PUT /api/workspaces/:id/divisions/:divisionId/issues/:issueId` — Update status / tindak lanjut.
- `DELETE /api/workspaces/:id/divisions/:divisionId/issues/:issueId` — Hapus kendala.

### 4.5 Laporan Bulanan (Snapshot)
- `GET /api/workspaces/:id/divisions/:divisionId/reports` — Daftar riwayat snapshot laporan bulanan.
- `POST /api/workspaces/:id/divisions/:divisionId/reports` — Buat snapshot laporan baru untuk bulan & tahun tertentu.
- `GET /api/workspaces/:id/divisions/:divisionId/reports/:reportId` — Detail laporan bulanan.

### 4.6 Google Spreadsheet
- `POST /api/workspaces/:id/divisions/:divisionId/google-sheet` — Buat Google Sheet baru untuk divisi.
- `POST /api/workspaces/:id/divisions/:divisionId/google-sheet/sync` — Sinkronkan data in-app ke Google Sheet.

---

## 5. Keamanan & Kontrol Akses (RBAC)

1. **Akses Data Kas & Infaq (Sensitif):**
   - Hanya pengguna dengan role `owner`, `admin`, atau anggota yang terdaftar di `division.members` yang diizinkan mengakses endpoint kas, infaq, dan laporan keuangan.
   - Anggota workspace dari divisi lain yang mencoba mengakses akan mendapatkan error `403 Forbidden` (*"Data ini bersifat privat untuk anggota divisi terkait"*).
2. **Akses Bantuan Antar-Divisi:**
   - Divisi peminta dan Divisi target keduanya dapat melihat dan memperbarui status issue koordinasi tersebut.

---

## 6. Antarmuka Pengguna (Frontend Next.js)

### 6.1 Struktur Rute & Halaman
- File baru: `client/app/workspace/[id]/divisions/[divisionId]/page.js`
- Header halaman menampilkan:
  - Tombol kembali ke daftar divisi.
  - Nama divisi, badge warna divisi, nama ketua divisi (ikon Crown 👑).
  - Jumlah total anggota.
- Tab navigasi:
  1. `Dashboard & Kas`: Stat card saldo, chart/tabel transaksi, dialog input kas.
  2. `Infaq Anggota`: Progress bar bulanan, tabel checklist anggota, quick toggle.
  3. `Data Jamaah`: Tabel direktori, tombol chat WhatsApp langsung, dialog tambah jamaah.
  4. `Kendala & Bantuan`: Kanban/list item kendala, badge status, tombol permohonan bantuan.
  5. `Laporan Bulanan`: Timeline kartu riwayat laporan bulanan + tombol *"Buat Laporan Bulan Ini"*.
  6. `Google Spreadsheet`: Container iframe Google Sheets responsif, tombol refresh, dan tombol *"Sinkronkan Data"*.

---

## 7. Socket.io Events & Notifikasi

- Event `division:cash:updated` $\rightarrow$ Real-time update tabel dan saldo kas saat transaksi baru dicatat.
- Event `division:issue:created` $\rightarrow$ Mengirim notifikasi in-app dan WhatsApp ke ketua dan anggota divisi target saat ada permintaan bantuan antar-divisi.
- Event `division:infaq:updated` $\rightarrow$ Real-time update checklist infaq anggota.

---

## 8. Verifikasi & Pengujian

1. **Uji Kas & Saldo:** Transaksi masuk dan keluar dihitung dengan benar di MongoDB; saldo tidak boleh desimal tidak wajar.
2. **Uji Infaq:** Toggle status bayar anggota berhasil menyimpan nominal dan tanggal bayar.
3. **Uji WhatsApp Jamaah:** Tombol WA membuka `wa.me/<nomor>` dengan format nomor Indonesia yang valid (`628...`).
4. **Uji Koordinasi:** Permohonan bantuan ke divisi lain berhasil mengirimkan notifikasi ke divisi tujuan.
5. **Uji Google Sheets Sync:** Data dari MongoDB berhasil di-push ke baris spreadsheet Google Sheets via API.
6. **Uji Keamanan:** Member dari divisi lain diblokir (403) saat mengakses endpoint kas BM.
