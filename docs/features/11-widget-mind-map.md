# 🧩 Fitur 11 — Widget Mind Map (Brainstorming)

## Ringkasan

Widget di brainstorming canvas untuk membuat **diagram berbasis node** yang memetakan ide secara visual. Mendukung node induk, node anak, koneksi antar node, dan kustomisasi visual (warna, bentuk, ukuran, ikon).

---

## Tampilan Widget

### Ukuran Default

- Width: 600px
- Height: 500px
- Resizable (minimum: 300x250)

### Header Widget

| Elemen     | Deskripsi                                |
| ---------- | ---------------------------------------- |
| Ikon       | 🧩 (mind map icon)                       |
| Judul      | "Mind Map" (editable)                    |
| Menu "..." | Lock, Collapse, Layer, Hapus, Export PNG |

---

## Operasi Node

### Buat Node

| Cara                     | Hasil                  |
| ------------------------ | ---------------------- |
| Double-klik area kosong  | Buat node induk baru   |
| Klik tombol "+" di node  | Buat node anak (child) |
| Enter saat mengedit node | Buat node sibling      |
| Tab saat mengedit node   | Buat node child        |

### Edit Node

- **Double-klik** node untuk masuk mode edit teks
- Teks bisa multi-line (Shift+Enter untuk baris baru)
- **Enter** untuk selesai edit dan buat sibling
- **Escape** untuk selesai edit

### Hapus Node

- Select node → tekan **Delete** key
- Atau klik kanan → Hapus Node
- Hapus node induk: konfirmasi apakah ingin hapus semua anak juga, atau jadikan anak sebagai node induk

### Move Node

- Drag node ke posisi lain
- Koneksi garis mengikuti otomatis (auto-routing)

---

## Koneksi Antar Node

- Node anak otomatis terhubung ke node induk dengan garis
- Gaya koneksi:
  - **Bezier curve** (default, melengkung)
  - **Straight line** (lurus)
  - **Elbow** (siku-siku 90°)
- Node bisa dihubungkan secara manual ke node lain (bukan parent-child) — **cross-link**
- Klik kanan garis → hapus koneksi (hanya untuk cross-link, bukan parent-child)

---

## Kustomisasi Node

### Properti Visual

| Properti | Opsi                                                |
| -------- | --------------------------------------------------- |
| Warna    | Background color picker (palet + custom hex)        |
| Bentuk   | Rectangle (default), Rounded Rect, Ellipse, Diamond |
| Ukuran   | Small, Medium (default), Large                      |
| Border   | Solid, Dashed, None                                 |
| Ikon     | Pilih dari set ikon (emoji atau icon set)           |

### Context Menu (Klik Kanan Node)

- Ubah Warna
- Ubah Bentuk
- Ubah Ukuran
- Tambah/Ubah Ikon
- Tambah Child Node
- Hubungkan ke Node Lain
- Hapus Node

---

## Layout Otomatis

- Tombol **"Auto Layout"** di header widget
- Meng-arrange semua node secara otomatis dalam pola:
  - **Horizontal** (root di kiri, anak ke kanan)
  - **Vertical** (root di atas, anak ke bawah)
  - **Radial** (root di tengah, anak menyebar melingkar)
- Setelah auto-layout, node bisa di-move secara manual

---

## Export Mind Map

- Menu "..." → **Export PNG**
- Export hanya area mind map widget ini (bukan seluruh canvas)
- Resolusi tinggi (2x scale)

---

## Struktur Data Widget (field `data`)

```json
{
  "title": "string (custom title, default: 'Mind Map')",
  "layoutMode": "string (horizontal|vertical|radial)",
  "connectionStyle": "string (bezier|straight|elbow)",
  "nodes": [
    {
      "_id": "ObjectId",
      "text": "string",
      "parentId": "ObjectId (nullable, null = root node)",
      "x": "number (posisi dalam widget)",
      "y": "number",
      "shape": "string (rectangle|rounded|ellipse|diamond)",
      "size": "string (small|medium|large)",
      "color": "string (hex)",
      "borderStyle": "string (solid|dashed|none)",
      "icon": "string (emoji atau icon name, nullable)"
    }
  ],
  "crossLinks": [
    {
      "_id": "ObjectId",
      "fromNodeId": "ObjectId",
      "toNodeId": "ObjectId",
      "label": "string (nullable)"
    }
  ]
}
```
