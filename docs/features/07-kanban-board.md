# 📋 Fitur 07 — Kanban Board

## Ringkasan

Tampilan papan kanban untuk mengelola task secara visual. Kolom kanban bersifat **global per workspace** (berlaku sama untuk semua task). Task ditampilkan sebagai kartu yang bisa dipindahkan antar kolom dengan **drag & drop**. Mendukung filter, pencarian, dan pembukaan detail task.

---

## Halaman Kanban Board

### Route: `/workspace/:id/tasks/kanban`

---

## Kolom Kanban

### Sifat

- **Global per workspace**: Satu set kolom berlaku untuk semua task di workspace
- Dikelola di **Pengaturan Workspace → Tab Kolom Kanban** (lihat doc 02)
- Default saat workspace dibuat: **To Do** → **In Progress** → **Review** → **Done**

### Tampilan Kolom

| Elemen      | Deskripsi                                  |
| ----------- | ------------------------------------------ |
| Nama kolom  | Judul kolom (editable inline oleh Admin+)  |
| Warna kolom | Strip warna di atas header kolom           |
| Counter     | Jumlah task di kolom ini (termasuk filter) |
| Tombol "+"  | Quick create task di kolom ini             |

### Operasi Kolom (Inline)

- **Tambah kolom**: Tombol "+" di ujung kanan
- **Rename**: Double-klik nama kolom
- **Hapus**: Menu "..." → Hapus (pindahkan task ke kolom lain terlebih dahulu)
- **Reorder**: Drag & drop kolom
- **Ubah warna**: Menu "..." → Pilih warna

---

## Kartu Task

### Informasi yang Ditampilkan

| Elemen             | Posisi/Tampilan                                       |
| ------------------ | ----------------------------------------------------- |
| Judul              | Teks utama                                            |
| Assignee           | Avatar stack (maks 3 + "+N") di pojok kanan bawah     |
| Due Date           | Teks kecil, merah jika overdue                        |
| Prioritas          | Strip warna di sisi kiri kartu                        |
| Label              | Badge warna kecil di bawah judul                      |
| Event badge        | Badge nama event (jika terhubung ke event)            |
| Subtask progress   | "3/5" dengan mini progress bar                        |
| Komentar count     | Ikon 💬 + jumlah komentar                             |
| Dependency blocked | Ikon 🔒 jika ada dependency belum selesai             |
| Archived indicator | Tidak ditampilkan jika diarsipkan (hidden by default) |

### Warna Prioritas

| Prioritas | Warna                |
| --------- | -------------------- |
| Low       | Abu-abu / Biru muda  |
| Medium    | Kuning / Oranye muda |
| High      | Oranye               |
| Critical  | Merah                |

---

## Drag & Drop

### Pindah Task antar Kolom

- Drag kartu dan drop ke kolom tujuan
- Status task otomatis terupdate ke kolom baru
- Animasi smooth saat drag & drop
- Perubahan langsung tersinkron ke Kalender dan semua user lain

### Reorder Task dalam Kolom

- Drag kartu ke posisi berbeda dalam kolom yang sama
- Order disimpan dan dipelihara

### Feedback Visual

- Ghost card (transparent) mengikuti cursor saat drag
- Kolom tujuan di-highlight saat hover
- Drop zone indicator ditampilkan

---

## Filter & Pencarian

### Toolbar Filter (di atas kolom)

| Filter     | Tipe                | Keterangan                       |
| ---------- | ------------------- | -------------------------------- |
| Event      | Dropdown            | Filter task berdasarkan event    |
| Assignee   | Multi-select avatar | Filter berdasarkan assignee      |
| Label/Tag  | Multi-select badge  | Filter berdasarkan label         |
| Prioritas  | Multi-select        | Low, Medium, High, Critical      |
| Due Date   | Date range picker   | Rentang due date                 |
| Kata Kunci | Search input        | Cari di judul task               |
| Task Arsip | Toggle              | Tampilkan/sembunyikan task arsip |

### Behavior Filter

- Filter bersifat **AND** (semua kondisi harus terpenuhi)
- Jumlah task per kolom diupdate sesuai filter aktif
- Badge "X filter aktif" ditampilkan di toolbar
- Tombol "Clear filter" untuk menghapus semua filter

---

## Quick Create Task

- Klik tombol "+" di header kolom
- Modal ringkas muncul:
  - **Judul** (required)
  - **Assignee** (opsional)
  - **Due Date** (opsional)
  - **Prioritas** (default: Medium)
- Task langsung masuk ke kolom tersebut
- Klik "Buat & Buka Detail" untuk langsung buka panel detail

---

## Detail Task (Side Panel)

- Klik kartu task → panel slide-in dari **sisi kanan**
- Panel menampilkan semua field task (lihat doc 06 untuk detail field)
- Semua field **editable inline**
- Tab di dalam panel:
  1. **Detail** — Semua field task
  2. **Komentar** — Thread komentar (lihat doc 15)
  3. **Activity** — Riwayat perubahan task
- Keyboard: **Escape** untuk menutup panel
- Di **mobile**: panel menjadi halaman penuh (lihat doc 20)

---

## Bulk Actions

- Select beberapa kartu (checkbox muncul saat hover di pojok kartu)
- Aksi yang tersedia saat multi-select:
  - **Pindahkan ke kolom**: Pindahkan semua task terpilih ke kolom lain
  - **Ubah assignee**: Set assignee untuk semua task terpilih
  - **Ubah prioritas**: Set prioritas untuk semua task terpilih
  - **Arsipkan**: Arsipkan semua task terpilih (jika Done)
  - **Hapus**: Hapus semua task terpilih

---

## Real-time Sync

Task yang diubah oleh user lain langsung terupdate di board tanpa refresh:

| Event Socket.io | Efek di UI                             |
| --------------- | -------------------------------------- |
| `task:created`  | Kartu baru muncul di kolom yang sesuai |
| `task:updated`  | Kartu diupdate (animasi subtle)        |
| `task:moved`    | Kartu berpindah kolom (animasi slide)  |
| `task:deleted`  | Kartu hilang (fade out animation)      |
| `task:archived` | Kartu hilang (jika filter arsip off)   |

Room = `workspace:{workspaceId}`

---

## Keyboard Shortcuts

| Shortcut | Aksi                                                                              |
| -------- | --------------------------------------------------------------------------------- |
| `N`      | Quick create task baru                                                            |
| `F`      | Fokus ke search/filter                                                            |
| `Escape` | Tutup panel detail / filter                                                       |
| `←` `→`  | Navigasi antar kolom (saat panel detail terbuka, pindah ke task di kolom sebelah) |
