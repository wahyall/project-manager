# 📅 Fitur 04 — Kelola Event

## Ringkasan

Event merepresentasikan proyek, milestone, atau acara penting dalam workspace. Event memiliki task terkait, spreadsheet internal, dan activity log. Status event diubah **secara manual** oleh user. Tidak ada recurring event atau template event. Peserta event dan assignee task bersifat **terpisah** (independen satu sama lain).

---

## Halaman Daftar Event

### Route: `/workspace/:id/events`

### Tampilan

Daftar semua event dalam workspace, ditampilkan sebagai **card list** atau **table view** (toggle).

### Informasi per Event

| Field           | Deskripsi                             |
| --------------- | ------------------------------------- |
| Nama Event      | Judul event                           |
| Tanggal Mulai   | Format: dd MMM yyyy                   |
| Tanggal Selesai | Format: dd MMM yyyy                   |
| Status          | Badge: Upcoming / Ongoing / Completed |
| Warna Label     | Titik atau strip warna kustom         |
| Jumlah Task     | Jumlah task yang terhubung ke event   |
| Peserta         | Avatar stack (maks 5 + "+N")          |

### Filter

| Filter          | Tipe                                      |
| --------------- | ----------------------------------------- |
| Status          | Multiselect: Upcoming, Ongoing, Completed |
| Rentang Tanggal | Date range picker                         |
| Peserta         | Dropdown member workspace                 |

### Sorting

- Berdasarkan tanggal mulai (default: terbaru dulu)
- Berdasarkan nama (A-Z / Z-A)
- Berdasarkan status

---

## Buat Event Baru

### Dialog/Modal

| Field           | Tipe         | Required | Keterangan                          |
| --------------- | ------------ | -------- | ----------------------------------- |
| Judul           | Text         | ✅       | Maks 100 karakter                   |
| Deskripsi       | Rich Text    | ❌       | WYSIWYG editor (bold, italic, list) |
| Tanggal Mulai   | Date Picker  | ✅       |                                     |
| Tanggal Selesai | Date Picker  | ✅       | Harus >= tanggal mulai              |
| Warna Label     | Color Picker | ✅       | Default: warna random dari palet    |
| Peserta         | Multi-select | ❌       | Dropdown member workspace           |
| Status          | Select       | ✅       | Default: Upcoming                   |

---

## Detail Event

### Route: `/workspace/:id/events/:eventId`

### Struktur Tab

#### Tab 1: Overview

- **Judul** (editable inline)
- **Deskripsi** (rich text editor, editable)
- **Tanggal Mulai** dan **Tanggal Selesai** (date picker, editable)
- **Warna Label** (color picker, editable)
- **Status** (dropdown, editable) — diubah manual:
  - `Upcoming` → `Ongoing` → `Completed`
  - Boleh langsung ke status manapun (tidak harus berurutan)
- **Daftar Peserta** (tambah/hapus peserta)

#### Tab 2: Task Terkait

- Menampilkan semua task yang field `eventId`-nya mengarah ke event ini
- Tampilan bisa dipilih: **List View** atau **Mini Kanban** (kolom diambil dari kanban global workspace)
- Tombol **"Buat Task Baru"** → membuat task dengan `eventId` otomatis terisi
- Klik task → buka Detail Task

#### Tab 3: Spreadsheet

- Spreadsheet internal event (detail di dokumen **05-spreadsheet-event.md**)

#### Tab 4: Activity

- Riwayat semua perubahan pada event ini
- Mencakup: perubahan field event, perubahan peserta, perubahan spreadsheet
- Format: `[Avatar] [Nama user] [aksi] — [waktu relatif]`
- Contoh: "Budi mengubah status dari 'Upcoming' menjadi 'Ongoing' — 2 jam lalu"

---

## Hapus Event

- Hanya bisa dilakukan oleh pembuat event, Admin, atau Owner
- Dialog konfirmasi: "Yakin ingin menghapus event '[nama]'? Task yang terhubung tidak akan terhapus, namun relasi ke event akan dihilangkan."
- Soft delete: data disembunyikan, dihapus permanen setelah 30 hari
- Task yang terhubung: field `eventId` di-set `null`

---

## Relasi Event & Task

- Task memiliki field opsional `eventId` yang mengarah ke sebuah event
- Saat task dihubungkan ke event:
  - Muncul di **Tab Task Terkait** halaman detail event
  - Ditampilkan di kalender dengan **warna label event**
  - Bisa difilter berdasarkan event di Kanban Board
- Satu task hanya bisa terhubung ke **satu event** pada satu waktu
- Peserta event dan assignee task **tidak saling berpengaruh**

---

## Struktur Data

### Collection: `events`

```json
{
  "_id": "ObjectId",
  "workspaceId": "ObjectId",
  "title": "string",
  "description": "string (HTML rich text)",
  "startDate": "Date",
  "endDate": "Date",
  "color": "string (hex, e.g. '#FF5733')",
  "status": "string (upcoming|ongoing|completed)",
  "participants": ["ObjectId (ref: users)"],
  "createdBy": "ObjectId (ref: users)",
  "isDeleted": "boolean (default: false)",
  "deletedAt": "Date (nullable)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

## API Endpoints

| Method | Endpoint                                                   | Deskripsi          | Akses          |
| ------ | ---------------------------------------------------------- | ------------------ | -------------- |
| GET    | `/api/workspaces/:id/events`                               | Daftar event       | Member+        |
| POST   | `/api/workspaces/:id/events`                               | Buat event baru    | Member+        |
| GET    | `/api/workspaces/:id/events/:eventId`                      | Detail event       | Member+        |
| PUT    | `/api/workspaces/:id/events/:eventId`                      | Update event       | Member+        |
| DELETE | `/api/workspaces/:id/events/:eventId`                      | Hapus event (soft) | Creator/Admin+ |
| POST   | `/api/workspaces/:id/events/:eventId/participants`         | Tambah peserta     | Member+        |
| DELETE | `/api/workspaces/:id/events/:eventId/participants/:userId` | Hapus peserta      | Member+        |
| GET    | `/api/workspaces/:id/events/:eventId/tasks`                | Task terkait event | Member+        |
| GET    | `/api/workspaces/:id/events/:eventId/activity`             | Activity log event | Member+        |

---

## Real-time (Socket.io)

| Event                       | Direction     | Payload                                 |
| --------------------------- | ------------- | --------------------------------------- |
| `event:created`             | Server → Room | `{ event }` (full event data)           |
| `event:updated`             | Server → Room | `{ eventId, changes }` (changed fields) |
| `event:deleted`             | Server → Room | `{ eventId }`                           |
| `event:participant:added`   | Server → Room | `{ eventId, userId }`                   |
| `event:participant:removed` | Server → Room | `{ eventId, userId }`                   |

Room = `workspace:{workspaceId}`
