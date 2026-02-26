# 🏷️ Fitur 14 — Mention User (@mention)

## Ringkasan

Sistem mention yang konsisten di seluruh aplikasi. Mengetik `@` di mana pun teks bisa ditulis akan menampilkan dropdown autocomplete daftar **member workspace individual** (tanpa mention role seperti @admin atau @all). Mention memicu notifikasi in-app dan WhatsApp.

---

## Lokasi yang Mendukung Mention

| Lokasi                                  | Modul             |
| --------------------------------------- | ----------------- |
| Deskripsi task                          | Task              |
| Komentar & reply di task                | Task              |
| Komentar cell di spreadsheet event      | Event/Spreadsheet |
| Widget Teks WYSIWYG di brainstorming    | Brainstorming     |
| Komentar di Widget Task (brainstorming) | Brainstorming     |

---

## Mekanisme

### Trigger

1. User mengetik karakter `@` di area teks yang mendukung mention
2. Dropdown autocomplete muncul

### Autocomplete Dropdown

- Menampilkan daftar **member workspace** saat ini
- Setiap item: **Avatar** + **Nama** + **Role** (badge kecil)
- **Pencarian real-time**: saat user mengetik setelah `@`, list difilter berdasarkan nama
- Maks 10 item ditampilkan sekaligus (scroll untuk lebih)
- Navigasi: **↑↓** untuk pindah item, **Enter** untuk pilih, **Escape** untuk tutup

### Tampilan Mention di Teks

- Nama user yang di-mention ditampilkan sebagai **tag berwarna** (badge inline)
- Warna: biru/highlight yang berbeda dari teks biasa
- **Klikabel**: klik nama → buka profil user di workspace
- **Non-editable**: tag mention bersifat atomic (hapus sebagai satu unit, bukan per karakter)

---

## Efek Mention

### 1. Notifikasi In-App

- User yang di-mention langsung menerima notifikasi in-app
- Format: "[Nama pelaku] menyebut kamu di [konteks]"
- Konteks bervariasi:
  - "... di komentar task '[judul task]'"
  - "... di deskripsi task '[judul task]'"
  - "... di komentar cell spreadsheet '[nama event]'"
  - "... di widget teks brainstorming '[nama board]'"
- Klik notifikasi → navigasi langsung ke lokasi mention

### 2. Notifikasi WhatsApp

- Jika user mengaktifkan notifikasi WhatsApp untuk tipe "Mention"
- Dan user sudah mendaftarkan nomor WhatsApp
- Format pesan: `[Nama pelaku] menyebut kamu di [konteks] — [URL tautan langsung]`

### 3. Link ke Profil

- Nama yang di-mention bisa diklik untuk melihat profil user
- Popup kecil (hover card) saat hover: Avatar, Nama, Role, Status Online

---

## Validasi

- Hanya bisa mention member yang **aktif** di workspace saat ini
- Member yang sudah dikeluarkan: mention tetap tampil tapi tidak bisa diklik (greyed out)
- Self-mention: diperbolehkan tapi tidak memicu notifikasi ke diri sendiri

---

## Struktur Data Mention

Setiap teks yang mengandung mention menyimpan metadata:

### Format BlockNote (untuk deskripsi task, widget teks, komentar)

```json
{
  "content": "Block[] (BlockNote JSON block array)",
  "mentions": [
    {
      "userId": "ObjectId",
      "name": "string (nama saat mention dibuat, untuk fallback)"
    }
  ]
}
```

Mention disimpan sebagai **custom inline content** di dalam BlockNote block:

```json
{
  "type": "paragraph",
  "content": [
    { "type": "text", "text": "Hei " },
    {
      "type": "mention",
      "props": { "userId": "abc123", "name": "Budi Santoso" }
    },
    { "type": "text", "text": " tolong cek ini ya" }
  ]
}
```

---

## Implementasi Teknis

### Komponen Reusable

Buat komponen `MentionEditor` menggunakan BlockNote yang bisa dipakai di semua lokasi:

```jsx
<MentionEditor
  workspaceId={workspaceId}
  initialContent={content}
  onChange={handleChange}
  onMention={handleMention}
  placeholder="Ketik @ untuk mention..."
  editable={true}
/>
```

Untuk area komentar (lebih ringan), gunakan konfigurasi BlockNote dengan blok terbatas (hanya paragraph + list).

### API untuk Autocomplete

| Method | Endpoint                             | Deskripsi                      |
| ------ | ------------------------------------ | ------------------------------ |
| GET    | `/api/workspaces/:id/members/search` | Cari member (query param: `q`) |

Response:

```json
[
  {
    "_id": "abc123",
    "name": "Budi Santoso",
    "avatar": "https://...",
    "role": "member",
    "isOnline": true
  }
]
```

---

## Library

### BlockNote.js (untuk area rich text: deskripsi task, widget teks, komentar)

- Custom **Suggestion Menu** untuk `@` trigger
- Custom **Inline Content** type `mention` untuk render tag mention
- Dokumentasi: https://blocknotejs.org/docs/advanced/custom-inline-content

```bash
npm install @blocknote/core @blocknote/react @blocknote/mantine
```

### Komentar Cell Spreadsheet

- Komentar cell di Luckysheet menggunakan komponen `MentionEditor` yang sama (BlockNote ringan)
- Ditampilkan di panel samping kanan saat klik indikator komentar di cell
