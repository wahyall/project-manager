# 📝 Fitur 13 — Widget Teks WYSIWYG (Brainstorming)

## Ringkasan

Widget di brainstorming canvas berupa editor teks kaya (WYSIWYG) menggunakan **BlockNote.js**. Mendukung bold, italic, heading, list, tabel, highlight, dan **@mention** (yang memicu notifikasi). BlockNote menggunakan paradigma **block-based** (mirip Notion) yang intuitif.

---

## Tampilan Widget

### Ukuran Default

- Width: 400px
- Height: 300px
- Resizable (minimum: 200x150)

### Header Widget

| Elemen     | Deskripsi                    |
| ---------- | ---------------------------- |
| Ikon       | 📝 (text icon)               |
| Judul      | "Catatan" (editable)         |
| Menu "..." | Lock, Collapse, Layer, Hapus |

---

## Toolbar Format

BlockNote menyediakan **slash menu** (`/` untuk membuat block baru) dan **formatting toolbar** (muncul saat teks di-select):

### Format Teks (Inline via Formatting Toolbar)

| Format        | Shortcut     | Keterangan             |
| ------------- | ------------ | ---------------------- |
| Bold          | Ctrl+B       |                        |
| Italic        | Ctrl+I       |                        |
| Underline     | Ctrl+U       |                        |
| Strikethrough | Ctrl+Shift+S |                        |
| Highlight     | —            | Pilih warna dari palet |

### Block Types (via Slash Menu `/`)

| Block Type    | Trigger      | Keterangan       |
| ------------- | ------------ | ---------------- |
| Heading 1     | `/h1`        |                  |
| Heading 2     | `/h2`        |                  |
| Heading 3     | `/h3`        |                  |
| Bullet List   | `/bullet`    |                  |
| Numbered List | `/numbered`  |                  |
| Tabel         | `/table`     | Insert tabel N×M |
| Paragraph     | `/paragraph` | Teks biasa       |

### Drag & Drop Block

- Setiap block bisa di-drag & drop untuk reorder (built-in BlockNote)
- Handle drag muncul di sisi kiri saat hover

---

## Mention User

- Ketik `@` → muncul dropdown autocomplete daftar member workspace
- Implementasi via **custom Suggestion Menu** di BlockNote
- Pilih user → nama user muncul sebagai **inline content berwarna** dalam teks
- **Efek**:
  - User yang di-mention menerima notifikasi **in-app**
  - User yang di-mention menerima notifikasi **WhatsApp** (jika diaktifkan)
  - Nama yang di-mention menjadi **link** yang bisa diklik untuk melihat profil user
- Hanya bisa mention **member workspace individual** (bukan role seperti @all)

---

## Tabel

- Insert via slash menu (`/table`)
- Operasi tabel (built-in BlockNote):
  - Tambah/hapus baris dan kolom
  - Resize kolom (drag border)
- Konten cell: teks biasa (dengan inline formatting)

---

## Kolaborasi Real-time

- BlockNote mendukung kolaborasi via **Yjs** (CRDT-based)
- Teks yang diedit oleh user lain langsung tampil secara real-time
- Tidak ada cursor tracking user lain (konfigurasi awareness disabled)

---

## Struktur Data Widget (field `data`)

```json
{
  "title": "string (editable, default: 'Catatan')",
  "content": "Block[] (BlockNote JSON block array)",
  "mentions": [
    {
      "userId": "ObjectId",
      "name": "string"
    }
  ]
}
```

BlockNote menyimpan konten sebagai **array of Block objects** (bukan HTML), contoh:

```json
[
  {
    "type": "heading",
    "props": { "level": 1 },
    "content": [{ "type": "text", "text": "Judul Catatan" }]
  },
  {
    "type": "paragraph",
    "content": [
      { "type": "text", "text": "Hei " },
      { "type": "mention", "props": { "userId": "abc123", "name": "Budi" } },
      { "type": "text", "text": " tolong cek ini" }
    ]
  }
]
```

---

## Library

### BlockNote.js

- **Website**: https://blocknotejs.org
- **Berbasis**: ProseMirror + Tiptap (internal), tapi API lebih high-level & Notion-like
- **Fitur built-in yang dimanfaatkan**:
  - Block-based editing (heading, paragraph, list, table)
  - Slash menu (`/`)
  - Formatting toolbar (bold, italic, underline, highlight)
  - Drag & drop blocks
  - Custom inline content (untuk @mention)
  - Real-time collaboration via Yjs
- **Custom extensions yang perlu dibuat**:
  - **Mention inline content**: custom suggestion menu untuk @mention member workspace

```bash
npm install @blocknote/core @blocknote/react @blocknote/mantine
```

### Catatan Integrasi

- BlockNote digunakan di:
  - Widget Teks WYSIWYG di brainstorming canvas
  - Deskripsi task (rich text editor)
  - Komentar task (versi ringan, blok terbatas: paragraph + list saja)
- Konten disimpan sebagai BlockNote JSON (bukan HTML) untuk konsistensi
- Untuk render read-only (misal di notifikasi atau preview), gunakan `BlockNoteView` dengan `editable={false}`
