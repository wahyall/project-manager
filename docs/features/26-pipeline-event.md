# 🧭 Fitur 26 — Pipeline Event

## Ringkasan

Pipeline Event mem-breakdown persiapan event ke 5 fase tetap: **Planning → Preparation → Marketing → Execution → Evaluation**. Setiap item di dalam fase adalah **Task asli** (field `phase` pada model Task), sehingga otomatis muncul di Kanban Board dan Kalender. Due date tiap item bisa **relatif** (offset hari dari tanggal event, mis. H-14) atau **absolut**. Struktur pipeline sebuah event bisa disimpan sebagai **template** dan diterapkan ulang ke event lain.

## Struktur Data

### Task (field baru)

| Field | Tipe | Keterangan |
| --- | --- | --- |
| `phase` | string enum atau `null` | `planning`\|`preparation`\|`marketing`\|`execution`\|`evaluation` |
| `dueDateMode` | string enum atau `null` | `absolute`\|`relative` |
| `dueOffsetDays` | number atau `null` | Offset hari dari `event.startDate`/`endDate` |

### Collection: `pipelinetemplates`

| Field | Tipe |
| --- | --- |
| `workspaceId` | ObjectId |
| `name` | string |
| `description` | string |
| `items[]` | `{ phase, title, dueDateMode, dueOffsetDays, order }` |
| `createdBy` | ObjectId |

## API Endpoints

| Method | Endpoint | Deskripsi |
| --- | --- | --- |
| GET | `/api/workspaces/:id/events/:eventId/pipeline` | Task pipeline event, dikelompokkan per fase + progress |
| POST | `/api/workspaces/:id/events/:eventId/pipeline/tasks` | Buat task pipeline baru |
| POST | `/api/workspaces/:id/events/:eventId/pipeline/apply-template` | Terapkan template (additive) |
| POST | `/api/workspaces/:id/events/:eventId/pipeline/save-as-template` | Simpan pipeline event sebagai template baru |
| GET | `/api/workspaces/:id/pipeline-templates` | Daftar template workspace |
| PUT | `/api/workspaces/:id/pipeline-templates/:templateId` | Update template |
| DELETE | `/api/workspaces/:id/pipeline-templates/:templateId` | Hapus template (hard delete) |

## Socket.io Events

Tidak ada event baru — reuse `task:created`, `task:updated`, `task:moved`, `task:deleted` yang sudah ada di room `workspace:{workspaceId}`.

## Komponen Frontend

| File | Peran |
| --- | --- |
| `client/hooks/use-event-pipeline.js` | Fetch + mutate pipeline satu event, sync real-time |
| `client/hooks/use-pipeline-templates.js` | CRUD template workspace |
| `client/components/events/event-pipeline-tab.js` | Tab utama, 5 kolom fase |
| `client/components/events/pipeline-phase-column.js` | Satu kolom fase (progress bar + drop target) |
| `client/components/events/pipeline-quick-create-modal.js` | Modal buat item dengan toggle due date relatif/absolut |
| `client/components/events/pipeline-template-dialog.js` | Dialog terapkan/simpan/kelola template |
