# Desain: Koordinasi Antar-Divisi Berbasis Task, Checklist Subtask, dan Catatan Pemateri

Tanggal: 22 Oktober 2026
Status: Disetujui untuk diimplementasikan
Cakupan: TODO bagian 4 dan 5 yang belum selesai

---

## 1. Keputusan Utama

1. **Koordinasi selalu berangkat dari Task.** Tidak ada objek permintaan koordinasi baru. Task adalah satu-satunya sumber pekerjaan dan status.
2. **Task dapat melibatkan lebih dari satu divisi.** Setiap divisi punya satu PIC.
3. **Subtask menjadi checklist koordinasi.** Setiap subtask dapat punya PIC, divisi, deadline, dan catatan.
4. **Penyelesaian subtask cukup satu centang oleh PIC.** Sistem mencatat siapa dan kapan. Tidak ada verifikasi dua tahap.
5. **Status task tetap manual.** Saat semua subtask selesai, progress menjadi 100% dan notifikasi dikirim; task tidak otomatis pindah kolom.
6. **Masukan pemateri berupa satu kotak catatan panjang di Overview Event.** Tidak ada status, voting, atau daftar terstruktur.
7. **`DivisionIssue` yang sudah ada tidak dihapus.** Tab kendala internal BM tetap berjalan. Koordinasi antar-divisi baru menggunakan Task.

---

## 2. Data Model

### 2.1 Task

Field baru:

```js
{
  // divisi utama / peminta. Field lama, tetap dipertahankan.
  divisionId: ObjectId | null,

  // semua divisi yang terlibat, termasuk divisionId
  divisionIds: [ObjectId],

  // satu PIC per divisi
  divisionPics: [
    {
      divisionId: ObjectId,
      userId: ObjectId
    }
  ],

  coordination: {
    constraints: String, // kendala
    helpNeeded: String,  // bantuan yang dibutuhkan
    followUp: String     // tindak lanjut
  }
}
```

Aturan:

- `divisionId` adalah divisi peminta/utama.
- `divisionIds` wajib memuat `divisionId` bila `divisionId` tidak null.
- `divisionPics` hanya boleh berisi divisi yang ada di `divisionIds`.
- `userId` pada `divisionPics` wajib anggota divisi tersebut dan anggota workspace.
- Satu divisi hanya boleh muncul sekali di `divisionPics`.
- Task tanpa divisi tetap diperbolehkan (`divisionId = null`, `divisionIds = []`).

### 2.2 Subtask

Field baru pada schema subtask yang sudah ada:

```js
{
  title: String,
  isCompleted: Boolean,
  assignee: ObjectId | null,   // sudah ada, akan ditampilkan di UI
  divisionId: ObjectId | null, // divisi PIC subtask
  dueDate: Date | null,
  notes: String,
  completedBy: ObjectId | null,
  completedAt: Date | null,
  order: Number
}
```

Aturan:

- `assignee` harus anggota workspace. Jika `divisionId` diisi, assignee harus anggota divisi tersebut.
- `completedBy` dan `completedAt` diisi server saat `isCompleted` berubah dari `false` ke `true`.
- Saat dicentang ulang menjadi `false`, `completedBy` dan `completedAt` dikosongkan.
- Jika subtask punya `assignee`, hanya assignee tersebut yang boleh mengubah `isCompleted`. Owner/admin dan pembuat task boleh mengoreksi.
- Jika subtask tidak punya `assignee`, anggota divisi terlibat boleh mencentang.

### 2.3 Event

Field baru:

```js
{
  speakerNotes: String // rich text JSON, sama seperti description
}
```

`speakerNotes` adalah satu kotak catatan panjang di Overview Event. Tidak ada model atau koleksi baru.

### 2.4 Kompatibilitas Data Lama

- Task lama yang hanya punya `divisionId` tetap valid.
- Query task harus mencocokkan `divisionId` **atau** `divisionIds`.
- Saat task lama disimpan, isi `divisionIds` otomatis disinkronkan dari `divisionId`.
- Tidak ada migrasi destruktif. `DivisionIssue` dan data BM tetap utuh.

---

## 3. Backend

### 3.1 Task Controller

Endpoint yang berubah:

- `POST /api/workspaces/:id/tasks`
- `PUT /api/workspaces/:id/tasks/:taskId`
- `GET /api/workspaces/:id/tasks`
- `GET /api/workspaces/:id/tasks/:taskId`

Perubahan:

1. Terima `divisionIds`, `divisionPics`, dan `coordination` pada create/update.
2. Validasi seluruh divisi dan PIC sebelum menyimpan.
3. Sinkronkan `divisionId` dan `divisionIds`.
4. Populate `divisionIds` dan `divisionPics` pada response.
5. Saat `eventId` diisi, divisi event menjadi divisi utama. Divisi lain tetap boleh ditambahkan sebagai divisi terkait. Aturan lama "divisi task harus sama dengan divisi event" diganti menjadi "divisi event wajib termasuk di `divisionIds`".
6. Saat `subtasks` diperbarui:
   - cocokkan berdasarkan `_id`
   - deteksi perubahan `isCompleted`
   - isi `completedBy`/`completedAt`
   - tolak perubahan status oleh user yang bukan PIC subtask (kecuali owner/admin/pembuat task)
   - kirim notifikasi jika ada subtask selesai
   - kirim notifikasi "semua checklist selesai" saat transisi terakhir ke 100%

### 3.2 Scope Divisi

Utility `divisionScope.js` ditambah fungsi khusus task:

```js
applyTaskDivisionScope({ filter, workspaceId, userId, role, divisionParam })
```

Filter mencocokkan:

- `divisionId` di daftar divisi yang diizinkan, atau
- `divisionIds` beririsan dengan daftar divisi yang diizinkan, atau
- `divisionId = null` dan `divisionIds` kosong untuk "Tanpa Divisi".

Dipakai oleh:

- daftar task
- kalender
- export task
- widget task bila memakai query task
- pengecekan akses detail task

Event tetap memakai scope divisi tunggal yang sudah ada.

### 3.3 Event Controller

- Terima dan simpan `speakerNotes` pada create/update.
- Validasi panjang maksimum agar tidak tidak terbatas.
- `speakerNotes` mengikuti hak edit event yang sudah ada.

### 3.4 Notifikasi

Gunakan `NotificationService` yang sudah ada.

Notifikasi dikirim ketika:

- PIC divisi ditambahkan ke task
- subtask di-assign ke user
- subtask selesai
- semua subtask selesai
- status task berubah

Tipe notifikasi yang dipakai: `assign_task` dan `task_update` agar sesuai preferensi user yang sudah ada.

### 3.5 Socket.io

Payload `task:created`, `task:updated`, dan `task:moved` otomatis membawa field baru. Client perlu memperbarui filter divisi agar memeriksa `divisionIds`, bukan hanya `divisionId`.

---

## 4. Frontend

### 4.1 Detail Task

Tambahkan bagian **Koordinasi**:

- Pemilih multi-divisi.
- Baris PIC per divisi.
- Textarea:
  - Kendala
  - Bantuan yang Dibutuhkan
  - Tindak Lanjut
- Ringkasan ketua divisi untuk setiap divisi terlibat.

Perubahan pada pemilih divisi lama:

- Ganti select tunggal menjadi multi-select.
- Jika task terkait event, divisi event ditampilkan sebagai divisi utama dan tidak bisa dihapus.
- Divisi lain bisa ditambahkan/dihapus.

### 4.2 Checklist Subtask

`SubtaskChecklist` dikembangkan:

- Checkbox tetap menjadi penanda selesai.
- Setiap baris menampilkan:
  - judul
  - avatar/nama PIC
  - chip divisi
  - deadline
  - catatan (tooltip atau baris kecil)
- Form tambah subtask mendukung:
  - judul
  - PIC (opsional)
  - divisi (opsional)
  - deadline (opsional)
  - catatan (opsional)
- Checkbox disabled untuk user yang bukan PIC.
- Item selesai tetap tampil dengan strikethrough dan masuk urutan bawah.
- Progress bar dan hitungan `x/y selesai` tetap dipertahankan.

### 4.3 Kartu Task

- Tampilkan chip semua divisi terlibat.
- Tampilkan avatar PIC per divisi (maksimal 3 + indikator `+n`).
- Progress subtask tetap tampil.

### 4.4 Event

- Tab **Task** mendapat filter/toggle **Koordinasi** untuk menampilkan task dengan lebih dari satu divisi.
- Task koordinasi menampilkan divisi peminta, divisi terkait, dan PIC masing-masing.
- Overview Event mendapat card **Masukan Pemateri / Narasumber**:
  - satu editor rich text
  - auto-save seperti deskripsi event
  - placeholder contoh: "Usulan pemateri, tema, kontak, dan catatan"
  - read-only untuk guest

### 4.5 Halaman BM

Tidak diubah pada iterasi ini. Tab Kendala & Koordinasi tetap memakai `DivisionIssue`. Tidak ada duplikasi data otomatis.

---

## 5. Hak Akses

- Task multi-divisi terlihat oleh anggota semua divisi yang terlibat dan owner/admin.
- Divisi yang tidak terlibat tidak dapat melihat task.
- Guest hanya dapat melihat.
- Hanya PIC subtask, pembuat task, atau owner/admin yang dapat mencentang subtask.
- Mengubah divisi/PIC task hanya untuk pembuat task, owner/admin, atau ketua divisi terkait.
- Catatan pemateri mengikuti hak edit event yang berlaku.

---

## 6. Edge Case

1. **Task lama tanpa `divisionIds`** → tetap tampil lewat `divisionId`.
2. **Divisi dihapus** → task tetap menyimpan ID; tampilan menampilkan "Divisi tidak tersedia". Perlu penanganan populate null.
3. **PIC dikeluarkan dari divisi** → PIC lama tetap tersimpan, tetapi validasi update berikutnya harus memilih PIC baru.
4. **Subtask tanpa PIC** → semua anggota divisi terlibat boleh mencentang.
5. **Task terkait event** → divisi event tidak bisa dihapus dari `divisionIds`.
6. **Semua subtask selesai** → hanya notifikasi; kolom task tidak berubah.
7. **Task tanpa subtask** → tidak ada progress, tidak ada notifikasi 100%.
8. **Dua divisi menunjuk user yang sama sebagai PIC** → diperbolehkan.

---

## 7. Verifikasi

Karena repo belum memiliki test runner, verifikasi dilakukan dengan:

1. `npm run lint` di folder `client`.
2. `npm run build` di folder `client`.
3. Menjalankan server dan client, lalu menguji manual:
   - membuat task dengan 2 divisi
   - menambah PIC tiap divisi
   - menambah subtask dengan PIC dan deadline
   - mencentang subtask sebagai PIC
   - memastikan user non-PIC tidak bisa mencentang
   - memastikan progress dan notifikasi berjalan
   - memastikan task muncul di board kedua divisi
   - mengisi catatan pemateri di Overview Event dan memuat ulang halaman

---

## 8. Di Luar Cakupan

- Filter bulan/tahun dan status pekerjaan.
- Ringkasan progres seluruh divisi di dashboard.
- Ringkasan laporan bulanan/tahunan lintas divisi.
- Voting atau status terstruktur untuk pemateri.
- Penghapusan atau migrasi `DivisionIssue`.
- Perubahan pada modul kas, infaq, dan jamaah.
