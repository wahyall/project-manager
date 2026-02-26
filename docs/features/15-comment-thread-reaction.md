# 💬 Fitur 15 — Comment Thread & Reaction

## Ringkasan

Sistem komentar terstruktur dengan thread, reply nested 1 level, emoji reaction, dan resolve thread. **Tidak mendukung** file attachment di komentar dan **tidak menyimpan** riwayat edit komentar. Tersedia di panel detail task, cell spreadsheet, dan widget brainstorming.

---

## Lokasi Comment Thread

| Lokasi                    | Modul         | Detail                                     |
| ------------------------- | ------------- | ------------------------------------------ |
| Panel detail task         | Task          | Tab "Komentar" di side panel               |
| Cell spreadsheet event    | Event         | Panel klik kanan cell → Komentar           |
| Widget Task brainstorming | Brainstorming | Komentar di task (sama seperti modul Task) |
| Widget Teks brainstorming | Brainstorming | Thread komentar di bawah widget            |

---

## Struktur Komentar

### Hierarki

```
Komentar Utama 1
  └── Reply 1.1
  └── Reply 1.2
Komentar Utama 2
  └── Reply 2.1
```

- **Komentar utama**: Komentar tingkat pertama
- **Reply**: Balasan langsung ke komentar utama
- **Hanya 1 level depth** — reply ke reply tidak bisa, akan menjadi reply ke komentar utama

---

## Operasi Komentar

### Tulis Komentar Baru

- Area input di **bawah thread** (sticky)
- Mendukung **@mention** (lihat doc 14)
- Tombol "Kirim" atau **Ctrl+Enter**
- Komentar baru muncul di atas (atau bawah, sesuai pengaturan sort)

### Reply Komentar

- Klik tombol "Balas" di komentar → input muncul di bawah komentar tersebut
- Reply ditampilkan **nested** di bawah komentar yang dibalas (indent visual)
- Reply menampilkan referensi "Membalas [nama user]"

### Edit Komentar

- Hanya bisa dilakukan oleh **penulis komentar sendiri**
- Klik menu "..." → "Edit"
- Komentar masuk mode edit (inline)
- Setelah save: label **"diedit"** muncul di sebelah timestamp
- **Tidak menyimpan riwayat edit** — hanya value terbaru yang tersimpan

### Hapus Komentar

- Bisa dilakukan oleh: **penulis** atau **Admin/Owner** workspace
- Klik menu "..." → "Hapus"
- Konfirmasi singkat ("Hapus komentar ini?")
- Komentar diganti dengan placeholder: "_Komentar ini telah dihapus_"
- Reply di bawahnya **tetap ada** (tidak ikut terhapus)

---

## Emoji Reaction

### Menambahkan Reaction

- Hover di komentar → tombol **"😊+"** muncul
- Klik → picker emoji muncul (kategori: Sering Dipakai, Smileys, Hand Gestures, dll)
- Pilih emoji → reaction ditambahkan ke komentar

### Tampilan Reaction

- Reaction ditampilkan sebagai **badge** di bawah komentar
- Format: `[emoji] [counter]` — contoh: `👍 3` `❤️ 2` `😂 1`
- Reaction yang sama dari banyak user **digabung** dengan counter
- Hover di badge reaction → tooltip menampilkan nama user yang memberi reaction

### Hapus Reaction

- Klik badge reaction milik sendiri untuk menghapus

---

## Resolve Thread

### Fungsi

- Menandai seluruh thread komentar sebagai "selesai" / "terselesaikan"
- Paling berguna di **komentar cell spreadsheet** untuk menandai diskusi yang sudah ditindaklanjuti

### Cara

- Tombol **"Resolve"** (✓) di komentar utama
- Seluruh thread (komentar + reply) ditandai resolved
- Thread resolved secara default **disembunyikan**
- Toggle "Tampilkan thread yang sudah resolve" untuk melihat kembali

### Unresolve

- Buka thread yang sudah resolve → tombol "Unresolve"
- Thread kembali aktif dan terlihat

---

## Tampilan

### Komentar Individual

```
┌─────────────────────────────────────────────┐
│ [Avatar] Nama User              3 jam lalu  │
│                                   ... (menu)│
│ Isi komentar teks di sini, bisa panjang     │
│ dan multi-baris. @Budi tolong cek ya.       │
│                                             │
│ 👍 3  ❤️ 1                    😊+ Balas     │
│                                             │
│   ┌─ [Avatar] Reply User       2 jam lalu   │
│   │  Iya sudah saya cek, aman.              │
│   │  👍 1                      😊+ Balas    │
│   └─────────────────────────────────────────│
└─────────────────────────────────────────────┘
```

### Sorting Komentar

- Default: **terbaru di bawah** (chronological)
- Opsi: **terbaru di atas** (reverse chronological)
- Toggle di header section komentar

---

## Struktur Data

### Collection: `comments`

```json
{
  "_id": "ObjectId",
  "workspaceId": "ObjectId",
  "targetType": "string (task|spreadsheet_cell|brainstorming_widget)",
  "targetId": "ObjectId (ID dari task/cell/widget)",
  "parentCommentId": "ObjectId (nullable, null = komentar utama)",
  "authorId": "ObjectId (ref: users)",
  "content": "string (HTML, mendukung mention)",
  "mentions": [
    {
      "userId": "ObjectId",
      "name": "string"
    }
  ],
  "isEdited": "boolean (default: false)",
  "isDeleted": "boolean (default: false)",
  "isResolved": "boolean (default: false)",
  "resolvedBy": "ObjectId (nullable)",
  "resolvedAt": "Date (nullable)",
  "reactions": [
    {
      "emoji": "string",
      "users": ["ObjectId"]
    }
  ],
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

## API Endpoints

| Method | Endpoint                                    | Deskripsi              | Akses         |
| ------ | ------------------------------------------- | ---------------------- | ------------- |
| GET    | `/api/comments?targetType=X&targetId=Y`     | Daftar komentar        | Member+       |
| POST   | `/api/comments`                             | Buat komentar baru     | Member+       |
| PUT    | `/api/comments/:commentId`                  | Edit komentar          | Author        |
| DELETE | `/api/comments/:commentId`                  | Hapus komentar         | Author/Admin+ |
| POST   | `/api/comments/:commentId/reactions`        | Tambah reaction        | Member+       |
| DELETE | `/api/comments/:commentId/reactions/:emoji` | Hapus reaction sendiri | Member+       |
| POST   | `/api/comments/:commentId/resolve`          | Resolve thread         | Member+       |
| POST   | `/api/comments/:commentId/unresolve`        | Unresolve thread       | Member+       |

---

## Socket.io Events

| Event                      | Payload                             |
| -------------------------- | ----------------------------------- |
| `comment:created`          | `{ targetType, targetId, comment }` |
| `comment:updated`          | `{ commentId, content }`            |
| `comment:deleted`          | `{ commentId }`                     |
| `comment:reaction:added`   | `{ commentId, emoji, userId }`      |
| `comment:reaction:removed` | `{ commentId, emoji, userId }`      |
| `comment:resolved`         | `{ commentId, resolvedBy }`         |
| `comment:unresolved`       | `{ commentId }`                     |
