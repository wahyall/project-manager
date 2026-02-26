# 📤 Fitur 19 — Export Data

## Ringkasan

Fitur export data dari berbagai modul ke format **CSV**, **Excel (.xlsx)**, **PDF**, dan **PNG**. Untuk file berukuran besar, proses dijalankan di **background** dan user mendapat notifikasi saat file siap.

---

## Export Task

### Daftar Task ke CSV / Excel

- **Dari**: Kanban Board → Menu → Export
- **Data**: Seluruh task yang sesuai filter aktif
- **Kolom di file export**:

| Kolom      | Keterangan                |
| ---------- | ------------------------- |
| Judul      | Judul task                |
| Status     | Nama kolom kanban         |
| Assignee   | Nama-nama assignee (koma) |
| Prioritas  | Low/Medium/High/Critical  |
| Due Date   | Format: yyyy-MM-dd        |
| Start Date | Format: yyyy-MM-dd        |
| Event      | Nama event (jika ada)     |
| Label      | Nama label (koma)         |
| Subtask    | "3/5 selesai"             |
| Dibuat     | Tanggal dibuat            |

### Snapshot Kanban ke PDF

- **Dari**: Kanban Board → Menu → Export PDF
- Render tampilan kanban saat ini (termasuk filter) ke PDF
- Layout: landscape, setiap kolom kanban sebagai kolom di PDF
- Kartu task ditampilkan ringkas (judul, assignee, prioritas)

### Task per Event ke CSV / Excel

- **Dari**: Detail Event → Tab Task Terkait → Export
- **Data**: Hanya task yang terhubung ke event tersebut
- **Format**: Sama seperti export daftar task

---

## Export Spreadsheet Event

### Satu Sheet ke CSV

- **Dari**: Spreadsheet → Menu → Export CSV
- Export sheet yang sedang aktif
- Data di-export apa adanya (semua baris, termasuk grup yang collapsed)
- Filter aktif **tidak** mempengaruhi export

### Satu Sheet / Semua Sheet ke Excel

- **Dari**: Spreadsheet → Menu → Export Excel
- Pilihan: "Sheet ini saja" atau "Semua sheet"
- Jika semua sheet: setiap sheet menjadi tab terpisah di file Excel
- Formula (SUM, AVERAGE, dll) di-export sebagai **nilai statis** (bukan formula Excel)

### Detail Event + Task ke PDF

- **Dari**: Detail Event → Menu → Export PDF
- Konten:
  - Informasi event (judul, tanggal, status, peserta)
  - Daftar task terkait (tabel)
  - Tidak termasuk spreadsheet (terpisah)

---

## Export Brainstorming

### Canvas ke PNG

- **Dari**: Brainstorming Board → Toolbar → Export → PNG
- Render seluruh canvas (semua widget yang ada) ke gambar PNG
- **Resolusi tinggi**: 2x scale (retina quality)
- Background: warna canvas (putih atau tema yang aktif)

### Canvas ke PDF

- **Dari**: Brainstorming Board → Toolbar → Export → PDF
- Render canvas ke PDF single page (atau multi-page jika sangat besar)
- Layout: fit to page

### Mind Map ke PNG

- **Dari**: Widget Mind Map → Menu → Export PNG
- Export hanya area widget mind map tertentu (bukan seluruh canvas)
- Resolusi tinggi (2x)

---

## Mekanisme Export

### Export Kecil (Instant)

- File CSV atau tabel task kecil (<100 baris)
- Proses langsung di request handler
- File langsung didownload oleh browser (Content-Disposition: attachment)

### Export Besar (Background)

- File Excel multi-sheet, PDF kanban besar, atau PNG canvas besar
- Threshold: diestimasi berdasarkan jumlah data
- Alur:
  1. User klik Export
  2. Tampilkan toast: "Export sedang diproses..."
  3. Backend membuat job di queue
  4. Worker memproses export dan simpan file ke **Puter.js**
  5. Setelah selesai, buat **notifikasi in-app** ke user:
     - "File export '[nama]' sudah siap. [Unduh]"
  6. User klik notifikasi → download file
- File export disimpan selama **7 hari** sebelum dihapus otomatis

---

## Struktur Data

### Collection: `export_jobs`

```json
{
  "_id": "ObjectId",
  "workspaceId": "ObjectId",
  "requestedBy": "ObjectId",
  "type": "string (task_csv|task_xlsx|task_pdf|spreadsheet_csv|spreadsheet_xlsx|event_pdf|canvas_png|canvas_pdf|mindmap_png)",
  "status": "string (pending|processing|completed|failed)",
  "params": {
    "filters": "object (filter yang aktif saat export)",
    "targetId": "ObjectId (eventId, boardId, dll)",
    "sheetId": "ObjectId (nullable)",
    "scope": "string (single|all, untuk multi-sheet)"
  },
  "fileUrl": "string (Puter.js URL, diisi setelah selesai)",
  "fileName": "string",
  "fileSize": "number (bytes)",
  "error": "string (nullable, jika failed)",
  "createdAt": "Date",
  "completedAt": "Date (nullable)",
  "expiresAt": "Date (7 hari setelah created)"
}
```

---

## API Endpoints

| Method | Endpoint                                            | Deskripsi                   |
| ------ | --------------------------------------------------- | --------------------------- |
| POST   | `/api/workspaces/:id/export/tasks/csv`              | Export task ke CSV          |
| POST   | `/api/workspaces/:id/export/tasks/xlsx`             | Export task ke Excel        |
| POST   | `/api/workspaces/:id/export/tasks/pdf`              | Export kanban ke PDF        |
| POST   | `/api/events/:eventId/export/pdf`                   | Export detail event ke PDF  |
| POST   | `/api/events/:eventId/sheets/:sheetId/export/csv`   | Export sheet ke CSV         |
| POST   | `/api/events/:eventId/sheets/export/xlsx`           | Export semua sheet ke Excel |
| POST   | `/api/boards/:boardId/export/png`                   | Export canvas ke PNG        |
| POST   | `/api/boards/:boardId/export/pdf`                   | Export canvas ke PDF        |
| POST   | `/api/boards/:boardId/widgets/:widgetId/export/png` | Export widget ke PNG        |
| GET    | `/api/export-jobs/:jobId`                           | Cek status export job       |
| GET    | `/api/export-jobs/:jobId/download`                  | Download file export        |

---

## Library Rekomendasi

| Format | Library                                               |
| ------ | ----------------------------------------------------- |
| CSV    | `csv-stringify` atau `fast-csv`                       |
| Excel  | `exceljs` atau `xlsx`                                 |
| PDF    | `puppeteer` (render HTML to PDF) atau `pdfkit`        |
| PNG    | `html-to-image` (frontend) atau `puppeteer` (backend) |
