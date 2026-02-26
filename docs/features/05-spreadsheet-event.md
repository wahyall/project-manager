# 📊 Fitur 05 — Spreadsheet Event

## Ringkasan

Setiap event memiliki spreadsheet internal yang fleksibel untuk kebutuhan pencatatan dan perencanaan, dibangun menggunakan **Luckysheet** sebagai engine utama. Mendukung **multi-sheet**, berbagai **tipe kolom**, **undo/redo**, **copy-paste** dari Excel/Google Sheets, dan **row grouping**. Kolaborasi bersifat real-time (data sync) namun **tanpa cursor tracking** user lain. Formula hanya berlaku per kolom (tidak bisa referensi antar sheet). Tidak ada formatting per cell (mengikuti tipe kolom saja).

---

## Akses

### Route: `/workspace/:id/events/:eventId` → Tab Spreadsheet

### Izin

| Aksi          | Owner | Admin | Member | Guest |
| ------------- | :---: | :---: | :----: | :---: |
| Lihat sheet   |  ✅   |  ✅   |   ✅   |  ✅   |
| Edit cell     |  ✅   |  ✅   |   ✅   |  ❌   |
| Kelola kolom  |  ✅   |  ✅   |   ✅   |  ❌   |
| Kelola baris  |  ✅   |  ✅   |   ✅   |  ❌   |
| Kelola sheet  |  ✅   |  ✅   |   ✅   |  ❌   |
| Export        |  ✅   |  ✅   |   ✅   |  ✅   |
| Komentar cell |  ✅   |  ✅   |   ✅   |  ❌   |

---

## Multi-Sheet

- Setiap event memiliki **minimal 1 sheet** (dibuat otomatis saat event dibuat: "Sheet 1")
- Tab sheet ditampilkan di **bawah area spreadsheet**
- Operasi sheet:
  - **Tambah sheet**: Tombol "+" di tab area
  - **Rename sheet**: Double-klik tab nama
  - **Duplikasi sheet**: Klik kanan tab → Duplikasi (salin semua kolom, baris, dan data)
  - **Hapus sheet**: Klik kanan tab → Hapus (konfirmasi jika ada data)
  - **Reorder sheet**: Drag & drop tab

---

## Tipe Kolom

Setiap kolom memiliki satu tipe yang ditentukan saat dibuat atau diubah kemudian.

| Tipe Kolom   | Input UI                  | Validasi / Format                                        |
| ------------ | ------------------------- | -------------------------------------------------------- |
| **Teks**     | Input teks standar        | Teks bebas, tanpa batas karakter                         |
| **Angka**    | Input numerik             | Hanya angka, format opsional: desimal, mata uang (Rp)    |
| **Tanggal**  | Date picker               | Format tampilan: dd MMM yyyy                             |
| **Checkbox** | Checkbox toggle           | true / false                                             |
| **Dropdown** | Select dari opsi          | Opsi dikustomisasi per kolom (tambah/hapus/reorder opsi) |
| **User**     | Dropdown member workspace | Value: userId, tampilan: avatar + nama                   |
| **URL**      | Input teks                | Validasi format URL, tampil sebagai link klikabel        |
| **Formula**  | Otomatis (read-only cell) | Lihat section Formula di bawah                           |

### Mengubah Tipe Kolom

- Klik header kolom → "Ubah Tipe"
- Warning jika data yang ada tidak kompatibel dengan tipe baru
- Data yang tidak kompatibel akan dikonversi atau dikosongkan (dengan konfirmasi)

---

## Manajemen Kolom

| Aksi          | Cara                                                      |
| ------------- | --------------------------------------------------------- |
| Tambah kolom  | Tombol "+" di ujung kanan header                          |
| Hapus kolom   | Klik kanan header → Hapus Kolom                           |
| Rename kolom  | Double-klik header                                        |
| Reorder kolom | Drag & drop header kolom                                  |
| Resize kolom  | Drag border kanan header                                  |
| Ubah tipe     | Klik header → "Ubah Tipe Kolom"                           |
| Freeze kolom  | Klik kanan header → Freeze (kolom pertama saja di mobile) |

---

## Manajemen Baris

| Aksi         | Cara                                                                      |
| ------------ | ------------------------------------------------------------------------- |
| Tambah baris | Tombol "+" di bawah baris terakhir, atau shortcut Enter di baris terakhir |
| Hapus baris  | Klik kanan nomor baris → Hapus Baris                                      |
| Insert above | Klik kanan → Sisipkan Baris di Atas                                       |
| Insert below | Klik kanan → Sisipkan Baris di Bawah                                      |
| Select baris | Klik nomor baris (multi-select: Shift+klik)                               |
| Bulk delete  | Select beberapa baris → Delete                                            |

---

## Row Grouping

- Baris bisa dikelompokkan menjadi **collapsible group**
- Select beberapa baris → Klik kanan → "Kelompokkan Baris"
- Grup memiliki **nama** (editable) dan **indikator expand/collapse** di sisi kiri
- Grup bisa di-**nest** 1 level (grup di dalam grup)
- Collapse: sembunyikan baris dalam grup, hanya tampilkan header grup
- Expand: tampilkan semua baris

---

## Filter & Pengurutan

### Filter per Kolom

- Klik ikon filter di header kolom
- Tipe filter berbeda sesuai tipe kolom:
  - **Teks**: Contains, Equals, Starts with, Ends with, Is empty
  - **Angka**: Equals, Greater than, Less than, Between, Is empty
  - **Tanggal**: Before, After, Between, Is today, Is empty
  - **Checkbox**: Checked / Unchecked
  - **Dropdown**: Is (multi-select opsi)
  - **User**: Is (multi-select member)
  - **URL**: Contains, Is empty
- Multiple filter aktif ditampilkan sebagai **badge filter** di atas tabel

### Pengurutan

- Klik header kolom untuk toggle: Ascending → Descending → None
- Ikon sort indicator ditampilkan di header kolom aktif

---

## Formula Sederhana

### Scope

- Formula berlaku **per kolom**, bukan per cell
- **Tidak bisa** referensi kolom dari sheet lain
- Formula ditampilkan di **footer kolom** (baris khusus di bawah data)

### Formula yang Didukung

| Formula   | Deskripsi                | Input Kolom |
| --------- | ------------------------ | ----------- |
| `SUM`     | Jumlah total semua nilai | Tipe Angka  |
| `AVERAGE` | Rata-rata semua nilai    | Tipe Angka  |
| `COUNT`   | Jumlah cell yang terisi  | Semua tipe  |
| `MIN`     | Nilai terkecil           | Tipe Angka  |
| `MAX`     | Nilai terbesar           | Tipe Angka  |

### Cara Mengaktifkan

- Klik kanan header kolom → "Tambah Formula"
- Pilih formula dari dropdown
- Hasil ditampilkan di baris footer khusus (fixed di bawah)

---

## Komentar per Cell

- Klik kanan cell → "Tambah Komentar"
- Cell yang memiliki komentar ditandai dengan **titik indikator** di sudut kanan atas
- Klik indikator → buka panel komentar di sisi kanan
- Komentar berbentuk **thread** (sama seperti Comment Thread, lihat doc **15**)
- Mendukung **@mention** (memicu notifikasi)
- Thread bisa ditandai **Resolved** (disembunyikan, bisa ditampilkan kembali)

---

## Undo / Redo

- **Ctrl+Z** (undo) dan **Ctrl+Y** atau **Ctrl+Shift+Z** (redo)
- Riwayat undo/redo bersifat **per user per session**
- Aksi yang bisa di-undo:
  - Edit cell value
  - Tambah/hapus baris
  - Tambah/hapus kolom
  - Reorder kolom
- Aksi yang **tidak** bisa di-undo:
  - Hapus sheet
  - Ubah tipe kolom
- Riwayat undo/redo di-reset saat user meninggalkan halaman

---

## Copy-Paste dari/ke Excel / Google Sheets

### Paste ke Spreadsheet

- User select range di Excel / Google Sheets → Copy (Ctrl+C)
- Klik cell awal di spreadsheet event → Paste (Ctrl+V)
- Sistem mendeteksi format **tab-separated values** dari clipboard
- Data di-mapping ke kolom yang sesuai (berdasarkan posisi)
- Validasi tipe: jika data tidak cocok dengan tipe kolom, ditampilkan sebagai teks atau dikosongkan

### Copy dari Spreadsheet

- Select range cell → Ctrl+C
- Data disalin ke clipboard sebagai **tab-separated values**
- Bisa di-paste ke Excel, Google Sheets, atau text editor

---

## Kolaborasi Real-time

- Perubahan cell langsung tersinkron ke semua user yang membuka sheet yang sama
- **Tanpa cursor tracking** — tidak ada indikasi posisi user lain
- Jika dua user mengedit cell yang sama secara bersamaan: **last write wins**
- Socket.io event digunakan untuk broadcast perubahan

---

## Export Sheet

| Format            | Scope                       | Cara                  |
| ----------------- | --------------------------- | --------------------- |
| **CSV**           | Satu sheet aktif            | Menu → Export → CSV   |
| **Excel (.xlsx)** | Satu sheet atau semua sheet | Menu → Export → Excel |

- Export menyertakan semua data, termasuk baris dalam grup yang collapsed
- Filter aktif **tidak** mempengaruhi export (semua data diexport)
- Untuk file besar, proses berjalan di background dengan notifikasi saat selesai

---

## Struktur Data

### Collection: `spreadsheet_sheets`

```json
{
  "_id": "ObjectId",
  "eventId": "ObjectId",
  "name": "string",
  "order": "number",
  "columns": [
    {
      "_id": "ObjectId",
      "name": "string",
      "type": "string (text|number|date|checkbox|dropdown|user|url|formula)",
      "order": "number",
      "width": "number (px, default: 150)",
      "options": ["string (untuk dropdown)"],
      "numberFormat": "string (plain|decimal|currency, nullable)",
      "formula": "string (SUM|AVERAGE|COUNT|MIN|MAX, nullable)",
      "isFrozen": "boolean (default: false)"
    }
  ],
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Collection: `spreadsheet_rows`

```json
{
  "_id": "ObjectId",
  "sheetId": "ObjectId",
  "order": "number",
  "groupId": "ObjectId (nullable, ref: spreadsheet_row_groups)",
  "cells": {
    "<columnId>": "any (value sesuai tipe kolom)"
  },
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Collection: `spreadsheet_row_groups`

```json
{
  "_id": "ObjectId",
  "sheetId": "ObjectId",
  "name": "string",
  "parentGroupId": "ObjectId (nullable, untuk nested 1 level)",
  "isCollapsed": "boolean (default: false)",
  "order": "number",
  "createdAt": "Date"
}
```

---

## API Endpoints

| Method | Endpoint                                               | Deskripsi             |
| ------ | ------------------------------------------------------ | --------------------- |
| GET    | `/api/events/:eventId/sheets`                          | Daftar sheet          |
| POST   | `/api/events/:eventId/sheets`                          | Buat sheet            |
| PUT    | `/api/events/:eventId/sheets/:sheetId`                 | Update sheet (rename) |
| DELETE | `/api/events/:eventId/sheets/:sheetId`                 | Hapus sheet           |
| POST   | `/api/events/:eventId/sheets/:sheetId/duplicate`       | Duplikasi sheet       |
| PUT    | `/api/events/:eventId/sheets/reorder`                  | Reorder sheets        |
| GET    | `/api/events/:eventId/sheets/:sheetId/data`            | Ambil semua data      |
| POST   | `/api/events/:eventId/sheets/:sheetId/columns`         | Tambah kolom          |
| PUT    | `/api/events/:eventId/sheets/:sheetId/columns/:colId`  | Update kolom          |
| DELETE | `/api/events/:eventId/sheets/:sheetId/columns/:colId`  | Hapus kolom           |
| POST   | `/api/events/:eventId/sheets/:sheetId/rows`            | Tambah baris          |
| PUT    | `/api/events/:eventId/sheets/:sheetId/rows/:rowId`     | Update cell data      |
| DELETE | `/api/events/:eventId/sheets/:sheetId/rows/:rowId`     | Hapus baris           |
| PUT    | `/api/events/:eventId/sheets/:sheetId/rows/batch`      | Batch update (paste)  |
| POST   | `/api/events/:eventId/sheets/:sheetId/groups`          | Buat row group        |
| PUT    | `/api/events/:eventId/sheets/:sheetId/groups/:groupId` | Update group          |
| DELETE | `/api/events/:eventId/sheets/:sheetId/groups/:groupId` | Hapus group           |
| GET    | `/api/events/:eventId/sheets/:sheetId/export/csv`      | Export CSV            |
| GET    | `/api/events/:eventId/sheets/export/xlsx`              | Export semua ke Excel |

---

## Socket.io Events

| Event                    | Payload                                       |
| ------------------------ | --------------------------------------------- |
| `sheet:cell:updated`     | `{ sheetId, rowId, columnId, value, userId }` |
| `sheet:row:added`        | `{ sheetId, row }`                            |
| `sheet:row:deleted`      | `{ sheetId, rowId }`                          |
| `sheet:column:added`     | `{ sheetId, column }`                         |
| `sheet:column:updated`   | `{ sheetId, columnId, changes }`              |
| `sheet:column:deleted`   | `{ sheetId, columnId }`                       |
| `sheet:column:reordered` | `{ sheetId, columnOrders }`                   |

Room = `sheet:{sheetId}`

---

## Library

### Luckysheet

- **Repository**: https://github.com/dream-num/Luckysheet
- **Fitur built-in yang dimanfaatkan**:
  - Multi-sheet (tabs)
  - Undo/Redo
  - Copy-paste dari/ke Excel dan Google Sheets
  - Formula (SUM, AVERAGE, COUNT, MIN, MAX)
  - Freeze kolom/baris
  - Filter & sorting per kolom
  - Row grouping (alt-outline)
  - Resize kolom
  - Collaborative editing (via WebSocket plugin)
- **Integrasi**:
  - Data disimpan dan di-load dari MongoDB via API
  - Perubahan cell di-broadcast via Socket.io ke user lain
  - Custom column types (User, Dropdown) diimplementasikan sebagai custom cell render
  - Komentar per cell menggunakan sistem custom (bukan comment bawaan Luckysheet)

```bash
npm install luckysheet
```

### Catatan Integrasi

- Luckysheet di-render di dalam `<div>` container di tab Spreadsheet event
- Konfigurasi `allowEdit` diset berdasarkan role user (Guest = read-only)
- Data sheet di-serialize ke JSON lalu disimpan di MongoDB
- Import/export Excel menggunakan `luckyexcel` (companion library)

```bash
npm install luckyexcel
```
