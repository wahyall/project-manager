# 📱 Fitur 20 — Mobile Responsive & PWA

## Ringkasan

Aplikasi dirancang **mobile-first** dan bisa diakses dari browser maupun diinstal sebagai **PWA (Progressive Web App)**. Offline support terbatas pada **baca cache** saja (tidak bisa create/edit offline). Push notification via **browser push** (bukan native app).

---

## Halaman yang Sepenuhnya Responsif

Semua halaman tampil optimal di layar mobile (≤ 768px):

| Halaman             | Tersedia di Mobile | Catatan                             |
| ------------------- | :----------------: | ----------------------------------- |
| Dashboard           |         ✅         | Layout stack vertikal               |
| Daftar Event        |         ✅         | Card list vertikal                  |
| Detail Event        |         ✅         | Tab navigation tetap                |
| Kanban Board        |         ✅         | 1 kolom per view, swipe antar kolom |
| Kalender            |         ✅         | Mode harian/mingguan diutamakan     |
| Detail Task         |         ✅         | Halaman penuh (bukan side panel)    |
| Komentar            |         ✅         | Full-width thread                   |
| Notifikasi          |         ✅         | Full-width panel                    |
| Activity Log        |         ✅         | Timeline vertikal                   |
| Profil User         |         ✅         | Layout stack                        |
| Pengaturan Akun     |         ✅         | Form full-width                     |
| Spreadsheet         |   ✅ (terbatas)    | Horizontal scroll, freeze kolom 1   |
| Brainstorming Board |   ✅ (view mode)   | Lihat & zoom, edit terbatas         |

---

## Adaptasi Tampilan Mobile

### Kanban Board

- Kolom kanban ditampilkan **satu per satu** secara penuh (full-width)
- **Swipe horizontal** (kiri/kanan) untuk berpindah antar kolom
- Header menampilkan:
  - Nama kolom aktif
  - Indikator navigasi (dots atau tabs): `● ○ ○ ○`
  - Counter task di kolom
- Drag & drop task antar kolom: **long press** kartu → drag ke edge layar → swipe ke kolom berikut
- Quick create task: sticky button "+" di bawah

### Kalender

- **Mode bulanan**: versi kompak
  - Tanggal tampil sebagai angka kecil
  - Dot indicator menandakan ada task/event
  - Klik tanggal → expand menampilkan daftar task hari itu
- **Mode mingguan** (default di mobile): 7 kolom sempit dengan task sebagai dot/chip
- **Mode harian**: paling mudah diinteraksi — tampilan list task dan event hari itu
- Navigasi: swipe horizontal untuk pindah periode

### Spreadsheet Event

- Tabel horizontal yang bisa di-**scroll ke samping**
- **Freeze kolom pertama**: kolom pertama tetap terlihat saat scroll horizontal
- Cell editable: tap cell → modal edit muncul (bukan inline edit)
- Toolbar kolom: accessible via menu "..." pada header kolom

### Brainstorming Board

- Mode **view-only** by default di mobile:
  - Bisa **melihat** seluruh canvas
  - **Pinch-to-zoom** untuk zoom in/out
  - **Pan** dengan satu jari
  - Tap widget untuk melihat kontennya
- Edit terbatas:
  - Bisa edit teks di dalam widget (tap → modal edit)
  - Bisa mengubah status task di widget task
  - **Tidak bisa**: drag widget, resize widget, membuat koneksi baru
- Banner: "Untuk pengalaman penuh, gunakan tablet atau desktop"

### Detail Task

- Di mobile: bukan side panel, tapi **halaman penuh** (full page)
- Kembali: tombol back di header
- Semua field editable inline
- Tab (Detail, Komentar, Activity) tetap navigable

---

## Navigasi Mobile

### Bottom Navigation Bar

Menggantikan sidebar di mobile. Ditampilkan di bawah layar (sticky).

| Ikon | Label     | Route                                    |
| ---- | --------- | ---------------------------------------- |
| 🏠   | Dashboard | `/workspace/:id`                         |
| 📅   | Event     | `/workspace/:id/events`                  |
| 📋   | Task      | `/workspace/:id/tasks/kanban`            |
| 🧠   | Board     | `/workspace/:id/brainstorming`           |
| ⚙️   | Lainnya   | Menu drawer (Activity, Settings, Profil) |

### Menu "Lainnya" (Drawer)

Slide-up drawer yang berisi:

- Kalender View
- Activity Log
- Pengaturan Workspace
- Pengaturan Akun
- Logout

---

## Fitur Khusus Mobile

### Pull-to-Refresh

- Tersedia di semua halaman list:
  - Daftar Event
  - Kanban Board
  - Kalender
  - Activity Log
  - Notifikasi
- Tarik ke bawah → loading indicator → data dimuat ulang

### Swipe to Dismiss

- **Notifikasi**: geser notifikasi ke kanan → tandai sebagai sudah dibaca
- Animasi slide-out smooth

### Touch Gestures

| Gesture     | Konteks       | Aksi                     |
| ----------- | ------------- | ------------------------ |
| Tap         | Semua         | Select / buka            |
| Long press  | Kartu task    | Mode drag (pindah kolom) |
| Swipe left  | Kanban        | Kolom berikut            |
| Swipe right | Kanban        | Kolom sebelum            |
| Pinch zoom  | Brainstorming | Zoom in/out              |
| Pull down   | Halaman list  | Refresh data             |

---

## PWA (Progressive Web App)

### Instalasi

- Banner "Instal Aplikasi" muncul di browser saat syarat PWA terpenuhi
- User bisa instal ke homescreen perangkat
- Ikon aplikasi ditampilkan seperti native app
- Splash screen saat launch

### Manifest (`manifest.json`)

```json
{
  "name": "Project Manager",
  "short_name": "ProjManager",
  "description": "Platform manajemen proyek kolaboratif",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1a73e8",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Push Notification (Browser)

- Menggunakan **Web Push API** (VAPID keys)
- Saat user pertama kali membuka app: request izin notifikasi browser
- Jika diizinkan: simpan push subscription di database
- Backend mengirim push notification untuk event penting:
  - Mention
  - Assign task
  - Due date
  - Event dimulai
- Library: `web-push` (Node.js)

### Offline Cache

- **Service Worker** caching strategi:
  - **App shell**: HTML, CSS, JS di-cache saat install (Cache First)
  - **API data**: cache halaman yang sudah dikunjungi (Network First with Cache Fallback)
  - **Static assets**: gambar, font (Cache First)
- **Saat offline**:
  - User bisa melihat halaman yang sudah di-cache
  - Tampilkan banner "Anda sedang offline — menampilkan data tersimpan"
  - Fitur create/edit **tidak tersedia** (tombol disabled, toast warning)
  - Saat online kembali: banner hilang, data dimuat ulang otomatis

### Service Worker

```javascript
// Caching strategy overview
const CACHE_VERSION = "v1";
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;

// Install: cache app shell
// Fetch: network first for API, cache first for static
// Activate: cleanup old caches
```

---

## Responsive Breakpoints

| Breakpoint | Lebar          | Layout                        |
| ---------- | -------------- | ----------------------------- |
| Mobile     | ≤ 768px        | Bottom nav, stack layout      |
| Tablet     | 769px – 1024px | Sidebar collapsed, adaptif    |
| Desktop    | > 1024px       | Full sidebar, side panel task |

---

## Meta Tags Mobile

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
/>
<meta name="theme-color" content="#1a73e8" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```
