# Spek Desain: Pipeline Event

- **Tanggal:** 2026-09-28
- **Status:** Disetujui, siap masuk rencana implementasi
- **Cakupan:** Field baru pada `Task`, entity `PipelineTemplate` baru, Tab Pipeline baru pada Detail Event, endpoint terkait

---

## 1. Latar Belakang dan Tujuan

Event saat ini (`04-kelola-event.md`) sudah punya Tab "Task Terkait" yang menampilkan task berdasarkan **kolom Kanban global workspace** (To Do → In Progress → Review → Done). Kolom ini bagus untuk melacak progres eksekusi sehari-hari, tapi tidak menjawab pertanyaan yang lebih penting saat menyiapkan sebuah event: *"dari sekian banyak persiapan, sudah sampai tahap apa event ini?"*

**Pipeline Event** menjawab itu dengan mem-breakdown persiapan event ke 5 fase standar: **Planning → Preparation → Marketing → Execution → Evaluation**. Tiap fase diisi item-item kerja yang sifatnya dinamis (bebas ditambah, diedit, dihapus oleh user per event), bukan daftar tetap.

Rancangan ini diturunkan dari sketsa manual berikut:

- 5 fase: Planning (Tujuan, Konsep, Anggaran, Target, Tanggal), Preparation (Menyiapkan rundown/tempat, Hadiah & Merch, Anggota & jobdesc, Perizinan & Dekorasi), Marketing (Konten, Poster H-14, Upload H-7), Execution (Eksekusi sesuai rundown), Evaluation (Evaluasi langsung, Evaluasi dari peserta).
- Pola **H-14 / H-7** (offset hari relatif terhadap tanggal event) dipertahankan sebagai fitur formal, bukan hanya catatan bebas.

### Keputusan kunci (dari sesi brainstorming)

1. **Item pipeline = Task asli**, ditandai field `phase`. Bukan entity checklist terpisah — supaya otomatis dapat semua fitur Task yang sudah ada (assignee, due date, komentar, lampiran, muncul di Kanban Board & Kalender) tanpa membangun ulang.
2. **Due date per item**: hybrid — user pilih per item apakah pakai **offset relatif** (H-N dari `startDate`/`endDate` event) atau **tanggal absolut manual**.
3. **Template pipeline**: bisa disimpan per workspace dan diterapkan ulang ke event lain. Item hasil apply tetap bebas diedit tanpa memengaruhi template asal (one-way copy).
4. **5 fase bersifat fixed secara global** — sama untuk semua workspace, tidak bisa ditambah/diganti nama/dihapus.
5. **Item "Tujuan/Konsep/Anggaran/Target"** di fase Planning diperlakukan sama seperti item lain: task biasa (mis. "Tentukan Tujuan Event"), bukan field terstruktur baru di level Event.
6. **Perpindahan task antar fase** bersifat bebas urutan — murni indikator visual/progres, tidak ada validasi urutan atau efek blocking apa pun.

### Yang sengaja tidak dikerjakan (YAGNI)

- Kustomisasi daftar fase per workspace atau per template. Fixed 5 fase untuk semua.
- Field terstruktur baru (goal/budget/target) di level Event. Cukup task biasa.
- Validasi urutan fase (mis. tidak boleh pindah ke Execution sebelum Preparation selesai). Bebas, hanya visual.
- Event socket khusus untuk template (CRUD template jarang bersamaan, cukup refetch lokal).
- Notifikasi/reminder otomatis berbasis H-N (di luar cakupan; due date sudah tercakup oleh notifikasi due date task yang sudah ada di `06-kelola-task.md`).

---

## 2. Model Data

### 2.1 Perubahan: `server/src/models/Task.js`

Field baru ditambahkan ke `taskSchema` yang sudah ada:

| Field | Tipe | Aturan |
|---|---|---|
| `phase` | String enum atau `null` | `planning`, `preparation`, `marketing`, `execution`, `evaluation`, atau `null` (task biasa, bukan bagian pipeline). Default `null` |
| `dueDateMode` | String enum atau `null` | `"absolute"` atau `"relative"`. Hanya relevan jika `phase` terisi. Default `null` |
| `dueOffsetDays` | Number atau `null` | Offset hari dari tanggal event. Negatif = sebelum (`-14` → H-14 dari `event.startDate`), positif = sesudah (`+2` → H+2 dari `event.endDate`, dipakai untuk fase Evaluation). Default `null` |

```js
phase: {
  type: String,
  enum: {
    values: ["planning", "preparation", "marketing", "execution", "evaluation"],
    message: "Fase harus salah satu dari: planning, preparation, marketing, execution, evaluation",
  },
  default: null,
},
dueDateMode: {
  type: String,
  enum: ["absolute", "relative"],
  default: null,
},
dueOffsetDays: {
  type: Number,
  default: null,
},
```

**Aturan validasi (di controller, bukan di schema):**

- Task dengan `phase` terisi **wajib** punya `eventId` terisi (tidak boleh `null`). Task pipeline selalu terikat ke satu event.
- Kalau `dueDateMode === "relative"`, `dueOffsetDays` wajib diisi, dan `dueDate` dihitung server-side saat create/update:
  - Fase `planning`, `preparation`, `marketing`: offset dari `event.startDate`.
  - Fase `execution`: offset dari `event.startDate` (biasanya `0`, hari-H).
  - Fase `evaluation`: offset dari `event.endDate` (biasanya offset positif, H+N).
- Kalau `dueDateMode === "absolute"`, `dueOffsetDays` diset `null`, `dueDate` diisi manual seperti task biasa.

**Index tambahan:**

```js
taskSchema.index({ eventId: 1, phase: 1 });
```

### 2.2 Recalculate saat tanggal event berubah

Di service update event yang sudah ada (bukan hook Mongoose terpisah, supaya tetap satu alur transaksi yang mudah ditelusuri): setelah `startDate`/`endDate` event berhasil diupdate, cari semua `Task` dengan `eventId` ini dan `dueDateMode: "relative"`, lalu hitung ulang `dueDate` dari nilai baru dan simpan (bulk update). Perubahan ini memicu event socket `task:updated` seperti update task biasa, agar Kalender & Kanban Board ikut sinkron.

### 2.3 Baru: `server/src/models/PipelineTemplate.js`

| Field | Tipe | Aturan |
|---|---|---|
| `workspaceId` | ObjectId, ref `Workspace` | wajib |
| `name` | String | wajib, trim, maksimal 100 karakter |
| `description` | String | default `""` |
| `items` | [Embedded] | lihat di bawah, default `[]` |
| `createdBy` | ObjectId, ref `User` | wajib |
| `createdAt`, `updatedAt` | Date | via `timestamps: true` |

**Embedded `items[]`:**

| Field | Tipe | Aturan |
|---|---|---|
| `phase` | String enum | wajib, sama seperti enum `Task.phase` (tanpa `null`) |
| `title` | String | wajib, trim, maksimal 200 karakter |
| `dueDateMode` | String enum | `"absolute"` atau `"relative"` |
| `dueOffsetDays` | Number atau `null` | wajib jika `dueDateMode === "relative"`, `null` jika `"absolute"` |
| `order` | Number | untuk urutan tampil dalam satu fase, default `0` |

Template **tidak menyimpan** assignee/PIC — itu spesifik per event/orang, diisi manual setelah apply.

Tidak ada soft delete untuk `PipelineTemplate` — hapus bersifat permanen (hard delete), karena template hanya struktur, bukan data historis event yang perlu diaudit.

---

## 3. Alur: Simpan & Terapkan Template

### 3.1 Simpan sebagai Template

Endpoint mengambil semua `Task` dengan `eventId` = event tsb dan `phase` bukan `null`, lalu memetakannya ke `items[]`:

- `dueDateMode: "relative"` → salin `phase`, `title`, `dueDateMode`, `dueOffsetDays`.
- `dueDateMode: "absolute"` → salin `phase`, `title`, `dueDateMode: "absolute"`, `dueOffsetDays: null` (tanggal spesifik tidak masuk akal dibawa ke event lain).

### 3.2 Terapkan Template ke Event

Endpoint menerima `templateId`, untuk tiap `items[]`:

1. Buat `Task` baru dengan `eventId` = event tujuan, `phase`, `title`, `dueDateMode` disalin dari item.
2. Jika `dueDateMode === "relative"`: hitung `dueDate` dari `dueOffsetDays` + tanggal event tujuan (lihat aturan offset di 2.1).
3. Jika `dueDateMode === "absolute"`: `dueDate` dibiarkan `null`, user isi manual setelah apply.
4. `assignees` kosong, `columnId` diset ke kolom kanban pertama workspace (default status task baru, sama seperti pembuatan task lain).

Task hasil apply adalah **task independen** — mengedit/menghapusnya tidak memengaruhi `PipelineTemplate` sumber, dan sebaliknya.

Template hanya bisa diterapkan ke event yang **belum punya task pipeline** ATAU ditambahkan ke event yang sudah punya pipeline (append, bukan replace) — keputusan implementasi: selalu **append**, supaya tidak ada resiko data hilang; UI cukup menampilkan konfirmasi ringan jika pipeline event sudah tidak kosong.

---

## 4. UI — Tab Pipeline

Komponen baru: `client/components/events/event-pipeline-tab.js`, sejajar dengan `event-overview-tab.js` dan `event-tasks-tab.js` yang sudah ada di Detail Event (`04-kelola-event.md` § Struktur Tab).

### 4.1 Layout

- 5 kolom horizontal tetap (Planning, Preparation, Marketing, Execution, Evaluation), reuse struktur visual `kanban-column.js` (header, counter, tombol "+") tapi pengelompokan berdasarkan `phase`, bukan `columnId` kanban global.
- Header tiap kolom: nama fase + progress bar `X/Y selesai` (dihitung dari task ber-`phase` itu yang `columnId`-nya adalah kolom kanban bertipe "Done"/terakhir).
- Kartu item: **reuse `task-card.js`** yang sudah ada (assignee avatar, prioritas, label) — tidak ada komponen kartu baru. Due date ditampilkan sebagai badge kecil: `"H-14"` jika `dueDateMode: relative`, atau tanggal biasa (`dd MMM yyyy`) jika `absolute`.
- Klik kartu → buka `task-detail-panel.js` yang sudah ada (side panel), tidak ada detail panel baru.

### 4.2 Membuat Item

- Tombol "+" per kolom → quick create task dengan `phase` & `eventId` otomatis terisi.
- Field tambahan di quick create: pilihan mode due date — toggle "Relatif (H-N)" (input angka hari) vs "Tanggal" (date picker).

### 4.3 Drag & Drop

- Memindahkan kartu antar kolom fase mengubah field `phase` task tersebut (bukan `columnId` kanban). Bebas urutan — tidak ada validasi, murni indikator visual/progres (sesuai keputusan § 1 poin 6). Reuse mekanisme drag-drop `kanban-board.js` dengan target field yang berbeda.

### 4.4 Empty State & Template

- Event baru tanpa task pipeline → tampilan kosong dengan dua CTA: **"Terapkan Template"** (dropdown pilih dari `pipeline-templates` workspace) atau **"Mulai Kosong"**.
- Toolbar atas tab: tombol **"Simpan sebagai Template"** dan **"Kelola Template"** (CRUD ringan: rename, edit item, hapus template).

---

## 5. API Endpoints

Mengikuti pola `mergeParams` yang sudah dipakai di `event.routes.js` / `eventDivision.routes.js`.

| Method | Endpoint | Deskripsi | Akses |
|---|---|---|---|
| GET | `/api/workspaces/:id/events/:eventId/pipeline` | Ambil task pipeline event, dikelompokkan per fase + progress | Member+ |
| POST | `/api/workspaces/:id/events/:eventId/pipeline/tasks` | Buat task pipeline baru | Member+ |
| PUT | `/api/workspaces/:id/tasks/:taskId` | Update task pipeline (reuse endpoint task biasa — termasuk pindah `phase`) | Member+ |
| POST | `/api/workspaces/:id/events/:eventId/pipeline/apply-template` | Terapkan template (`templateId`) ke event ini | Member+ |
| POST | `/api/workspaces/:id/events/:eventId/pipeline/save-as-template` | Simpan pipeline event ini sebagai template baru (`name`, `description`) | Member+ |
| GET | `/api/workspaces/:id/pipeline-templates` | Daftar template pipeline workspace | Member+ |
| PUT | `/api/workspaces/:id/pipeline-templates/:templateId` | Update template (rename, edit items) | Member+ |
| DELETE | `/api/workspaces/:id/pipeline-templates/:templateId` | Hapus template | Creator/Admin+ |

---

## 6. Real-time (Socket.io)

Tidak ada event socket baru. Reuse `task:created`, `task:updated`, `task:moved`, `task:deleted` yang sudah ada (`07-kanban-board.md`). Payload `task:updated`/`task:moved` sudah membawa `changes`, sehingga perubahan `phase` otomatis ter-propagate — Tab Pipeline cukup subscribe ke event yang sama (room `workspace:{workspaceId}`) dan filter task ber-`eventId` yang cocok.

CRUD template tidak dapat event socket khusus (jarang terjadi bersamaan antar user, cukup refetch setelah aksi sendiri berhasil).

---

## 7. Dampak ke Fitur Lain

- **Halaman Daftar Event** (`04-kelola-event.md`): opsional, bisa ditambahkan indikator ringkas "Progress Pipeline" (progress bar gabungan semua fase) di card/table. Tidak wajib untuk rilis awal.
- **Activity Log Event**: perubahan `phase`, pembuatan task via pipeline, apply template — semua tercatat otomatis lewat mekanisme activity log task/event yang sudah ada. Tidak perlu logika activity baru.
- **Kanban Board & Kalender global**: task pipeline tetap tampil seperti task event biasa (tetap task asli dengan `eventId`), karena tidak ada perubahan pada `columnId`/status kanban. Badge fase di kartu Kanban Board bersifat opsional (nice-to-have, bukan wajib rilis awal).

---

## 8. Struktur Data — Ringkasan Perubahan

```json
// Task (field baru)
{
  "phase": "planning|preparation|marketing|execution|evaluation|null",
  "dueDateMode": "absolute|relative|null",
  "dueOffsetDays": "number|null"
}
```

```json
// Collection baru: pipeline_templates
{
  "_id": "ObjectId",
  "workspaceId": "ObjectId",
  "name": "string",
  "description": "string",
  "items": [
    {
      "_id": "ObjectId",
      "phase": "planning|preparation|marketing|execution|evaluation",
      "title": "string",
      "dueDateMode": "absolute|relative",
      "dueOffsetDays": "number|null",
      "order": "number"
    }
  ],
  "createdBy": "ObjectId (ref: users)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```
