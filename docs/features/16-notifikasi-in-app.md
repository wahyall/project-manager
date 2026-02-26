# 🔔 Fitur 16 — Notifikasi In-App

## Ringkasan

Sistem notifikasi in-app yang dikirim via **polling** (bukan WebSocket). Notifikasi muncul di bell icon pada topbar dengan badge counter, dan panel slide-in dari kanan. Notifikasi bersifat **satu per satu** (tidak di-batch/group). Setiap user bisa mengatur preferensi notifikasi per tipe.

---

## UI Notifikasi

### Bell Icon (Topbar)

- Posisi: kanan atas di topbar, sebelum profil user
- **Badge counter**: lingkaran merah kecil menampilkan jumlah notifikasi belum dibaca
- Badge counter maks "99+" (jika lebih dari 99)
- Klik bell icon → buka **panel notifikasi**

### Panel Notifikasi (Slide-in)

- Slide-in dari **kanan** layar
- Lebar: ~400px (desktop) atau full-width (mobile)
- Header: "Notifikasi" + tombol "Tandai Semua Dibaca"

### Tampilan Notifikasi Individual

```
┌─────────────────────────────────────────┐
│ ● [Avatar] Budi Santoso            3m  │
│   menyebut kamu di komentar task        │
│   "Desain Landing Page"                │
└─────────────────────────────────────────┘
```

| Elemen      | Deskripsi                                     |
| ----------- | --------------------------------------------- |
| ● (dot)     | Biru jika belum dibaca, hilang jika sudah     |
| Avatar      | Foto profil pelaku aksi                       |
| Nama pelaku | Nama user yang melakukan aksi                 |
| Waktu       | Relatif: "3m", "2j", "kemarin", "3 hari lalu" |
| Pesan       | Deskripsi aksi + nama objek (klikabel)        |

---

## Tipe Notifikasi

| Tipe           | Trigger                                          | Format Pesan                                        |
| -------------- | ------------------------------------------------ | --------------------------------------------------- |
| Mention        | User di-mention di teks/komentar                 | "[Nama] menyebut kamu di [konteks] '[judul]'"       |
| Assign Task    | User di-assign ke task                           | "[Nama] menugaskan task '[judul]' kepadamu"         |
| Due Date Dekat | Due date task user mendekat (H, H-1, H-3)        | "Task '[judul]' jatuh tempo [waktu]"                |
| Komentar Baru  | Ada komentar baru di task yang user watch/assign | "Ada komentar baru di task '[judul]'"               |
| Member Baru    | Ada member baru bergabung ke workspace           | "[Nama] bergabung ke workspace [nama workspace]"    |
| Event Dimulai  | Event yang diikuti user dimulai hari ini         | "Event '[judul]' dimulai hari ini"                  |
| Update Task    | Task milik user diubah oleh orang lain           | "Task '[judul]' dipindahkan ke [kolom] oleh [nama]" |

---

## Mekanisme Pengiriman (Polling)

### Cara Kerja

1. Client melakukan **polling** ke endpoint notifikasi setiap **15 detik**
2. Server mengembalikan notifikasi baru sejak `lastFetchedAt`
3. Client mengupdate badge counter dan daftar notifikasi
4. Interval polling bisa diperpanjang jika tab tidak aktif (60 detik)

### Endpoint Polling

```
GET /api/notifications?since={timestamp}&limit=20
```

### Optimisasi

- Gunakan `If-Modified-Since` header atau `ETag` untuk mengurangi payload
- Jika tidak ada notifikasi baru, response `304 Not Modified`
- Polling hanya aktif saat user memiliki tab browser yang terbuka

---

## Manajemen Notifikasi

### Mark as Read

- **Per notifikasi**: Klik notifikasi → otomatis marked as read
- **Semua sekaligus**: Tombol "Tandai Semua Dibaca" di header panel
- Badge counter langsung diupdate

### Filter Notifikasi

- Dropdown filter di header panel:
  - Semua
  - Mention
  - Task
  - Event
  - Workspace

### Navigasi dari Notifikasi

- Klik notifikasi → langsung diarahkan ke halaman yang relevan:
  - Mention di komentar → buka detail task, scroll ke komentar
  - Assign task → buka detail task
  - Event dimulai → buka detail event
  - Member baru → buka daftar member

### Persistensi

- Notifikasi **tersimpan di database** dan persisten antar session
- Tetap bisa dilihat setelah logout dan login ulang
- Notifikasi yang lebih lama dari riwayat scroll: "Muat notifikasi sebelumnya"

---

## Preferensi Notifikasi

(Dikelola di Pengaturan Akun, lihat doc 03)

User bisa mengaktifkan/nonaktifkan notifikasi **per tipe**:

- Toggle terpisah untuk **in-app** dan **WhatsApp**

---

## Pembuatan Notifikasi (Backend)

### Service Pattern

```javascript
// Pseudocode
NotificationService.create({
  workspaceId,
  recipientId, // user yang menerima
  actorId, // user yang melakukan aksi
  type, // 'mention' | 'assign_task' | 'due_date' | ...
  targetType, // 'task' | 'event' | 'workspace' | ...
  targetId, // ID objek terkait
  message, // pesan yang sudah di-format
  url, // URL tujuan saat notifikasi diklik
});
```

### Trigger Notifikasi

Notifikasi dibuat otomatis oleh backend saat aksi terjadi:

- Task di-assign → `assignTask` notification ke assignee
- @mention → `mention` notification ke user yang di-mention
- Komentar baru → `newComment` notification ke watcher & assignee
- dll.

### Cek Preferensi

Sebelum membuat notifikasi, cek preferensi user:

- Jika tipe notifikasi dinonaktifkan (in-app = false) → jangan buat notifikasi in-app
- Jika WhatsApp diaktifkan → buat juga notifikasi WhatsApp (lihat doc 17)

---

## Due Date Reminder (Scheduled)

- **Cron job** berjalan setiap hari pada waktu tertentu (misalnya 08:00 WIB)
- Cek semua task yang:
  - Memiliki due date
  - Belum Done/Archived
  - Due date cocok dengan preferensi reminder user (H, H-1, H-3)
- Buat notifikasi due date untuk setiap assignee + watcher

---

## Struktur Data

### Collection: `notifications`

```json
{
  "_id": "ObjectId",
  "workspaceId": "ObjectId",
  "recipientId": "ObjectId (ref: users)",
  "actorId": "ObjectId (ref: users, nullable untuk system notif)",
  "type": "string (mention|assign_task|due_date|new_comment|new_member|event_start|task_update)",
  "targetType": "string (task|event|workspace|comment)",
  "targetId": "ObjectId",
  "message": "string",
  "url": "string (relative URL)",
  "isRead": "boolean (default: false)",
  "readAt": "Date (nullable)",
  "createdAt": "Date"
}
```

### Index

- `{ recipientId: 1, createdAt: -1 }` — untuk query daftar notif user
- `{ recipientId: 1, isRead: 1 }` — untuk count badge

---

## API Endpoints

| Method | Endpoint                          | Deskripsi                                                    |
| ------ | --------------------------------- | ------------------------------------------------------------ |
| GET    | `/api/notifications`              | Daftar notifikasi (polling), query: `since`, `limit`, `type` |
| GET    | `/api/notifications/unread-count` | Jumlah belum dibaca                                          |
| PUT    | `/api/notifications/:id/read`     | Tandai satu dibaca                                           |
| PUT    | `/api/notifications/read-all`     | Tandai semua dibaca                                          |
