# 📅 Fitur 08 — Kalender View

## Ringkasan

Tampilan kalender yang menampilkan task dan event dalam format waktu. Berbagi **satu sumber data** yang sama dengan Kanban Board — perubahan di salah satu tampilan otomatis terefleksi di tampilan lain. Mendukung mode **bulanan**, **mingguan**, dan **harian** dengan interaksi drag, extend, dan klik untuk membuat task.

---

## Halaman Kalender

### Route: `/workspace/:id/tasks/calendar`

---

## Konten yang Ditampilkan

### Task

- Task yang memiliki **due date** ditampilkan pada tanggal batas waktunya
- Task yang memiliki **start date DAN due date** ditampilkan sebagai **bar rentang waktu** (dari start sampai due)
- Task yang hanya punya due date ditampilkan sebagai **dot/chip** pada tanggal tersebut
- Warna task:
  - Task **biasa** (tanpa event): warna berdasarkan **prioritas**
  - Task **terhubung event**: menggunakan **warna label event**

### Event

- Event ditampilkan sebagai **bar rentang waktu** dari tanggal mulai sampai selesai
- Menggunakan warna label event
- Ditampilkan di baris terpisah di atas task (area "all-day")
- Bisa diklik untuk melihat detail event

---

## Mode Tampilan

### Mode Bulanan

- Grid 7 kolom × 5-6 baris
- Setiap cell menampilkan tanggal dan daftar task/event
- Jika task terlalu banyak di satu hari: tampilkan 3 pertama + "+N lainnya" (klik untuk expand)
- Event multi-hari ditampilkan sebagai bar melintang antar cell
- Navigasi: `← Bulan Sebelum` | `Hari Ini` | `Bulan Berikut →`

### Mode Mingguan

- Grid 7 kolom dengan slot **waktu per jam** (24 jam vertical)
- Task tanpa waktu spesifik ditampilkan di area "all-day" di atas
- Navigasi: `← Minggu Sebelum` | `Hari Ini` | `Minggu Berikut →`

### Mode Harian

- Satu kolom dengan slot waktu per jam
- Detail lebih lengkap per task (judul, assignee, prioritas terlihat)
- Navigasi: `← Hari Sebelum` | `Hari Ini` | `Hari Berikut →`

---

## Interaksi

### Klik Tanggal Kosong → Buat Task Baru

- Klik area kosong pada sebuah tanggal
- Modal quick create task muncul
- **Due date otomatis terisi** dengan tanggal yang diklik
- Jika di mode mingguan/harian dan klik slot waktu: start time juga terisi

### Klik Task/Event → Buka Detail

- Klik task di kalender → buka panel detail task (side panel, sama seperti di Kanban)
- Klik event di kalender → navigasi ke halaman detail event

### Drag Task → Ubah Due Date

- Drag task (dot/chip) dari satu tanggal ke tanggal lain
- Due date otomatis terupdate
- Tampilan Kanban juga terupdate secara real-time

### Extend Task → Ubah Start/Due Date

- Untuk task yang ditampilkan sebagai **bar** (punya start + due date)
- Drag ujung kiri bar → ubah **start date**
- Drag ujung kanan bar → ubah **due date**
- Minimum range: 1 hari

### Toggle Filter

| Filter          | Deskripsi                      |
| --------------- | ------------------------------ |
| Tampilkan Semua | Task + Event (default)         |
| Per Event       | Hanya task dari event tertentu |
| Event Saja      | Hanya event, tanpa task        |
| Assignee        | Filter berdasarkan assignee    |
| Prioritas       | Filter berdasarkan prioritas   |
| Label           | Filter berdasarkan label/tag   |

---

## Warna & Visual

### Kode Warna

| Item                  | Warna                                     |
| --------------------- | ----------------------------------------- |
| Event                 | Warna label event (user-defined)          |
| Task terhubung event  | Warna label event (lebih muda/transparan) |
| Task biasa - Low      | Abu-abu / Biru muda                       |
| Task biasa - Medium   | Kuning / Oranye muda                      |
| Task biasa - High     | Oranye                                    |
| Task biasa - Critical | Merah                                     |
| Hari ini              | Background highlight (biru muda)          |
| Weekend               | Background sedikit lebih gelap            |

### Tooltip on Hover

Saat hover di atas task/event di kalender:

- Judul
- Assignee (avatar + nama)
- Due Date
- Status (kolom kanban)
- Prioritas

---

## Real-time Sync

Perubahan dari Kanban Board atau pengguna lain langsung tercermin di kalender:

| Perubahan                     | Efek di Kalender               |
| ----------------------------- | ------------------------------ |
| Task dipindah kolom di Kanban | Warna/status badge berubah     |
| Task dibuat                   | Muncul di tanggal due date-nya |
| Due date diubah               | Task berpindah ke tanggal baru |
| Task dihapus                  | Task hilang dari kalender      |
| Event dibuat/diubah           | Bar event muncul/berubah       |

---

## API Endpoints

| Method | Endpoint                       | Deskripsi                    |
| ------ | ------------------------------ | ---------------------------- |
| GET    | `/api/workspaces/:id/calendar` | Data kalender (task + event) |

### Query Parameters

| Parameter   | Tipe   | Deskripsi                       |
| ----------- | ------ | ------------------------------- |
| `startDate` | Date   | Tanggal awal range (required)   |
| `endDate`   | Date   | Tanggal akhir range (required)  |
| `eventId`   | string | Filter per event (opsional)     |
| `assignee`  | string | Filter per assignee (opsional)  |
| `priority`  | string | Filter per prioritas (opsional) |
| `type`      | string | `all` / `tasks` / `events`      |

### Response

```json
{
  "tasks": [
    {
      "_id": "...",
      "title": "...",
      "startDate": "...",
      "dueDate": "...",
      "priority": "...",
      "columnId": "...",
      "eventId": "...",
      "eventColor": "...",
      "assignees": [{ "_id": "...", "name": "...", "avatar": "..." }],
      "labels": [...]
    }
  ],
  "events": [
    {
      "_id": "...",
      "title": "...",
      "startDate": "...",
      "endDate": "...",
      "color": "...",
      "status": "..."
    }
  ]
}
```

---

## Library Rekomendasi

- **FullCalendar** (@fullcalendar/react) — atau
- **react-big-calendar** — library kalender React yang mature
- Kedua library mendukung: mode bulanan/mingguan/harian, drag & drop, resize event
