# 🗂️ Fitur 10 — Widget Task (Brainstorming)

## Ringkasan

Widget di brainstorming canvas yang menampilkan task dalam format **mini kanban** atau **daftar**. Data **terhubung langsung** ke modul Task utama — perubahan di widget ini terupdate di Kanban Board, Kalender, dan sebaliknya. Mendukung filter untuk menampilkan task tertentu.

---

## Tampilan Widget

### Ukuran Default

- Width: 400px
- Height: 500px
- Resizable ke ukuran apapun (minimum: 250x200)

### Header Widget

| Elemen           | Deskripsi                        |
| ---------------- | -------------------------------- |
| Ikon             | 📋 (clipboard icon)              |
| Judul            | "Task" (editable, bisa dikustom) |
| Mode toggle      | Kanban / List                    |
| Filter indicator | Badge jika filter aktif          |
| Menu "..."       | Lock, Collapse, Layer, Hapus     |

---

## Mode Mini Kanban

- Menampilkan kolom kanban workspace di dalam widget (scroll horizontal jika kolom banyak)
- Setiap kolom menampilkan kartu task (versi kompak):
  - Judul
  - Assignee (avatar kecil)
  - Prioritas (strip warna)
  - Due date
- **Drag & drop** task antar kolom di dalam widget → status terupdate di modul Task utama
- Klik kartu → buka detail task (side panel di canvas)

## Mode List

- Menampilkan task sebagai daftar vertikal
- Informasi per baris: checkbox done, judul, assignee, due date, prioritas
- Sortable berdasarkan: due date, prioritas, judul

---

## Filter Widget

Klik ikon filter di header widget:

| Filter    | Tipe         | Keterangan                     |
| --------- | ------------ | ------------------------------ |
| Event     | Dropdown     | Task dari event tertentu       |
| Assignee  | Multi-select | Task dari assignee tertentu    |
| Label     | Multi-select | Task dengan label tertentu     |
| Prioritas | Multi-select | Low / Medium / High / Critical |

Filter bersifat **per widget** — setiap widget task bisa memiliki filter berbeda.

---

## Buat Task dari Widget

- Tombol "+" di dalam widget
- Quick create task:
  - Judul (required)
  - Assignee, Due Date, Prioritas
  - Jika widget difilter per event → `eventId` otomatis terisi
- Task langsung muncul di Kanban Board dan Kalender

---

## Sinkronisasi Data

| Aksi di Widget          | Efek di Modul Task                    |
| ----------------------- | ------------------------------------- |
| Pindah task antar kolom | Status terupdate di Kanban & Kalender |
| Edit task               | Terupdate di semua tampilan           |
| Buat task baru          | Muncul di Kanban & Kalender           |

| Aksi di Modul Task         | Efek di Widget                    |
| -------------------------- | --------------------------------- |
| Task dibuat/diedit/dihapus | Widget terupdate secara real-time |
| Task diarsipkan            | Hilang dari widget                |

---

## Struktur Data Widget (field `data`)

```json
{
  "mode": "string (kanban|list)",
  "title": "string (custom title, default: 'Task')",
  "filters": {
    "eventId": "ObjectId (nullable)",
    "assignees": ["ObjectId"],
    "labels": ["ObjectId"],
    "priorities": ["string"]
  }
}
```
