# Spek Desain: Bank Ide

- **Tanggal:** 2026-09-22
- **Status:** Disetujui, siap masuk rencana implementasi
- **Cakupan:** Entity `Idea` baru, relasi many-to-many ke `Event`, label, komentar, vote

---

## 1. Latar Belakang dan Tujuan

Workspace saat ini punya `Brainstorming` (kanvas bebas berisi widget) sebagai satu-satunya tempat menampung gagasan. Kanvas bagus untuk berpikir, tapi buruk untuk menyimpan: ide tenggelam di dalam board, tidak bisa dicari, tidak punya status, dan tidak punya jejak apakah pernah diwujudkan.

**Bank Ide** menutup celah itu. Ia adalah daftar terstruktur berisi usulan anggota workspace, lengkap dengan dukungan (vote), diskusi, dan tautan ke Event yang merealisasikannya.

### Pembagian peran dengan Brainstorming

| | Brainstorming | Bank Ide |
|---|---|---|
| Bentuk | Kanvas bebas, widget | Daftar terstruktur |
| Tujuan | Berpikir bersama | Menyimpan dan mewujudkan |
| Umur | Sesi, lalu ditinggal | Jangka panjang |
| Pencarian | Sulit | Filter status, label, kata kunci |

Copy pada kedua halaman harus menegaskan perbedaan ini. Tanpa itu, anggota tim akan bingung harus menulis di mana.

### Tujuan yang terukur

1. Anggota bisa menulis ide dalam waktu kurang dari 30 detik (judul + deskripsi, sisanya opsional).
2. Ide yang sudah diwujudkan bisa ditelusuri dua arah: dari ide ke Event, dan dari Event ke ide.
3. Status ide tidak pernah basi, karena status `direalisasi` ditentukan sistem, bukan ingatan manusia.

### Yang sengaja tidak dikerjakan (YAGNI)

- Lampiran berkas pada ide.
- Alur persetujuan berjenjang.
- Ide lintas workspace atau ide pribadi. Bank Ide sepenuhnya milik satu workspace, sama seperti seluruh entity lain di aplikasi ini.
- Downvote. Hanya ada dukungan, tidak ada penolakan bersuara.
- Tautan "Simpan ke Bank Ide" dari widget Brainstorming. Dicatat sebagai kandidat lanjutan.

---

## 2. Model Data

### 2.1 Baru: `server/src/models/Idea.js`

| Field | Tipe | Aturan |
|---|---|---|
| `workspaceId` | ObjectId, ref `Workspace` | wajib |
| `title` | String | wajib, trim, maksimal 120 karakter |
| `description` | String | default `""`. Berisi JSON BlockNote, format sama persis dengan `Event.description` |
| `status` | String enum | `baru`, `dipertimbangkan`, `direalisasi`, `diarsipkan`. Default `baru` |
| `statusBeforeRealized` | String enum | `baru`, `dipertimbangkan`, `diarsipkan`, atau `null`. Default `null` |
| `labels` | [ObjectId, ref `WorkspaceLabel`] | default `[]` |
| `votes` | [ObjectId, ref `User`] | default `[]`, satu user maksimal satu kali |
| `createdBy` | ObjectId, ref `User` | wajib |
| `isDeleted` | Boolean | default `false` |
| `deletedAt` | Date | default `null` |
| `createdAt`, `updatedAt` | Date | via `timestamps: true` |

**Index**

```js
ideaSchema.index({ workspaceId: 1, isDeleted: 1 });
ideaSchema.index({ workspaceId: 1, status: 1 });
ideaSchema.index({ labels: 1 });
ideaSchema.index({ createdBy: 1 });
```

**Hook soft delete**, disalin dari pola `Event.js`:

```js
ideaSchema.pre(/^find/, function (next) {
  if (this.getQuery().isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});
```

**Keputusan: `voteCount` tidak disimpan.** Jumlah dukungan dihitung dari `votes.length` di controller. Counter tersimpan bisa melenceng dari data sebenarnya kalau ada operasi yang gagal separuh jalan, dan array `votes` juga dipakai untuk menentukan `hasVoted`. Satu sumber data, tidak ada yang perlu direkonsiliasi.

### 2.2 Diubah: `server/src/models/Event.js`

Tambah field:

```js
ideas: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Idea",
  },
],
```

Tambah index: `eventSchema.index({ ideas: 1 });`

Index ini wajib, bukan optimasi opsional. Service sinkronisasi status menghitung Event per ide pada setiap penyimpanan Event, dan tanpa index itu berarti collection scan.

**Keputusan: relasi disimpan di `Event`, bukan di `Idea`.** Form Event adalah satu-satunya tempat relasi ini disunting, jadi sisi itu yang memegang data. Halaman ide melakukan query balik. Kalau data disimpan di kedua sisi, keduanya akan berselisih cepat atau lambat.

### 2.3 Diubah: lima enum yang harus dilebarkan

Ini bagian yang paling mudah terlewat. Semuanya akan menolak dokumen pada level validasi Mongoose kalau tidak diperbarui, dan sebagian gagal secara diam-diam karena pemanggilnya fire-and-forget.

| Berkas | Perubahan |
|---|---|
| `server/src/models/Comment.js` | `targetType` enum `+= "idea"` |
| `server/src/models/ActivityLog.js` | `action` enum `+= "idea.created", "idea.updated", "idea.status_changed", "idea.deleted"`; `targetType` enum `+= "idea"` |
| `server/src/models/Notification.js` | `targetType` enum `+= "idea"` |
| `server/src/models/Embedding.js` | `sourceType` enum `+= "idea"` |

`Notification.targetType` diperlukan sejak Tahap 1, karena mention di deskripsi ide sudah aktif di tahap itu. `ActivityLogService.log` dan `NotificationService` keduanya dipanggil tanpa `await` di controller yang ada, jadi kegagalan enum tidak akan memunculkan galat ke user. Itu sebabnya enum harus dilebarkan di task yang sama dengan pembuatan model, bukan belakangan.

**Keputusan: tidak ada `idea.voted` di activity log.** Vote itu aksi murah dan sering. Mencatatnya akan menenggelamkan kejadian penting di linimasa aktivitas. Perubahan jumlah vote tetap tersiar lewat Socket.io, hanya tidak diarsipkan.

---

## 3. Aturan Status Otomatis

### 3.1 Perilaku

Saat sebuah ide ditautkan ke Event mana pun, statusnya naik menjadi `direalisasi`. Saat tautan Event terakhirnya dilepas, statusnya turun kembali ke status sebelum naik.

```
Event disimpan dengan ideas: [A, B]
  Ide A: baru            -> direalisasi   (statusBeforeRealized = "baru")
  Ide B: dipertimbangkan -> direalisasi   (statusBeforeRealized = "dipertimbangkan")

Tautan Event terakhir pada Ide A dilepas
  Ide A: direalisasi -> baru              (statusBeforeRealized = null)
```

### 3.2 Implementasi

Satu sumber kebenaran: `server/src/services/ideaRealization.service.js`.

```js
syncRealizationStatus({ ideaIds, workspaceId, actorId })
```

Untuk setiap `ideaId`:

1. Hitung `n` = jumlah Event aktif di workspace tersebut yang memuat `ideaId` dalam array `ideas`.
2. Jika `n > 0` dan `status !== "direalisasi"`: simpan `status` sekarang ke `statusBeforeRealized`, set `status = "direalisasi"`.
3. Jika `n === 0` dan `status === "direalisasi"`: set `status = statusBeforeRealized ?? "baru"`, lalu set `statusBeforeRealized = null`.
4. Jika status berubah: emit `idea:updated` ke room `workspace:${workspaceId}`, dan catat `idea.status_changed` di activity log dengan `actorId`.

Fungsi ini bersifat idempoten. Memanggilnya dua kali dengan kondisi yang sama tidak mengubah apa pun pada panggilan kedua.

### 3.3 Titik pemanggilan

Hanya empat, dan tidak boleh ada yang lain:

| Pemanggil | `ideaIds` yang dikirim |
|---|---|
| `createEvent` | `ideas` dari event baru |
| `updateEvent` | gabungan `ideas` lama dan `ideas` baru |
| `deleteEvent` | `ideas` milik event yang dihapus |
| `deleteIdea` | ide itu sendiri, dipanggil setelah `$pull` dari semua Event |

Pada `updateEvent`, gabungan lama dan baru itu penting. Kalau hanya `ideas` baru yang disinkronkan, ide yang baru saja dilepas tautannya akan tertinggal berstatus `direalisasi` selamanya.

### 3.4 Penjaga perubahan status manual

Di `updateIdea`, jika request memuat `status` sementara ide masih punya Event tertaut, tolak dengan:

```
400  "Status ide ini ditentukan oleh Event terkait"
```

Di antarmuka, dropdown status dinonaktifkan selama ide punya Event tertaut, dengan tooltip berisi jumlah Event. Tanpa penjaga ini, perubahan manual dan otomatis akan saling menimpa secara diam-diam, dan user akan melihat status berubah sendiri tanpa penjelasan.

Konsekuensi yang diterima: selama masih ada Event tertaut, ide tidak bisa diarsipkan. Untuk mengarsipkan, lepas dulu tautannya. Ini dianggap benar: ide yang sedang diwujudkan memang belum layak diarsipkan.

### 3.5 Peredam kejutan

Setelah menyimpan Event yang mengubah status ide, klien menampilkan toast:

```
Ide "Festival literasi" ditandai direalisasi
```

---

## 4. API

Mount baru di `server/src/app.js`, diletakkan bersama route workspace lainnya:

```js
const ideaRoutes = require("./routes/idea.routes");
app.use("/api/workspaces/:id/ideas", ideaRoutes);
```

Berkas baru: `server/src/routes/idea.routes.js` dan `server/src/controllers/idea.controller.js`, mengikuti struktur `event.routes.js` dan `event.controller.js`.

### 4.1 Daftar endpoint

| Method | Path | Izin | Keterangan |
|---|---|---|---|
| GET | `/` | semua member | Daftar ide, dengan filter dan paginasi |
| POST | `/` | owner, admin, member | Buat ide |
| GET | `/:ideaId` | semua member | Detail ide beserta Event terkait |
| PUT | `/:ideaId` | pembuat, atau admin/owner | Ubah ide |
| DELETE | `/:ideaId` | pembuat, atau admin/owner | Soft delete |
| POST | `/:ideaId/vote` | semua member | Beri dukungan |
| DELETE | `/:ideaId/vote` | semua member | Tarik dukungan |

Aturan izin ini cermin persis dari `Event`: membuat terbuka untuk semua peran yang bisa berkontribusi, sedangkan mengubah dan menghapus dibatasi pembuat atau pengelola workspace.

### 4.2 GET `/` - parameter query

| Parameter | Bentuk | Default |
|---|---|---|
| `status` | dipisah koma, contoh `baru,dipertimbangkan` | semua |
| `labels` | ObjectId dipisah koma | semua |
| `keyword` | regex case-insensitive pada `title` | kosong |
| `createdBy` | ObjectId | semua |
| `sortBy` | `createdAt`, `voteCount`, `title` | `createdAt` |
| `sortOrder` | `asc`, `desc` | `desc` |
| `page`, `limit` | angka, `limit` maksimal 100 | 1, 50 |

`sortBy=voteCount` memerlukan aggregation pipeline dengan `$addFields: { voteCount: { $size: "$votes" } }`, karena field itu tidak tersimpan. Jalur sort lainnya memakai `find` biasa.

### 4.3 Bentuk balikan tiap item daftar

```json
{
  "_id": "...",
  "title": "Festival literasi kampus",
  "description": "{...blocknote json...}",
  "status": "direalisasi",
  "labels": [{ "_id": "...", "name": "Acara", "color": "#F59E0B" }],
  "createdBy": { "_id": "...", "name": "...", "email": "...", "avatar": "..." },
  "voteCount": 14,
  "hasVoted": true,
  "eventCount": 2,
  "commentCount": 3,
  "createdAt": "...",
  "updatedAt": "..."
}
```

`hasVoted` dihitung terhadap `req.user.id`. `eventCount` dan `commentCount` diambil lewat agregasi terpisah lalu dipetakan ke tiap ide, mengikuti pola `taskCount` di `listEvents`. Array `votes` mentah tidak pernah dikirim ke klien; hanya `voteCount` dan `hasVoted`.

Bentuk di atas adalah keadaan akhir setelah ketiga tahap. Pada Tahap 1, `labels` selalu array kosong, `eventCount` dan `commentCount` selalu `0`. Field-nya tetap dikirim sejak awal supaya klien tidak perlu diubah lagi di tahap berikutnya.

### 4.4 GET `/:ideaId` - tambahan

Selain field di atas, balikan memuat:

```json
"relatedEvents": [
  {
    "_id": "...",
    "title": "...",
    "startDate": "...",
    "endDate": "...",
    "status": "ongoing",
    "color": "#8B5CF6"
  }
]
```

Diambil dengan `Event.find({ workspaceId, ideas: ideaId })`.

### 4.5 Endpoint vote

`POST /:ideaId/vote` menambahkan `req.user.id` ke `votes` dengan `$addToSet`. `DELETE` menghapusnya dengan `$pull`. Keduanya idempoten dan membalas `{ voteCount, hasVoted }`.

Memakai `$addToSet` dan bukan `$push` supaya klik ganda atau race condition tidak pernah menghasilkan suara dobel.

### 4.6 Perubahan pada `event.controller.js`

`createEvent` dan `updateEvent` menerima `ideas` berupa array ObjectId di body.

Pada `updateEvent`, `ideas` mengikuti pola field lain di controller itu: bila `undefined`, relasi dibiarkan apa adanya dan `syncRealizationStatus` tidak dipanggil. Array kosong berarti perintah melepas semua tautan, dan itu tetap memicu sinkronisasi. Pembedaan ini penting karena tab overview Event menyimpan per field, jadi menyunting judul saja tidak boleh menghapus relasi ide.

Validasi sebelum menyimpan:

1. Semua id berbentuk ObjectId valid.
2. Semua ide benar-benar milik `workspace._id` dan belum terhapus. Jika ada yang tidak lolos, tolak `400 "Ada ide yang tidak ditemukan di workspace ini"`.
3. Duplikat dibersihkan.

Setelah `event.save()` berhasil, panggil `syncRealizationStatus`. Panggilan ini ditunggu (bukan fire-and-forget), karena balikan Event ke klien harus sudah mencerminkan status ide yang benar.

`populateEvent` diperluas dengan `.populate("ideas", "title status")` supaya chip backlink bisa langsung dirender tanpa request kedua.

`deleteEvent` memanggil `syncRealizationStatus` dengan `ideas` milik event tersebut, setelah soft delete tersimpan.

### 4.7 Event Socket.io

Semua disiarkan ke room `workspace:${workspaceId}`, mengikuti pola `emitEventEvent` di `event.controller.js`.

| Nama | Payload |
|---|---|
| `idea:created` | `{ idea, userId }` |
| `idea:updated` | `{ idea, userId }` |
| `idea:deleted` | `{ ideaId, userId }` |
| `idea:voted` | `{ ideaId, voteCount, userId }` |

`idea:voted` dipisah dari `idea:updated` supaya klien bisa memperbarui angka dukungan tanpa menyusun ulang seluruh kartu.

---

## 5. Klien

### 5.1 Berkas baru

```
client/hooks/use-ideas.js                            cermin use-events.js
client/app/workspace/[id]/ideas/page.js              halaman daftar
client/app/workspace/[id]/ideas/[ideaId]/page.js     halaman detail
client/components/ideas/idea-card.js
client/components/ideas/idea-picker.js               multi-select, dipakai 2 form Event
client/components/ideas/idea-status-badge.js
client/components/ideas/idea-vote-button.js
client/components/ideas/idea-filter-toolbar.js
client/components/ideas/create-idea-dialog.js
client/components/ideas/delete-idea-dialog.js
client/components/ideas/idea-overview-tab.js
client/components/ideas/idea-events-tab.js
```

### 5.2 Berkas diubah

| Berkas | Perubahan |
|---|---|
| `client/components/app-sidebar.js` | Item nav "Bank Ide" di `NAV_MAIN`, di bawah "Event" |
| `client/components/bottom-nav.js` | Navigasi mobile |
| `client/components/more-drawer.js` | Navigasi mobile, laci tambahan |
| `client/components/events/create-event-dialog.js` | Field `IdeaPicker` |
| `client/components/events/event-overview-tab.js` | Field `IdeaPicker` inline, plus chip backlink |
| `client/components/activity/activity-timeline.js` | Label tampilan untuk aksi `idea.*` |

### 5.3 Halaman detail, bukan drawer

Halaman detail berdiri sendiri di `/workspace/[id]/ideas/[ideaId]` adalah keharusan teknis, bukan pilihan gaya. Notifikasi mention dan notifikasi komentar menyimpan field `url` yang harus bisa dibuka langsung. `CommentThread` juga mengandaikan targetnya punya alamat sendiri.

### 5.4 Ikon navigasi

`Lightbulb` sudah dipakai Brainstorming. Bank Ide memakai `Sprout`, mengikuti gagasan ide yang tumbuh menjadi Event. Tetap dari `lucide-react`, karena seluruh proyek ini sudah memakainya secara konsisten.

---

## 6. Bentuk Tampilan

Seluruh tampilan mengikuti bahasa desain yang sudah ada: shadcn/ui, Tailwind, aksen violet, copy Bahasa Indonesia, mode terang dan gelap lewat varian `dark:`. Tidak ada pustaka UI baru, tidak ada palet baru.

Bagian ini menggambarkan keadaan akhir setelah ketiga tahap. Chip label dan tab Diskusi baru muncul di Tahap 3, tab Event Terkait di Tahap 2.

### 6.1 Halaman daftar

```
Bank Ide                                        [ Tulis Ide ]
Kumpulkan usulan tim sebelum jadi rencana

[ 12 Baru ] [ 5 Dipertimbangkan ] [ 8 Direalisasi ] [ 3 Diarsipkan ]

[ cari ide... ] [ Status v ] [ Label v ]        [ Terpopuler v ]

+-----------------+  +-----------------+  +-----------------+
| ^ 14            |  | ^  3            |  | ^  9            |
| Judul ide       |  | Judul ide       |  | Judul ide       |
| ringkasan dua   |  | ringkasan dua   |  | ringkasan dua   |
| baris...        |  | baris...        |  | baris...        |
| [Acara][Riset]  |  | [Internal]      |  | [Acara]         |
| (o) Rani   3 ko |  | (o) Bagas       |  | (o) Yuni   7 ko |
|            2 ev |  |                 |  |            1 ev |
+-----------------+  +-----------------+  +-----------------+
```

Susunan: grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`, sama persis dengan halaman Event.

Tombol vote berada di kiri atas kartu, tersusun vertikal dengan angka di bawah panah. Status ditampilkan sebagai garis warna tipis di tepi atas kartu, bukan sebagai badge. Alasannya: pada halaman ini yang paling ingin dilihat orang adalah dukungan, bukan status. Badge status akan bersaing dengan angka vote memperebutkan perhatian.

Baris statistik memakai empat pil, meneruskan pola tiga pil di halaman Event. Warna: `baru` biru, `dipertimbangkan` amber, `direalisasi` emerald, `diarsipkan` abu.

Keadaan kosong, skeleton pemuatan, dan tampilan galat menyalin struktur dari `client/app/workspace/[id]/events/page.js`, termasuk pembedaan antara "belum ada ide" dan "tidak ada ide yang cocok dengan filter".

### 6.2 Halaman detail

Pola diambil dari halaman detail Event: judul yang bisa disunting inline, deskripsi BlockNote dengan auto-save, dropdown aksi di kanan atas.

```
<  Bank Ide

Festival literasi kampus                    [^ 14]  [ ... ]
[direalisasi]  [Acara] [Riset]

  Ringkasan  |  Event Terkait (2)  |  Diskusi (3)
-------------------------------------------------------
```

- **Ringkasan**: deskripsi BlockNote yang bisa disunting, pemilih label, dropdown status (nonaktif bila ada Event tertaut), meta pengusul dan tanggal.
- **Event Terkait**: daftar Event yang menautkan ide ini, tiap baris menampilkan warna, judul, rentang tanggal, dan status Event, menautkan ke halaman Event. Keadaan kosong: "Belum ada Event yang mewujudkan ide ini."
- **Diskusi**: `<CommentThread workspaceId targetType="idea" targetId={ideaId} currentUserId members />`. Komponen ini sudah sepenuhnya generik dan tidak perlu diubah.

### 6.3 Field baru di form Event

Diletakkan setelah baris Warna dan Status, pada `create-event-dialog.js` dan `event-overview-tab.js`.

```
Realisasi dari Ide                              (opsional)
+------------------------------------------------------+
| [x Festival literasi]  [x Podcast alumni]          v |
+------------------------------------------------------+
Event ini menjadi wujud nyata dari ide yang dipilih
```

Komponen `IdeaPicker`: `Popover` berisi `Command` yang bisa dicari, tiap baris menampilkan judul ide dan jumlah dukungan. Ide terpilih ditampilkan sebagai chip yang bisa dilepas. Ide berstatus `diarsipkan` disembunyikan dari daftar pilihan.

Komponen ini sepenuhnya terkendali lewat props `value` dan `onChange`, tanpa mengambil data sendiri, supaya bisa dipakai di dialog buat (state lokal) dan di tab overview (auto-save per field) tanpa cabang logika di dalamnya.

### 6.4 Chip backlink di detail Event

Pada tab Ringkasan Event, di bawah deskripsi:

```
Realisasi dari
[ Festival literasi ]  [ Podcast alumni ]
```

Tiap chip menautkan ke halaman ide terkait. Bagian ini disembunyikan seluruhnya bila `ideas` kosong.

### 6.5 Perilaku mobile

Grid kartu runtuh ke satu kolom di bawah 640px. Tab pada halaman detail berubah jadi bisa digeser horizontal, mengikuti pola halaman detail Event. `IdeaPicker` memakai lebar penuh pada layar sempit.

---

## 7. Notifikasi, Aktivitas, dan AI

### 7.1 Komentar

Di `server/src/controllers/comment.controller.js`, tambah cabang untuk `targetType === "idea"`:

- URL notifikasi: `/workspace/${workspaceId}/ideas/${targetId}`
- Konteks mention: `"komentar ide"`
- Penerima notifikasi komentar baru: pembuat ide, kecuali dia sendiri yang berkomentar.

Penerima sengaja dibatasi pembuat ide saja. Memberi notifikasi ke seluruh pemberi vote akan membuat ide populer menghasilkan puluhan notifikasi per komentar.

### 7.2 Mention di deskripsi ide

`createIdea` dan `updateIdea` mengurai `description` sebagai JSON dan mengirim notifikasi mention, menyalin logika yang sudah ada di `createEvent` dan `updateEvent`, termasuk pembandingan mention lama dan baru saat update supaya orang tidak dinotifikasi dua kali.

### 7.3 Tidak ada notifikasi saat ide dibuat

Ide baru tidak menyiarkan notifikasi ke anggota workspace. Bank Ide dirancang supaya orang bebas menulis tanpa beban mengganggu semua orang. Kalau tiap ide memicu notifikasi, dalam sepekan orang akan mematikan notifikasinya, dan notifikasi yang penting ikut hilang.

### 7.4 Activity log

Aksi yang dicatat: `idea.created`, `idea.updated`, `idea.status_changed`, `idea.deleted`. Ditambah ke `ACTION_CONFIG` di `client/components/activity/activity-timeline.js` dengan ikon dan warna sendiri.

### 7.5 Embedding dan AI Chat

Di `server/src/services/embedding.service.js`:

- Tambah `_buildIdeaContent(idea)` yang merangkai judul, status, jumlah dukungan, nama label, dan teks deskripsi.
- Ekspor fungsi tersebut, mengikuti pola `_buildEventContent`.
- Panggil `upsert` dengan `sourceType: "idea"` dan `sourceUrl: /workspace/${workspaceId}/ideas/${ideaId}` pada create dan update, bergaya fire-and-forget seperti entity lain.
- Panggil `remove` saat ide dihapus.
- Tambah satu blok iterasi ide di `server/src/jobs/embeddingReindex.job.js` supaya ide lama ikut terindeks saat reindex penuh.

Hasilnya, ide bisa ditanya lewat AI Chat yang sudah ada.

---

## 8. Izin Akses

| Aksi | Siapa |
|---|---|
| Lihat daftar dan detail | semua anggota workspace |
| Buat ide | owner, admin, member |
| Ubah ide | pembuat, atau admin/owner |
| Hapus ide | pembuat, atau admin/owner |
| Beri dan tarik dukungan | semua anggota workspace |
| Ubah status manual | sama seperti ubah ide, dan hanya bila tidak ada Event tertaut |

Memakai middleware `workspaceMember()` yang sudah ada, dengan pola pengecekan kepemilikan yang sama seperti `deleteEvent`.

---

## 9. Urutan Pengerjaan

Tiga tahap, masing-masing utuh dan bisa langsung dipakai.

### Tahap 1: Inti Bank Ide

Model `Idea`. Enum `ActivityLog` dan `Embedding` dilebarkan. Controller dan route CRUD plus vote. Hook `use-ideas`. Halaman daftar dan detail dengan tab Ringkasan saja. Item navigasi. Activity log. Sinkronisasi embedding.

Setelah tahap ini, Bank Ide berfungsi penuh dan berdiri sendiri.

### Tahap 2: Relasi Event

Field `ideas` pada `Event` beserta index. Validasi di `event.controller.js`. Service `ideaRealization`. Komponen `IdeaPicker` dan pemasangannya di dua form Event. Tab Event Terkait. Chip backlink di detail Event. Penjaga perubahan status manual.

Setelah tahap ini, permintaan asli sudah terpenuhi sepenuhnya.

### Tahap 3: Kolaborasi

Field `labels` pada `Idea`. Pemilih label di halaman detail dan filter label di toolbar. Enum `Comment.targetType` dilebarkan. Tab Diskusi. Cabang notifikasi komentar dan mention.

---

## 10. Rencana Verifikasi

Repositori ini tidak punya test suite. `server/package.json` hanya berisi skrip `dev` dan `start`, dan tidak ada direktori test di mana pun. Karena itu verifikasi dilakukan manual, dan laporan hasilnya harus menyebut apa yang benar-benar dijalankan, bukan apa yang diasumsikan berjalan.

**Tahap 1**

1. Buat ide, muncul di daftar tanpa perlu muat ulang halaman.
2. Beri dukungan, angka naik. Buka di peramban kedua, angka ikut naik lewat Socket.io.
3. Klik dukungan dua kali cepat, jumlah tetap satu.
4. Filter status dan kata kunci mengembalikan hasil yang benar.
5. Urutkan berdasarkan Terpopuler, urutan sesuai jumlah dukungan.
6. Member biasa tidak bisa menyunting ide milik orang lain.
7. Hapus ide, hilang dari daftar, dan embedding-nya terhapus.

**Tahap 2**

8. Buat Event dengan dua ide terpilih, kedua ide berubah jadi `direalisasi`.
9. Sunting Event, lepas satu ide, ide itu kembali ke status semula, ide satunya tetap `direalisasi`.
10. Tautkan satu ide ke dua Event, hapus satu Event, ide tetap `direalisasi`. Hapus Event kedua, ide baru turun status.
11. Coba ubah status manual pada ide yang punya Event tertaut, ditolak dengan pesan yang jelas.
12. Hapus ide yang tertaut ke Event, chip backlink di Event ikut hilang.
13. Chip backlink dan tab Event Terkait menampilkan data yang sama dari kedua arah.

**Tahap 3**

14. Tulis komentar pada ide, muncul secara real-time di peramban kedua.
15. Sebut seseorang di komentar, notifikasinya masuk dan tautannya membuka halaman ide yang benar.
16. Filter label mengembalikan ide yang tepat.

**Menyeluruh**

17. Mode gelap pada halaman daftar, halaman detail, dan `IdeaPicker`.
18. Lebar 375px pada ketiga halaman, tanpa scroll horizontal.
19. Jalankan reindex embedding, ide lama ikut terindeks.
20. Tanya AI Chat tentang sebuah ide, jawabannya menyebut ide tersebut.

---

## 11. Risiko yang Diketahui

**Tumpang tindih dengan Brainstorming.** Akan ada dua tempat menulis gagasan. Diredam lewat copy yang tegas di kedua halaman. Kalau di lapangan tetap membingungkan, langkah berikutnya adalah menambah aksi "Simpan ke Bank Ide" pada widget Brainstorming, sehingga hubungan keduanya jadi berurutan, bukan bersaing.

**Status yang berubah sendiri.** Sebagian user akan kaget. Diredam lewat toast dan tooltip. Kalau keluhan muncul, perilaku ini gampang diturunkan menjadi mode saran: status tidak berubah, hanya muncul spanduk "Ide ini punya 2 Event terkait, tandai direalisasi?". Perubahannya terbatas di satu service dan satu komponen.

**Ide yang tidak bisa diarsipkan selama tertaut Event.** Konsekuensi langsung dari penjaga status manual. Dianggap benar secara produk, tapi perlu diawasi apakah mengganggu dalam praktik.

**Beban query saat Event disimpan.** Setiap penyimpanan Event memicu satu `countDocuments` per ide yang terlibat. Dengan index `{ ideas: 1 }` biayanya kecil, tapi kalau satu Event ditautkan ke puluhan ide, ini perlu diubah jadi satu agregasi tunggal. Batasi jumlah ide per Event kalau gejalanya muncul.

**Tanpa test otomatis.** Regresi hanya tertangkap secara manual. Ini kondisi repositori saat ini secara umum, bukan hal khusus fitur ini, tapi tetap perlu disebut supaya tidak ada klaim berlebihan tentang tingkat keyakinan.

---

## 12. Tindak Lanjut Setelah Implementasi

- Tulis `docs/features/26-bank-ide.md` mengikuti konvensi dokumen fitur yang sudah ada.
- Perbarui `docs/DEVELOPMENT_TRACKER.md`.
- Pertimbangkan aksi "Simpan ke Bank Ide" pada widget Brainstorming.
