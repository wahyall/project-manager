# ✅ Fitur 06 — Kelola Task (CRUD & Struktur Data)

## Ringkasan

Task adalah unit kerja utama dalam aplikasi. Setiap task memiliki struktur data lengkap mencakup judul, deskripsi rich text, status (kolom kanban), assignee, due date, prioritas, label, relasi ke event, subtask 1 level, lampiran, komentar, dan **dependency opsional**. Mendukung konsep **watcher** untuk user yang ingin menerima notifikasi tanpa menjadi assignee. Task yang sudah selesai bisa **diarsipkan**.

---

## Struktur Data Task

### Field Utama

| Field      | Tipe           | Required | Keterangan                                       |
| ---------- | -------------- | -------- | ------------------------------------------------ |
| Judul      | string         | ✅       | Maks 200 karakter                                |
| Deskripsi  | string (HTML)  | ❌       | Rich text: bold, italic, list, @mention          |
| Status     | ObjectId       | ✅       | Referensi ke kanban column ID (global workspace) |
| Assignee   | ObjectId[]     | ❌       | Satu atau lebih member, **tidak terbatas**       |
| Watcher    | ObjectId[]     | ❌       | Member yang ingin notifikasi tanpa di-assign     |
| Start Date | Date           | ❌       | Tanggal mulai pengerjaan                         |
| Due Date   | Date           | ❌       | Batas waktu pengerjaan                           |
| Prioritas  | string         | ✅       | `low` / `medium` / `high` / `critical`           |
| Label/Tag  | array          | ❌       | Array of `{ name, color }`, bebas dikustomisasi  |
| Event      | ObjectId       | ❌       | Referensi ke event (opsional)                    |
| Subtask    | embedded array | ❌       | Hanya **1 level** kedalaman                      |
| Lampiran   | array          | ❌       | Maks **1MB per file**, hanya **gambar dan PDF**  |
| Komentar   | ref collection | ❌       | Lihat doc 15 (Comment Thread)                    |
| Dependency | ObjectId[]     | ❌       | Task yang harus selesai sebelum task ini         |
| Archived   | boolean        | —        | Default: false                                   |

---

## Subtask

- **Kedalaman**: Hanya 1 level (subtask tidak bisa punya subtask lagi)
- Setiap subtask memiliki:
  - `title`: string (maks 200 karakter)
  - `isCompleted`: boolean
  - `assignee`: ObjectId (opsional, 1 member)
  - `order`: number (untuk reorder)
- Ditampilkan sebagai **checklist** di detail task
- Progress: "3/5 selesai" ditampilkan di kartu task
- Reorder subtask via drag & drop

---

## Task Dependency (Opsional)

- Task bisa menambahkan **dependency**: "Task ini bergantung pada task lain"
- Field `blockedBy`: array of TaskId — daftar task yang harus Done sebelum task ini bisa dikerjakan
- **Validasi**:
  - Tidak boleh circular dependency (A → B → A)
  - Dependency hanya berlaku di workspace yang sama
- **Tampilan**:
  - Di detail task: section "Diblokir oleh" menampilkan daftar task blocking
  - Task yang masih blocked ditandai dengan ikon 🔒 di kartu kanban
  - Warning indicator jika ada dependency yang belum selesai
- **Opsional**: Tidak memblokir aksi apapun — user tetap bisa memindahkan task ke kolom manapun meski dependency belum selesai. Hanya sebagai **indikator visual**

---

## Assignee & Watcher

### Assignee

- Satu task bisa punya **banyak assignee** (tidak terbatas)
- Assignee ditampilkan sebagai avatar stack di kartu task
- Assignee menerima notifikasi saat:
  - Di-assign ke task
  - Task mereka di-update oleh orang lain
  - Due date mendekat
  - Ada komentar baru di task mereka

### Watcher

- User yang **bukan assignee** tapi ingin menerima notifikasi terkait task
- Tombol **"Watch"** (ikon mata) di detail task
- Watcher menerima notifikasi yang sama dengan assignee **kecuali** notifikasi assign
- User otomatis menjadi watcher saat:
  - Menulis komentar di task (bisa opt-out)
  - Membuat task tersebut

---

## Label / Tag

- Free-form: user bisa membuat label baru dengan nama dan warna bebas
- Label bersifat **per-workspace** (shared, bisa dipakai di banyak task)
- Satu task bisa punya banyak label
- Kelola label: dari pengaturan workspace atau langsung saat assign label ke task
- Operasi: buat, rename, ubah warna, hapus (hapus dari semua task yang menggunakan)

---

## Lampiran

- **Batas ukuran**: Maks **1MB per file**
- **Tipe file**: Hanya **gambar** (JPG, PNG, GIF, WebP) dan **PDF**
- **Storage**: Disimpan via **Puter.js**
- **Jumlah**: Tidak ada batas jumlah lampiran per task (tapi masing-masing maks 1MB)
- **Tampilan**:
  - Gambar: thumbnail preview yang bisa diklik untuk full view
  - PDF: ikon PDF dengan nama file yang bisa diklik untuk download/preview

---

## Arsip Task

- Task dengan status **Done** bisa diarsipkan
- Aksi: Di detail task → tombol "Arsipkan" (hanya muncul jika status Done)
- Task yang diarsipkan:
  - **Tidak muncul** di Kanban Board atau Kalender
  - Masih bisa dicari via filter khusus "Tampilkan task arsip"
  - Bisa di-**unarsipkan** (kembalikan ke board)
- Opsi **bulk archive**: arsipkan semua task Done sekaligus (dari menu Kanban)

---

## Buat Task

### Sumber Pembuatan

| Dari                    | Efek Otomatis                             |
| ----------------------- | ----------------------------------------- |
| Kanban Board            | Status = kolom pertama                    |
| Kalender (klik tanggal) | Due date = tanggal yang diklik            |
| Tab Task di Event       | `eventId` = event tersebut                |
| Brainstorming Widget    | `eventId` sesuai filter widget (jika ada) |

### Quick Create (Modal Ringkas)

Field minimal: **Judul**, **Assignee**, **Due Date**, **Prioritas**

### Full Create (Halaman/Panel Detail)

Semua field tersedia

---

## Hapus Task

- Bisa dilakukan oleh: pembuat task, assignee, Admin, Owner
- Soft delete: task disembunyikan, dihapus permanen setelah 30 hari
- Subtask ikut terhapus
- Komentar ikut terhapus
- Lampiran dihapus dari Puter.js setelah hard delete

---

## Struktur Data (MongoDB)

### Collection: `tasks`

```json
{
  "_id": "ObjectId",
  "workspaceId": "ObjectId",
  "title": "string",
  "description": "string (HTML)",
  "columnId": "ObjectId (ref: workspace.kanbanColumns._id)",
  "assignees": ["ObjectId (ref: users)"],
  "watchers": ["ObjectId (ref: users)"],
  "startDate": "Date (nullable)",
  "dueDate": "Date (nullable)",
  "priority": "string (low|medium|high|critical)",
  "labels": [
    {
      "_id": "ObjectId",
      "name": "string",
      "color": "string (hex)"
    }
  ],
  "eventId": "ObjectId (nullable, ref: events)",
  "subtasks": [
    {
      "_id": "ObjectId",
      "title": "string",
      "isCompleted": "boolean",
      "assignee": "ObjectId (nullable)",
      "order": "number"
    }
  ],
  "attachments": [
    {
      "_id": "ObjectId",
      "fileName": "string",
      "fileUrl": "string (Puter.js URL)",
      "fileType": "string (image/jpeg, image/png, application/pdf, etc.)",
      "fileSize": "number (bytes)",
      "uploadedBy": "ObjectId",
      "uploadedAt": "Date"
    }
  ],
  "blockedBy": ["ObjectId (ref: tasks)"],
  "isArchived": "boolean (default: false)",
  "archivedAt": "Date (nullable)",
  "createdBy": "ObjectId",
  "isDeleted": "boolean (default: false)",
  "deletedAt": "Date (nullable)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Collection: `workspace_labels`

```json
{
  "_id": "ObjectId",
  "workspaceId": "ObjectId",
  "name": "string",
  "color": "string (hex)"
}
```

---

## API Endpoints

| Method | Endpoint                                                      | Deskripsi                 | Akses          |
| ------ | ------------------------------------------------------------- | ------------------------- | -------------- |
| GET    | `/api/workspaces/:id/tasks`                                   | Daftar task (with filter) | Member+        |
| POST   | `/api/workspaces/:id/tasks`                                   | Buat task baru            | Member+        |
| GET    | `/api/workspaces/:id/tasks/:taskId`                           | Detail task               | Member+        |
| PUT    | `/api/workspaces/:id/tasks/:taskId`                           | Update task               | Member+        |
| DELETE | `/api/workspaces/:id/tasks/:taskId`                           | Hapus task (soft)         | Creator/Admin+ |
| POST   | `/api/workspaces/:id/tasks/:taskId/archive`                   | Arsipkan task             | Member+        |
| POST   | `/api/workspaces/:id/tasks/:taskId/unarchive`                 | Unarsipkan task           | Member+        |
| POST   | `/api/workspaces/:id/tasks/archive-done`                      | Bulk arsipkan semua Done  | Member+        |
| POST   | `/api/workspaces/:id/tasks/:taskId/watch`                     | Watch task                | Member+        |
| DELETE | `/api/workspaces/:id/tasks/:taskId/watch`                     | Unwatch task              | Member+        |
| POST   | `/api/workspaces/:id/tasks/:taskId/attachments`               | Upload lampiran           | Member+        |
| DELETE | `/api/workspaces/:id/tasks/:taskId/attachments/:attachmentId` | Hapus lampiran            | Member+        |
| GET    | `/api/workspaces/:id/labels`                                  | Daftar label workspace    | Member+        |
| POST   | `/api/workspaces/:id/labels`                                  | Buat label baru           | Member+        |
| PUT    | `/api/workspaces/:id/labels/:labelId`                         | Update label              | Member+        |
| DELETE | `/api/workspaces/:id/labels/:labelId`                         | Hapus label               | Admin+         |
