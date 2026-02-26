# 👤 Fitur 03 — Kelola User & Profil

## Ringkasan

Sistem pengelolaan user dengan profil **global** (satu profil untuk semua workspace). Mencakup halaman daftar member workspace, profil user, dan pengaturan akun pribadi. Status online/offline ditampilkan secara **real-time via WebSocket**.

---

## Halaman Daftar Member Workspace

### Route: `/workspace/:id/members`

### Tampilan Tabel

| Kolom              | Deskripsi                                                  |
| ------------------ | ---------------------------------------------------------- |
| Avatar + Nama      | Foto profil dan nama lengkap                               |
| Email              | Email user                                                 |
| Role               | Badge: Owner / Admin / Member / Guest                      |
| Status Online      | Titik hijau (online) / abu-abu (offline), real-time        |
| Bergabung Sejak    | Format: "dd MMM yyyy"                                      |
| Aktivitas Terakhir | Ringkasan aksi terakhir. Misal: "Edit task 'X' 2 jam lalu" |

### Filter & Pencarian

- Cari berdasarkan nama atau email
- Filter berdasarkan role
- Filter berdasarkan status online/offline

---

## Halaman Profil User

### Route: `/workspace/:id/members/:userId`

Bisa diakses oleh semua member dalam workspace yang sama. Bersifat **read-only** (kecuali profil sendiri, redirect ke Pengaturan Akun).

### Informasi yang Ditampilkan

- **Avatar** dan **nama lengkap**
- **Email**
- **Role** di workspace saat ini
- **Nomor WhatsApp** (hanya tampil sebagai "Terdaftar" / "Belum terdaftar", nomor tidak ditampilkan ke user lain)
- **Daftar workspace yang diikuti bersama** (workspace yang user profil dan user yang melihat sama-sama tergabung)

### Ringkasan Kontribusi (di workspace saat ini)

| Metrik          | Deskripsi                         |
| --------------- | --------------------------------- |
| Task selesai    | Jumlah task dengan status "Done"  |
| Task aktif      | Jumlah task yang sedang di-assign |
| Event diikuti   | Jumlah event yang jadi peserta    |
| Komentar dibuat | Jumlah komentar yang ditulis      |

### Riwayat Aktivitas

- Timeline aktivitas user tersebut **di workspace saat ini** saja
- Menampilkan 20 aktivitas terakhir, dengan tombol "Muat lebih banyak"
- Format sama dengan Activity Log global

---

## Halaman Pengaturan Akun

### Route: `/settings/account`

### Akses: Setiap user untuk akun pribadinya

### Section: Informasi Profil

| Field          | Tipe   | Required | Keterangan                    |
| -------------- | ------ | -------- | ----------------------------- |
| Nama Lengkap   | Text   | ✅       | Maks 100 karakter             |
| Foto Profil    | Upload | ❌       | Gambar maks 1MB, JPG/PNG      |
| Nomor WhatsApp | Text   | ❌       | Format internasional (+62...) |

### Section: Ubah Password

| Field               | Tipe     | Required |
| ------------------- | -------- | -------- |
| Password Lama       | Password | ✅       |
| Password Baru       | Password | ✅       |
| Konfirmasi Password | Password | ✅       |

### Section: Preferensi Notifikasi

Konfigurasi **per tipe notifikasi**, terpisah antara in-app dan WhatsApp:

| Tipe Notifikasi | In-App (toggle) | WhatsApp (toggle) |
| --------------- | :-------------: | :---------------: |
| Mention         |  ✅ default on  |   ✅ default on   |
| Assign Task     |  ✅ default on  |   ✅ default on   |
| Due Date Dekat  |  ✅ default on  |   ✅ default on   |
| Komentar Baru   |  ✅ default on  |  ❌ default off   |
| Member Baru     |  ✅ default on  |  ❌ default off   |
| Event Dimulai   |  ✅ default on  |   ✅ default on   |
| Update Task     |  ✅ default on  |  ❌ default off   |

### Section: Pengingat Due Date

- Pilih waktu pengingat: **Hari-H**, **H-1**, **H-3** (checkbox, bisa pilih lebih dari satu)

### Section: Onboarding

- Tombol **"Tampilkan Tur Ulang"** — reset onboarding untuk workspace aktif

---

## Halaman Undang Member

### Route: `/workspace/:id/settings/invite`

(Sudah dibahas detail di dokumen **02-kelola-workspace.md**, section Undang Member)

---

## Status Online/Offline

### Mekanisme

- Menggunakan **Socket.io** untuk tracking presence
- Saat user terhubung ke WebSocket, status berubah menjadi **online**
- Saat koneksi terputus, status berubah menjadi **offline**
- **Grace period 30 detik**: jika user reconnect dalam 30 detik (misal refresh halaman), status tetap online
- Heartbeat setiap **30 detik** untuk memastikan koneksi masih aktif

### Data Presence

```json
{
  "userId": "ObjectId",
  "workspaceId": "ObjectId",
  "socketId": "string",
  "lastSeen": "Date",
  "isOnline": "boolean"
}
```

- Disimpan di **Redis** (atau in-memory jika self-hosted sederhana) untuk performa
- Perubahan status di-broadcast ke semua member workspace via Socket.io event

---

## Struktur Data

### Collection: `users` (Extend dari doc 01)

```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string (unique)",
  "password": "string (hashed)",
  "avatar": "string (URL via Puter.js, nullable)",
  "whatsappNumber": "string (nullable)",
  "notificationPreferences": {
    "mention": { "inApp": true, "whatsapp": true },
    "assignTask": { "inApp": true, "whatsapp": true },
    "dueDate": { "inApp": true, "whatsapp": true },
    "newComment": { "inApp": true, "whatsapp": false },
    "newMember": { "inApp": true, "whatsapp": false },
    "eventStart": { "inApp": true, "whatsapp": true },
    "taskUpdate": { "inApp": true, "whatsapp": false }
  },
  "dueDateReminders": ["H", "H-1", "H-3"],
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

## API Endpoints

| Method | Endpoint                                      | Deskripsi                    | Akses   |
| ------ | --------------------------------------------- | ---------------------------- | ------- |
| GET    | `/api/users/me`                               | Profil user saat ini         | Auth    |
| PUT    | `/api/users/me`                               | Update profil                | Auth    |
| PUT    | `/api/users/me/password`                      | Ubah password                | Auth    |
| PUT    | `/api/users/me/avatar`                        | Upload/update avatar         | Auth    |
| PUT    | `/api/users/me/notifications`                 | Update preferensi notifikasi | Auth    |
| GET    | `/api/workspaces/:id/members/:userId/profile` | Profil user di workspace     | Member+ |
| GET    | `/api/workspaces/:id/members/:userId/stats`   | Statistik kontribusi         | Member+ |

---

## Socket.io Events (Presence)

| Event                | Direction       | Payload                             |
| -------------------- | --------------- | ----------------------------------- |
| `user:online`        | Server → All    | `{ userId, workspaceId }`           |
| `user:offline`       | Server → All    | `{ userId, workspaceId, lastSeen }` |
| `presence:heartbeat` | Client → Server | `{ workspaceId }`                   |
| `presence:members`   | Server → Client | `[{ userId, isOnline, lastSeen }]`  |
