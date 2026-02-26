# 🧠 Fitur 09 — Brainstorming Board & Canvas

## Ringkasan

Halaman infinite canvas bebas tanpa batas untuk brainstorming, perencanaan visual, dan kolaborasi kreatif. Mendukung berbagai jenis widget (Task, Mind Map, Gambar, Teks WYSIWYG) yang bisa diposisikan, di-resize, dan dihubungkan satu sama lain. Kolaborasi bersifat **real-time** (data sync) namun **tanpa cursor tracking** user lain. Tidak ada undo/redo untuk operasi canvas, board template, atau permission terpisah per board.

---

## Halaman Daftar Board

### Route: `/workspace/:id/brainstorming`

### Tampilan

Daftar semua board brainstorming dalam workspace, bisa ditampilkan dalam **grid card** atau **list view**.

### Informasi per Board

| Field             | Deskripsi                            |
| ----------------- | ------------------------------------ |
| Nama Board        | Judul board                          |
| Thumbnail Preview | Screenshot/preview kecil dari canvas |
| Terakhir Diubah   | Waktu relatif: "2 jam lalu"          |
| Dibuat Oleh       | Avatar + nama user pembuat           |
| Jumlah Widget     | Counter widget yang ada di board     |

### Aksi

- **Buat Board Baru**: Tombol utama di halaman
  - Input: nama board (required)
  - Canvas kosong langsung terbuka
- **Duplikasi Board**: Klik kanan / menu "..." → Duplikasi
  - Salin semua widget dan posisi
  - Nama otomatis: "[Nama asli] (Salinan)"
- **Hapus Board**: Klik kanan / menu "..." → Hapus
  - Konfirmasi: "Yakin hapus board '[nama]'?"
  - Soft delete (30 hari)
- **Rename Board**: Klik kanan / menu "..." → Rename

---

## Canvas

### Route: `/workspace/:id/brainstorming/:boardId`

### Navigasi Canvas

| Aksi          | Input                              | Keterangan                               |
| ------------- | ---------------------------------- | ---------------------------------------- |
| Pan           | Klik + drag area kosong            | Menggeser pandangan canvas               |
| Pan (alt)     | Middle mouse button + drag         | Alternatif pan                           |
| Zoom In       | Scroll up / Pinch out              | Memperbesar tampilan                     |
| Zoom Out      | Scroll down / Pinch in             | Memperkecil tampilan                     |
| Zoom level    | Slider di toolbar / Ctrl + scroll  | Range: 10% — 400%                        |
| Fit to Screen | Tombol "Fit" di toolbar            | Zoom otomatis agar semua widget terlihat |
| Minimap       | Selalu tampil di sudut kanan bawah | Peta kecil posisi viewport di canvas     |

### Minimap

- Menampilkan seluruh canvas dalam skala kecil
- Menandai area viewport saat ini dengan kotak highlight
- Klik di minimap untuk langsung navigasi ke area tersebut
- Bisa di-toggle show/hide

---

## Toolbar Canvas

Toolbar tetap di atas canvas:

| Tombol            | Fungsi                                 |
| ----------------- | -------------------------------------- |
| ➕ Tambah Widget  | Dropdown: Task, Mind Map, Gambar, Teks |
| 🔍 Zoom In/Out    | Slider zoom level                      |
| 📐 Fit to Screen  | Auto-fit viewport                      |
| 🗺️ Toggle Minimap | Show/hide minimap                      |
| 📤 Export         | Export canvas ke PNG atau PDF          |

---

## Manajemen Widget (Umum)

Semua tipe widget mendukung operasi berikut:

### Posisi & Ukuran

| Operasi | Cara                                         |
| ------- | -------------------------------------------- |
| Drag    | Klik header/border widget + drag             |
| Resize  | Drag handle di sudut dan tepi widget         |
| Snap    | Widget snap ke grid halus (opsional, toggle) |

### Layer (Z-Index)

- Widget yang baru dibuat berada di layer teratas
- Klik kanan → Layer:
  - **Bring to Front**: Paling atas
  - **Send to Back**: Paling bawah
  - **Bring Forward**: Naik 1 level
  - **Send Backward**: Turun 1 level

### Lock

- Klik kanan → **Lock Position**
- Widget yang terkunci tidak bisa di-drag atau di-resize
- Ikon gembok ditampilkan di sudut widget
- Klik kanan → **Unlock** untuk membuka kembali

### Collapse / Expand

- Tombol collapse (▿) di header widget
- Collapse: widget menyusut menjadi **hanya header** (nama + tipe ikon)
- Expand: kembali ke ukuran penuh

### Hapus

- Klik kanan → **Hapus Widget**
- Atau select widget → tekan **Delete** key
- Konfirmasi singkat sebelum hapus

---

## Koneksi Antar Widget

Selain mind map internal, user bisa membuat **garis koneksi** antar widget yang berbeda jenis.

### Membuat Koneksi

- Hover di tepi widget → muncul **connection point** (titik bulat) di 4 sisi
- Klik dan drag dari connection point → drag ke widget lain
- Garis koneksi terbentuk antara kedua widget

### Properti Koneksi

| Properti   | Opsi                           |
| ---------- | ------------------------------ |
| Gaya garis | Solid, dashed, dotted          |
| Warna      | Color picker                   |
| Arrow      | None, one-way (→), two-way (↔) |
| Label      | Teks opsional di tengah garis  |

### Behavior

- Koneksi mengikuti posisi widget saat di-drag
- Routing garis: **bezier curve** (melengkung otomatis), atau **straight line** (toggle)
- Hapus koneksi: klik garis → klik tombol hapus, atau klik kanan → Hapus Koneksi

---

## Kolaborasi Real-time

- Semua perubahan widget (posisi, ukuran, konten) disinkronkan real-time ke user lain
- **Tanpa cursor tracking** — tidak ada indikator posisi user lain
- Conflict resolution: **last write wins** per properti widget

### Socket.io Events

| Event                      | Payload                                |
| -------------------------- | -------------------------------------- |
| `board:widget:added`       | `{ boardId, widget }`                  |
| `board:widget:updated`     | `{ boardId, widgetId, changes }`       |
| `board:widget:moved`       | `{ boardId, widgetId, x, y }`          |
| `board:widget:resized`     | `{ boardId, widgetId, width, height }` |
| `board:widget:deleted`     | `{ boardId, widgetId }`                |
| `board:connection:added`   | `{ boardId, connection }`              |
| `board:connection:updated` | `{ boardId, connectionId, changes }`   |
| `board:connection:deleted` | `{ boardId, connectionId }`            |

Room = `board:{boardId}`

---

## Struktur Data

### Collection: `brainstorming_boards`

```json
{
  "_id": "ObjectId",
  "workspaceId": "ObjectId",
  "name": "string",
  "thumbnail": "string (URL, nullable)",
  "createdBy": "ObjectId",
  "isDeleted": "boolean",
  "deletedAt": "Date (nullable)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Collection: `brainstorming_widgets`

```json
{
  "_id": "ObjectId",
  "boardId": "ObjectId",
  "type": "string (task|mindmap|image|text)",
  "x": "number (posisi X di canvas)",
  "y": "number (posisi Y di canvas)",
  "width": "number",
  "height": "number",
  "zIndex": "number",
  "isLocked": "boolean (default: false)",
  "isCollapsed": "boolean (default: false)",
  "data": "object (widget-specific, lihat doc per widget)",
  "createdBy": "ObjectId",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Collection: `brainstorming_connections`

```json
{
  "_id": "ObjectId",
  "boardId": "ObjectId",
  "fromWidgetId": "ObjectId",
  "fromSide": "string (top|right|bottom|left)",
  "toWidgetId": "ObjectId",
  "toSide": "string (top|right|bottom|left)",
  "lineStyle": "string (solid|dashed|dotted)",
  "color": "string (hex)",
  "arrowType": "string (none|one-way|two-way)",
  "label": "string (nullable)",
  "createdAt": "Date"
}
```

---

## API Endpoints

| Method | Endpoint                                                  | Deskripsi              |
| ------ | --------------------------------------------------------- | ---------------------- |
| GET    | `/api/workspaces/:id/boards`                              | Daftar board           |
| POST   | `/api/workspaces/:id/boards`                              | Buat board             |
| GET    | `/api/workspaces/:id/boards/:boardId`                     | Detail board + widgets |
| PUT    | `/api/workspaces/:id/boards/:boardId`                     | Update board (rename)  |
| DELETE | `/api/workspaces/:id/boards/:boardId`                     | Hapus board            |
| POST   | `/api/workspaces/:id/boards/:boardId/duplicate`           | Duplikasi board        |
| POST   | `/api/workspaces/:id/boards/:boardId/widgets`             | Tambah widget          |
| PUT    | `/api/workspaces/:id/boards/:boardId/widgets/:widgetId`   | Update widget          |
| DELETE | `/api/workspaces/:id/boards/:boardId/widgets/:widgetId`   | Hapus widget           |
| POST   | `/api/workspaces/:id/boards/:boardId/connections`         | Buat koneksi           |
| PUT    | `/api/workspaces/:id/boards/:boardId/connections/:connId` | Update koneksi         |
| DELETE | `/api/workspaces/:id/boards/:boardId/connections/:connId` | Hapus koneksi          |
| GET    | `/api/workspaces/:id/boards/:boardId/export/png`          | Export ke PNG          |
| GET    | `/api/workspaces/:id/boards/:boardId/export/pdf`          | Export ke PDF          |

---

## Library Rekomendasi

- **React Flow** (reactflow.dev) — untuk canvas, nodes, edges, minimap, controls
- Atau custom canvas menggunakan **HTML5 Canvas** / **Konva.js** / **Fabric.js**
