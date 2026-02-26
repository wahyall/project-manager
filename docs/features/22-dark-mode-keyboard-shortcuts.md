# 🎨 Fitur 22 — Dark Mode & Keyboard Shortcuts

## Ringkasan

Fitur polish untuk meningkatkan pengalaman pengguna: **dark mode** sebagai opsi tema visual, dan **keyboard shortcuts** untuk power user yang ingin bekerja lebih cepat.

---

## Dark Mode

### Toggle

- **Lokasi**: Profil dropdown di topbar → toggle "Mode Gelap"
- Juga bisa diakses di **Pengaturan Akun**
- Pilihan:
  - **Terang** (default)
  - **Gelap**
  - **Sistem** (ikuti preferensi OS)

### Penyimpanan Preferensi

- Disimpan di **localStorage** (untuk instant load tanpa flash)
- Juga disimpan di database user (untuk sync antar perangkat)
- Prioritas: localStorage → database → default (terang)

### Implementasi Teknis

- Gunakan **CSS custom properties** (CSS variables) untuk semua warna
- Tambahkan class `dark` atau atribut `data-theme="dark"` di `<html>` element
- Transisi smooth: `transition: background-color 0.3s, color 0.3s`

### Palet Warna

| Token              | Terang    | Gelap     |
| ------------------ | --------- | --------- |
| `--bg-primary`     | `#FFFFFF` | `#1A1A2E` |
| `--bg-secondary`   | `#F5F5F5` | `#16213E` |
| `--bg-card`        | `#FFFFFF` | `#0F3460` |
| `--bg-sidebar`     | `#F8F9FA` | `#121225` |
| `--text-primary`   | `#1A1A1A` | `#E8E8E8` |
| `--text-secondary` | `#6B7280` | `#9CA3AF` |
| `--border`         | `#E5E7EB` | `#2D3748` |
| `--accent`         | `#1A73E8` | `#4DA8DA` |
| `--danger`         | `#DC2626` | `#EF4444` |
| `--success`        | `#16A34A` | `#22C55E` |
| `--warning`        | `#F59E0B` | `#FBBF24` |

### Elemen yang Terdampak

Semua elemen UI harus menggunakan token warna, termasuk:

- Background halaman, sidebar, topbar
- Kartu task, card event
- Input, button, dropdown
- Tabel, spreadsheet
- Canvas brainstorming
- Toast, modal, dialog
- Scrollbar (optional)

### Gambar & Media

- Logo dan ikon: gunakan versi yang sesuai tema, atau SVG yang menggunakan `currentColor`
- Gambar (lampiran, avatar): tidak difilter (tetap asli)
- Brainstorming canvas: background berubah sesuai tema

---

## Keyboard Shortcuts

### Global Shortcuts (Berlaku di mana saja)

| Shortcut           | Aksi                                |
| ------------------ | ----------------------------------- |
| `Ctrl + K`         | Buka command palette / quick search |
| `Ctrl + /`         | Tampilkan daftar keyboard shortcuts |
| `Ctrl + Shift + D` | Toggle dark mode                    |

### Navigasi

| Shortcut     | Aksi                   |
| ------------ | ---------------------- |
| `G` lalu `D` | Pergi ke Dashboard     |
| `G` lalu `E` | Pergi ke Events        |
| `G` lalu `K` | Pergi ke Kanban Board  |
| `G` lalu `C` | Pergi ke Kalender      |
| `G` lalu `B` | Pergi ke Brainstorming |
| `G` lalu `A` | Pergi ke Activity Log  |
| `G` lalu `S` | Pergi ke Settings      |

### Kanban Board

| Shortcut | Aksi                            |
| -------- | ------------------------------- |
| `N`      | Quick create task baru          |
| `F`      | Fokus ke search / filter        |
| `Escape` | Tutup panel detail / filter     |
| `←` `→`  | Navigasi antar kolom            |
| `↑` `↓`  | Navigasi antar task dalam kolom |
| `Enter`  | Buka detail task yang dipilih   |

### Detail Task

| Shortcut       | Aksi                 |
| -------------- | -------------------- |
| `E`            | Edit judul task      |
| `A`            | Tambah/ubah assignee |
| `P`            | Ubah prioritas       |
| `L`            | Tambah/ubah label    |
| `D`            | Ubah due date        |
| `S`            | Tambah subtask       |
| `Ctrl + Enter` | Kirim komentar       |
| `Escape`       | Tutup detail task    |

### Spreadsheet

| Shortcut      | Aksi                      |
| ------------- | ------------------------- |
| `Tab`         | Pindah ke cell berikutnya |
| `Shift + Tab` | Pindah ke cell sebelumnya |
| `Enter`       | Pindah ke cell bawah      |
| `Arrow keys`  | Navigasi antar cell       |
| `Ctrl + Z`    | Undo                      |
| `Ctrl + Y`    | Redo                      |
| `Ctrl + C`    | Copy cell(s)              |
| `Ctrl + V`    | Paste cell(s)             |
| `Delete`      | Hapus isi cell            |
| `F2`          | Edit cell aktif           |

### Brainstorming

| Shortcut       | Aksi                  |
| -------------- | --------------------- |
| `Space + drag` | Pan canvas            |
| `Ctrl + +`     | Zoom in               |
| `Ctrl + -`     | Zoom out              |
| `Ctrl + 0`     | Fit to screen         |
| `Delete`       | Hapus widget terpilih |

---

## Command Palette

### Trigger: `Ctrl + K`

- Modal search di tengah layar (mirip VS Code command palette)
- Input teks untuk mencari:
  - **Task** berdasarkan judul
  - **Event** berdasarkan judul
  - **Board brainstorming** berdasarkan nama
  - **Member** berdasarkan nama
  - **Halaman/menu** (Dashboard, Kanban, Kalender, dll)
- Hasil pencarian ditampilkan real-time saat mengetik
- Navigasi: `↑↓` untuk pilih, `Enter` untuk membuka
- `Escape` untuk menutup

### Kategori Hasil

| Kategori | Ikon | Contoh Hasil                         |
| -------- | ---- | ------------------------------------ |
| Task     | 📋   | "Desain Landing Page"                |
| Event    | 📅   | "Demo Product Q1"                    |
| Board    | 🧠   | "Sprint Retro Board"                 |
| Member   | 👤   | "Budi Santoso"                       |
| Navigasi | 🧭   | "Pergi ke Kalender", "Buka Settings" |

---

## Shortcuts Help Modal

### Trigger: `Ctrl + /` atau ikon `?` di footer sidebar

- Modal/dialog yang menampilkan semua keyboard shortcuts
- Dikelompokkan per konteks (Global, Kanban, Task, Spreadsheet, Canvas)
- Searchable: input pencarian di atas untuk menemukan shortcut tertentu

---

## Struktur Data (Extend users collection)

```json
{
  "theme": "string (light|dark|system, default: light)"
}
```

Juga disimpan di localStorage:

```javascript
localStorage.setItem("theme", "dark");
```
