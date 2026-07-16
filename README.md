# 🗂️ YN Project Manager

> **Platform manajemen proyek kolaboratif berbasis web** yang menyatukan pengelolaan task, event, brainstorming visual, activity log, dan notifikasi real-time dalam satu aplikasi terpadu.

Dirancang khusus untuk tim kecil hingga menengah yang membutuhkan *tools* fleksibel, saling terhubung, dan mudah digunakan. Visi dari aplikasi ini adalah "Satu Platform, Semua Kebutuhan Tim" di mana dari perencanaan event, pembagian task, hingga sesi brainstorming kreatif—semua terjadi di satu tempat tanpa perlu berpindah-pindah aplikasi.

---

## 🌟 Nilai Utama Produk (Core Values)

1. **Satu Platform, Semua Kebutuhan:** Perencanaan, pendelegasian, hingga eksekusi dalam satu web app.
2. **Koneksi Antar Data:** Task bisa dihubungkan ke Event; Kalender dan Kanban berbagi data yang sama; Widget Brainstorming merujuk ke Task asli.
3. **Kolaborasi Real-time:** Perubahan dari satu anggota tim langsung terlihat oleh tim lain tanpa *refresh* halaman (berlaku di Kanban, Spreadsheet, dan Brainstorming Canvas).
4. **Notifikasi Tepat Sasaran:** Sistem Mention dan integrasi WhatsApp memastikan informasi krusial tidak pernah terlewat.

---

## 🗄️ Struktur Navigasi

Aplikasi menggunakan struktur navigasi ganda untuk kemudahan akses:
- **Navigasi Global (Sidebar Kiri):** Tersedia saat masuk ke workspace, berisi: *Dashboard, Event, Task (Kanban & Kalender), Brainstorming, Activity Log, Pengaturan Workspace*.
- **Navigasi Atas (Topbar):** Akses cepat ke Notifikasi (dengan *badge counter*), Profil Pengguna, Pengaturan Akun, dan Switcher Workspace.

---

## 🚀 Fitur Detail Berdasarkan Modul

### Modul 1 — Kelola Workspace
Workspace adalah container utama (ruang kerja) yang menampung seluruh Event, Task, User, dan Board Brainstorming.
* **Manajemen Multi-Workspace:** Satu pengguna dapat bergabung atau membuat banyak workspace berbeda. Halaman awal akan menampilkan daftar workspace aktif beserta statistik singkat.
* **Pengaturan Workspace Khusus Admin/Owner:** Pengubahan nama, logo, deskripsi, visibilitas ruang kerja, dan penghapusan workspace.
* **Sistem Invite & Member:** Undang member via email/link unik. Pengelolaan role secara fleksibel:
  * **Owner:** Hak akses penuh termasuk hapus workspace.
  * **Admin:** Bisa kelola member, role, event, task, board.
  * **Member:** Bisa kelola event, task, dan board (tidak bisa atur workspace/member).
  * **Guest:** Hanya hak akses lihat (View-only), tidak bisa komentar atau mention.

### Modul 2 — Kelola Event & Spreadsheet
Event merepresentasikan proyek besar, milestone, atau acara penting.
* **Detail Event yang Kaya:** Overview menampilkan tanggal, status, label warna, peserta, dan rich-text description.
* **Tab Task Terkait:** Menampilkan *mini-kanban* atau list khusus task yang terhubung (linked) ke event ini saja.
* **Fitur Internal Spreadsheet (Excel-like):** 
  Setiap event memiliki *built-in spreadsheet* yang dapat digunakan untuk menyusun rundown, list vendor, budgeting, atau absensi.
  * *Multi-Sheet:* Dukungan banyak tab/sheet dalam 1 event.
  * *Tipe Kolom Fleksibel:* Teks bebas, Angka (dengan format mata uang/desimal), Date Picker, Checkbox, Dropdown (custom options), User (assign member), URL, dan Formula Sederhana (SUM, AVERAGE, MIN, MAX).
  * *Manajemen Kolom:* Drag-drop urutan, tambah/hapus, rename, ubah lebar kolom, filter, dan sort.
  * *Kolaborasi Real-time & Komentar:* Setiap *cell* bisa diberi thread komentar (dengan mention) dan semua editan terlihat secara real-time.
  * *Export:* Dukungan export ke `.csv` atau `.xlsx`.

### Modul 3 — Kelola Task (Kanban & Kalender)
Manajemen pekerjaan sehari-hari dengan sinkronisasi dua arah. Perubahan di satu tampilan langsung mengubah tampilan lain.
* **Struktur Data Task Komprehensif:** Judul, Rich-text Deskripsi (dukungan mention), Status, Assignee, Start & Due Date, Prioritas (Low, Medium, High, Critical), Label Warna, Subtask, Lampiran File, dan Thread Komentar.
* **Tampilan Kanban Board:**
  * Kustomisasi penuh kolom (To Do, In Progress, Review, dll).
  * Drag & drop kartu antar kolom.
  * Kartu menampilkan avatar assignee, indikator prioritas, dan jumlah subtask/komentar.
* **Tampilan Kalender:**
  * Mode tampilan Bulanan, Mingguan, dan Harian.
  * Task dan Event dibedakan berdasarkan label warna. Task yang terhubung ke Event akan mengadopsi warna Event tersebut.
  * *Interaktivitas:* Klik tanggal kosong untuk buat task, drag ujung *bar* task untuk *extend* tanggal pengerjaan, drag keseluruhan *bar* untuk memindah jadwal.

### Modul 4 — Brainstorming Board (Infinite Canvas)
Canvas visual tanpa batas (mirip FigJam atau Miro) untuk perencanaan visual dan *mind mapping*.
* **Manajemen Widget Bebas:** Dukungan Drag & Drop, *Resize*, Layering (*Bring to Front*), Kunci posisi (*Lock*), dan *Collapse/Expand*. Dukungan Pan & Zoom menggunakan mouse/trackpad.
* **Berbagai Tipe Widget:**
  * *Widget Task:* Menarik task aktual (live) dari Kanban ke atas Canvas. Jika status task diubah di Canvas, akan berubah juga di Kanban.
  * *Widget Diagram (Flowchart):* Membuat *shapes* (Rectangle, Diamond, Sticky Note, dll) yang bisa saling dihubungkan dengan garis/panah pintar (*smart connectors*).
  * *Widget Gambar:* Upload file lokal atau embed URL, dilengkapi *caption*.
  * *Widget Teks (WYSIWYG):* Teks kaya dengan format Heading, List, Tabel, dan dukungan Mention tim.

### Modul 5 — Notifikasi & Komunikasi (WhatsApp Gateway)
* **Mention System (`@`):** Penandaan user yang bisa digunakan di: Deskripsi Task, Komentar Task, Cell Spreadsheet, Teks Brainstorming.
* **Threaded Comments & Reactions:** Komentar bertingkat (Reply) dengan dukungan Emoji Reactions. Terdapat fitur "Resolve Thread" jika diskusi sudah selesai.
* **Notifikasi In-App:** Lonceng notifikasi yang menandakan mention baru, task di-assign, pengingat deadline (H-1 / H-3), atau update task penting.
* **Integrasi WhatsApp:** Member yang menautkan nomor WA di profilnya akan menerima chat otomatis untuk setiap notifikasi krusial (termasuk tautan langsung menuju aplikasi).
* **WhatsApp External API:**
  Platform ini juga membuka gateway API (tanpa *session JWT*) agar aplikasi pihak ketiga bisa memanfaatkan *bot WhatsApp* internal yang sudah tersambung di workspace ini.
  * Endpoint: `POST /api/external/whatsapp/send`
  * Auth: Header `X-API-Key` atau `Authorization: Bearer` dengan validasi `WHATSAPP_EXTERNAL_API_KEY` dari environment.
  * Body Request: Membutuhkan `workspaceId`, `number`, dan `message`.
  * *Asynchronous Queue:* Pesan akan masuk antrian outbound yang mematuhi *rate limit* untuk mencegah blokir.

### Modul 6 — Activity Log, Audit Trail & Exporting
* **Activity Log Permanen:** Semua aksi (pembuatan task, pengubahan event, pengaturan member, dll) tercatat sebagai jejak audit abadi yang tidak dapat dihapus/diedit.
* **Exporting Lengkap:**
  * Task Kanban: Export visual ke PDF, atau daftar data ke CSV/Excel.
  * Spreadsheet: Export sheet ke CSV/Excel.
  * Brainstorming Canvas: Export ke PNG/PDF (high resolution).
  Proses export data besar dilakukan secara *background*, dan notifikasi akan muncul bila file siap diunduh.

---

## 🔄 Alur Kerja Lengkap (User Journey)

1. **Onboarding & Setup Awal:**
   User diundang oleh kolega via Email/WA. Mengisi profil dasar dan mengatur *preferensi notifikasi* (apakah WA aktif / in-app aktif). Masuk ke halaman Workspace, memantau *Dashboard* harian.
2. **Pembuatan Event & Setup Spreadsheet:**
   Owner/Admin membuat event (misal: *Product Launch V2*). Kemudian membuka *Tab Spreadsheet* di dalam Event tersebut. Membuat kolom "Vendor", "Biaya", "PIC" (Assignee), dan "Status" (Checkbox). Tim mulai mengisi baris data bersama-sama secara realtime.
3. **Ideasi di Brainstorming Canvas:**
   Masuk ke menu Brainstorming, tim membuka board kosong. Menarik bentuk sticky notes untuk ide campaign, menghubungkannya dengan garis flow. Lalu men-tag (`@`) anggota tim lain untuk mereview diagram tersebut.
4. **Transisi ke Task:**
   Dari ide di atas kanvas, mereka menarik *Widget Task* dan langsung membuat Task baru yang dihubungkan (*link*) ke Event *Product Launch V2*.
5. **Eksekusi Harian:**
   Setiap anggota tim masuk ke Kanban Board, menarik kartu task mereka dari *To Do* ke *In Progress*. Mereka melampirkan file desain dan meninggalkan komentar. *Mention* dalam komentar tersebut memicu WhatsApp bot untuk menge-ping anggota yang sedang tidak membuka web.
6. **Monitoring:**
   Project Manager membuka *Kalender View* harian/mingguan untuk memastikan tidak ada tenggat waktu yang terlewati. Activity Log dipantau jika terjadi perubahan drastis (misal ada yang mengubah struktur kolom spreadsheet secara tidak sengaja).

---

## 📱 Pengalaman Mobile & PWA (Progressive Web App)

Aplikasi tidak hanya dirancang untuk Desktop (layar besar) namun dioptimalkan penuh untuk perangkat *mobile*:
* **Installable (PWA):** Dapat ditambahkan langsung ke layar utama Android / iOS seperti aplikasi *native*. Mendukung *offline-cache* dasar dan *push notifications*.
* **UI Adaptif:** 
  * Di Mobile, Kanban menggunakan sistem *swipe kiri/kanan* penuh antar kolom.
  * Navigasi utama berpindah ke *Bottom Navigation Bar* agar pas di jangkauan ibu jari.
  * Spreadsheet menjadi tabel responsif horizontal (dengan opsi *freeze* kolom pertama).
  * Brainstorming canvas akan berjalan dalam mode **View & Zoom-only** untuk menjaga kestabilan *layout* di layar kecil.

---

## 🛠️ Instalasi & Pengembangan Lokal (Local Development)

Proyek ini menggunakan struktur monorepo dengan pemisahan direktori `server` (backend API & integrasi Baileys WhatsApp) dan `client` (frontend Next.js/React).

### Prasyarat:
- **Node.js**: Sangat disarankan versi 18 atau ke atas.
- **NPM**: Package manager.
- **Database**: Membutuhkan database berjalan sesuai definisi stack pada folder server. (Lihat file env).
- **Environment Variables**: Siapkan `server/.env` (dari `.env.example`) dan `client/.env`. Khususnya variabel krusial seperti `WHATSAPP_EXTERNAL_API_KEY` untuk mengaktifkan gateway WA eksternal.

### Perintah Menjalankan (Script CLI)

1. **Install Seluruh Dependency Sekaligus**
   Menjalankan `npm install` di folder root, lalu otomatis masuk ke dalam `/server` dan `/client`.
   ```bash
   npm run install:all
   ```

2. **Menjalankan Server & Client Bersamaan (Development)**
   Aplikasi akan menggunakan library `concurrently` untuk memutar instance backend dan frontend dalam satu terminal session.
   ```bash
   npm run dev
   ```

3. **Menjalankan Terpisah (Opsional)**
   - Khusus Backend: `npm run dev:server`
   - Khusus Frontend: `npm run dev:client`

---

## 🚀 Panduan Deployment

Terdapat berbagai dokumentasi deployment yang siap dibaca pada direktori Root bergantung dari arsitektur hosting Anda:
- [Deploy menggunakan VPS Ubuntu (Nginx & PM2)](deploy-vps-ubuntu-nginx.md)
- [Deploy via Railway](DEPLOY_RAILWAY.md)
- [Deploy via Render](DEPLOY_RENDER.md)
- [Deploy via Vercel (untuk Frontend)](DEPLOY_VERCEL.md)
- [Opsi Hosting Alternatif](HOSTING_ALTERNATIF.md)

---
*Yn Project Manager - Mengubah cara kerja tim, membuat kolaborasi menjadi lebih visual, terstruktur, dan terhubung erat.*
