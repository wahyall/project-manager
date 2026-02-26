# 🏠 Fitur 21 — Dashboard

## Ringkasan

Halaman utama setelah user masuk ke workspace. Memberikan **ringkasan aktivitas** dan **overview** kondisi workspace secara cepat. Menampilkan widget-widget informasi yang relevan untuk user.

---

## Halaman Dashboard

### Route: `/workspace/:id`

---

## Layout

Dashboard menggunakan layout **grid** dengan beberapa section/widget:

### 1. Header Welcome

```
Selamat datang, [Nama User]! 👋
Workspace: [Nama Workspace]
```

### 2. Ringkasan Angka (Stats Cards)

Cards horizontal yang menampilkan metrik cepat:

| Metrik                  | Deskripsi                                                            | Ikon |
| ----------------------- | -------------------------------------------------------------------- | ---- |
| Task Aktif Saya         | Jumlah task yang di-assign ke user saat ini (non-Done, non-Archived) | 📋   |
| Task Selesai Minggu Ini | Jumlah task Done dalam 7 hari terakhir                               | ✅   |
| Task Overdue            | Jumlah task milik user yang due date-nya sudah lewat                 | ⚠️   |
| Event Berlangsung       | Jumlah event dengan status Ongoing                                   | 📅   |

### 3. Task Saya yang Harus Dikerjakan (My Tasks)

- List task yang di-assign ke user saat ini
- Diurutkan berdasarkan **due date terdekat** (overdue di atas, merah)
- Menampilkan: judul, due date, prioritas (strip warna), status (badge kolom), event (jika ada)
- Maks 10 task ditampilkan, tombol "Lihat Semua" → ke Kanban Board
- Klik task → buka detail task

### 4. Event Mendatang & Berlangsung

- List event dengan status **Upcoming** atau **Ongoing**
- Diurutkan berdasarkan tanggal mulai terdekat
- Menampilkan: judul, status badge, tanggal, warna label, jumlah task
- Maks 5 event ditampilkan, tombol "Lihat Semua Event" → ke daftar Event
- Klik event → buka detail event

### 5. Aktivitas Terkini

- Timeline 10 aktivitas terakhir di workspace
- Format sama dengan Activity Log (avatar, nama, aksi, waktu relatif)
- Tombol "Lihat Semua" → ke halaman Activity Log
- Filter implisit: hanya menampilkan aktivitas yang relevan (task milik user, event yang diikuti, mention)

### 6. Member Online

- Compact list member yang sedang online
- Menampilkan avatar stack (maks 10) + "+N online"
- Klik → buka daftar member

---

## Responsivitas

### Desktop (> 1024px)

```
┌──────────────────────────────────────────────┐
│ Header Welcome                               │
├─────────┬─────────┬─────────┬────────────────│
│ Stat 1  │ Stat 2  │ Stat 3  │ Stat 4        │
├──────────────────────┬───────────────────────│
│ My Tasks             │ Event Mendatang       │
│ (daftar task)        │ (daftar event)        │
│                      │                       │
├──────────────────────┴───────────────────────│
│ Aktivitas Terkini              Member Online │
└──────────────────────────────────────────────┘
```

### Mobile (≤ 768px)

Semua section stack vertikal:

- Stats cards → horizontal scroll (2 per baris)
- My Tasks → full-width list
- Event → full-width list
- Aktivitas → full-width timeline
- Member Online → avatar row

---

## API Endpoints

| Method | Endpoint                        | Deskripsi                  |
| ------ | ------------------------------- | -------------------------- |
| GET    | `/api/workspaces/:id/dashboard` | Data dashboard teragregasi |

### Response

```json
{
  "stats": {
    "activeTasks": 12,
    "completedThisWeek": 5,
    "overdueTasks": 3,
    "ongoingEvents": 2
  },
  "myTasks": [
    {
      "_id": "...",
      "title": "...",
      "dueDate": "...",
      "priority": "...",
      "columnName": "...",
      "eventTitle": "..."
    }
  ],
  "upcomingEvents": [...],
  "recentActivity": [...],
  "onlineMembers": [
    { "_id": "...", "name": "...", "avatar": "..." }
  ]
}
```

---

## Auto Refresh

- Dashboard melakukan **polling** setiap **60 detik** untuk memperbarui data
- Atau refresh saat user kembali ke tab (visibility change event)
