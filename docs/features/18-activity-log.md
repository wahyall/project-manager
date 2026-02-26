# 📋 Fitur 18 — Activity Log & Audit Trail

## Ringkasan

Catatan otomatis dan permanen dari semua aksi penting yang terjadi dalam workspace. Log **tidak bisa diedit atau dihapus** oleh user. Log tidak menyimpan nilai sebelum/sesudah (diff) — hanya deskripsi aksi. Data log disimpan selama **1 tahun** sebelum dihapus otomatis.

---

## Aksi yang Dicatat

### Task

| Aksi                    | Format Log                                                       |
| ----------------------- | ---------------------------------------------------------------- |
| Task dibuat             | "[Nama] membuat task '[judul]'"                                  |
| Task diedit (judul)     | "[Nama] mengubah judul task menjadi '[judul baru]'"              |
| Task diedit (deskripsi) | "[Nama] mengubah deskripsi task '[judul]'"                       |
| Task dipindahkan kolom  | "[Nama] memindahkan task '[judul]' ke kolom '[kolom baru]'"      |
| Task di-assign          | "[Nama] menugaskan task '[judul]' kepada [assignee]"             |
| Task unassign           | "[Nama] menghapus [assignee] dari task '[judul]'"                |
| Prioritas diubah        | "[Nama] mengubah prioritas task '[judul]' menjadi [prioritas]"   |
| Due date diubah         | "[Nama] mengubah due date task '[judul]' menjadi [tanggal]"      |
| Subtask ditambah        | "[Nama] menambahkan subtask '[judul subtask]' ke task '[judul]'" |
| Subtask dihapus         | "[Nama] menghapus subtask '[judul subtask]' dari task '[judul]'" |
| Subtask selesai         | "[Nama] menyelesaikan subtask '[judul subtask]'"                 |
| Lampiran ditambah       | "[Nama] menambahkan lampiran '[nama file]' ke task '[judul]'"    |
| Lampiran dihapus        | "[Nama] menghapus lampiran '[nama file]' dari task '[judul]'"    |
| Task dihapus            | "[Nama] menghapus task '[judul]'"                                |
| Task diarsipkan         | "[Nama] mengarsipkan task '[judul]'"                             |
| Task di-unarsipkan      | "[Nama] mengembalikan task '[judul]' dari arsip"                 |

### Event

| Aksi             | Format Log                                                |
| ---------------- | --------------------------------------------------------- |
| Event dibuat     | "[Nama] membuat event '[judul]'"                          |
| Event diedit     | "[Nama] mengubah [field] event '[judul]'"                 |
| Event dihapus    | "[Nama] menghapus event '[judul]'"                        |
| Peserta ditambah | "[Nama] menambahkan [peserta] ke event '[judul]'"         |
| Peserta dihapus  | "[Nama] menghapus [peserta] dari event '[judul]'"         |
| Status diubah    | "[Nama] mengubah status event '[judul]' menjadi [status]" |

### Spreadsheet Event

| Aksi            | Format Log                                                        |
| --------------- | ----------------------------------------------------------------- |
| Cell diubah     | "[Nama] mengubah cell di sheet '[nama sheet]' event '[judul]'"    |
| Kolom ditambah  | "[Nama] menambahkan kolom '[nama kolom]' di sheet '[nama sheet]'" |
| Kolom dihapus   | "[Nama] menghapus kolom '[nama kolom]' dari sheet '[nama sheet]'" |
| Kolom di-rename | "[Nama] mengubah nama kolom menjadi '[nama baru]'"                |
| Sheet ditambah  | "[Nama] menambahkan sheet '[nama sheet]' di event '[judul]'"      |
| Sheet dihapus   | "[Nama] menghapus sheet '[nama sheet]' dari event '[judul]'"      |
| Sheet di-rename | "[Nama] mengubah nama sheet menjadi '[nama baru]'"                |

### Workspace

| Aksi                 | Format Log                                     |
| -------------------- | ---------------------------------------------- |
| Member diundang      | "[Nama] mengundang [email] ke workspace"       |
| Member bergabung     | "[Nama] bergabung ke workspace"                |
| Member keluar        | "[Nama] meninggalkan workspace"                |
| Member dikeluarkan   | "[Nama] mengeluarkan [member] dari workspace"  |
| Role diubah          | "[Nama] mengubah role [member] menjadi [role]" |
| Pengaturan diubah    | "[Nama] mengubah pengaturan workspace"         |
| Workspace diarsipkan | "[Nama] mengarsipkan workspace"                |
| Ownership ditransfer | "[Nama] mentransfer ownership ke [member]"     |

### Brainstorming

| Aksi            | Format Log                                            |
| --------------- | ----------------------------------------------------- |
| Board dibuat    | "[Nama] membuat board brainstorming '[judul]'"        |
| Board dihapus   | "[Nama] menghapus board brainstorming '[judul]'"      |
| Widget ditambah | "[Nama] menambahkan widget [tipe] di board '[judul]'" |
| Widget dihapus  | "[Nama] menghapus widget dari board '[judul]'"        |

---

## Format Tampilan Log

### Elemen per Entri

| Elemen         | Deskripsi                                     |
| -------------- | --------------------------------------------- |
| Avatar         | Foto profil user pelaku                       |
| Nama User      | Nama user yang melakukan aksi (klikabel)      |
| Deskripsi Aksi | Teks deskriptif aksi                          |
| Nama Objek     | Nama task/event/board yang terkena (klikabel) |
| Konteks        | Di task/event/workspace mana aksi terjadi     |
| Waktu          | Relatif: "3 jam lalu", "kemarin 14:32"        |

### Tampilan

```
┌──────────────────────────────────────────────────┐
│ [Avatar] Budi Santoso                  3 jam lalu│
│ memindahkan task "Desain Landing Page"           │
│ ke kolom "Review"                                │
│ 📍 Event: Demo Product Q1                       │
└──────────────────────────────────────────────────┘
```

---

## Akses Log

### 1. Halaman Activity Log Workspace

- **Route**: `/workspace/:id/activity`
- Menampilkan **semua aktivitas** dalam workspace
- Pagination: infinite scroll atau "Muat lebih banyak"

#### Filter

| Filter          | Tipe              | Keterangan                                         |
| --------------- | ----------------- | -------------------------------------------------- |
| User            | Dropdown member   | Filter aksi oleh user                              |
| Tipe Aksi       | Multi-select      | Task, Event, Spreadsheet, Workspace, Brainstorming |
| Rentang Tanggal | Date range picker | Filter periode waktu                               |
| Modul           | Select            | Task / Event / Workspace / Board                   |

### 2. Tab Activity di Detail Task

- Hanya menampilkan riwayat perubahan task tersebut
- Tanpa filter (sudah scoped ke task)

### 3. Tab Activity di Detail Event

- Menampilkan riwayat event dan spreadsheet di dalamnya
- Filter ringan: Event changes saja / Spreadsheet changes saja

---

## Retensi & Cleanup

- Log disimpan selama **1 tahun** (365 hari)
- **Cron job harian**: hapus log yang `createdAt` lebih dari 1 tahun
- Hard delete (tidak ada soft delete untuk log)

---

## Struktur Data

### Collection: `activity_logs`

```json
{
  "_id": "ObjectId",
  "workspaceId": "ObjectId",
  "actorId": "ObjectId (ref: users)",
  "action": "string (task.created|task.moved|event.updated|...)",
  "targetType": "string (task|event|spreadsheet|workspace|board)",
  "targetId": "ObjectId",
  "targetName": "string (nama objek saat aksi terjadi)",
  "details": {
    "field": "string (field yang berubah, nullable)",
    "newValue": "string (nilai baru, nullable)",
    "contextType": "string (event|workspace, untuk konteks tambahan)",
    "contextId": "ObjectId (nullable)",
    "contextName": "string (nullable)"
  },
  "createdAt": "Date"
}
```

### Index

- `{ workspaceId: 1, createdAt: -1 }` — query utama
- `{ targetType: 1, targetId: 1, createdAt: -1 }` — query per objek (detail task/event)
- `{ actorId: 1, createdAt: -1 }` — query per user
- `{ createdAt: 1 }` — TTL index untuk auto-cleanup 1 tahun

### TTL Index (Auto-Cleanup)

```javascript
db.activity_logs.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60 }, // 1 tahun
);
```

---

## API Endpoints

| Method | Endpoint                                       | Deskripsi                          |
| ------ | ---------------------------------------------- | ---------------------------------- |
| GET    | `/api/workspaces/:id/activity`                 | Activity log workspace (paginated) |
| GET    | `/api/workspaces/:id/tasks/:taskId/activity`   | Activity log per task              |
| GET    | `/api/workspaces/:id/events/:eventId/activity` | Activity log per event             |
| GET    | `/api/workspaces/:id/members/:userId/activity` | Activity log per user              |

### Query Parameters

| Parameter    | Tipe   | Deskripsi                          |
| ------------ | ------ | ---------------------------------- |
| `page`       | number | Halaman (default: 1)               |
| `limit`      | number | Per halaman (default: 20, max: 50) |
| `actorId`    | string | Filter per user                    |
| `action`     | string | Filter per tipe aksi               |
| `targetType` | string | Filter per target type             |
| `startDate`  | Date   | Filter dari tanggal                |
| `endDate`    | Date   | Filter sampai tanggal              |

---

## Implementasi Backend

### Service Pattern

```javascript
// Panggil setelah setiap aksi penting
ActivityLogService.log({
  workspaceId,
  actorId,
  action: "task.moved",
  targetType: "task",
  targetId: task._id,
  targetName: task.title,
  details: {
    field: "columnId",
    newValue: "Review",
    contextType: "event",
    contextId: event._id,
    contextName: event.title,
  },
});
```

Log dibuat **synchronous** (tidak di-queue) untuk memastikan tidak ada log yang hilang.
