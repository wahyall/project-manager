# 🖼️ Fitur 12 — Widget Gambar (Brainstorming)

## Ringkasan

Widget di brainstorming canvas yang menampilkan gambar. Mendukung **upload file** dari perangkat, **embed dari URL**, dan **caption** di bawah gambar.

---

## Tampilan Widget

### Ukuran Default

- Width: 350px
- Height: auto (menyesuaikan rasio gambar) + tinggi caption
- Resizable (minimum: 150x100)

### Header Widget

| Elemen     | Deskripsi                          |
| ---------- | ---------------------------------- |
| Ikon       | 🖼️ (image icon)                    |
| Judul      | Nama file atau "Gambar" (editable) |
| Menu "..." | Lock, Collapse, Layer, Hapus       |

---

## Cara Menambahkan Gambar

### 1. Upload File

- Klik area drop zone atau tombol "Upload"
- File picker muncul: pilih file gambar
- **Format**: JPG, PNG, GIF, WebP
- **Maks ukuran**: 1MB
- File disimpan via **Puter.js**

### 2. Embed dari URL

- Klik tab "URL" di dialog tambah gambar
- Input URL gambar (harus berakhiran .jpg, .png, .gif, .webp, atau URL gambar valid)
- Preview gambar ditampilkan sebelum confirm
- Gambar ditampilkan langsung dari URL (tidak di-download ke server)

### 3. Drag & Drop

- Drag file gambar dari file explorer ke area widget (atau ke canvas, akan auto-create widget gambar)

---

## Caption

- Area teks di **bawah gambar**
- Editable inline (klik untuk edit)
- Mendukung teks sederhana (tanpa formatting)
- Maks 500 karakter
- Opsional (boleh kosong)

---

## Interaksi

| Aksi            | Cara                                  |
| --------------- | ------------------------------------- |
| Zoom gambar     | Klik gambar → modal preview full-size |
| Ganti gambar    | Menu "..." → Ganti Gambar             |
| Resize widget   | Drag handle, gambar fit proportional  |
| Download gambar | Menu "..." → Download                 |

### Resize Behavior

- Saat widget di-resize, gambar menjaga **aspect ratio** (fit/cover mode)
- Caption tetap di bawah gambar

---

## Struktur Data Widget (field `data`)

```json
{
  "title": "string (editable, default: filename atau 'Gambar')",
  "imageSource": "string (upload|url)",
  "imageUrl": "string (Puter.js URL atau external URL)",
  "originalFileName": "string (nullable, untuk upload)",
  "caption": "string (nullable, maks 500 karakter)",
  "objectFit": "string (contain|cover, default: contain)"
}
```
