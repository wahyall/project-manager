# 🏢 Fitur 02 — Kelola Workspace

## Ringkasan

Workspace adalah container utama aplikasi. Semua Event, Task, User, dan Board Brainstorming berada di dalam sebuah workspace. User bisa membuat dan bergabung ke **banyak workspace tanpa batas**. Workspace bersifat **selalu private** — tidak ada fitur pencarian workspace publik.

---

## Halaman Daftar Workspace

### Route: `/workspaces`

Halaman pertama setelah login (jika belum ada workspace aktif).

### Tampilan

Menampilkan semua workspace yang diikuti user dalam bentuk **card grid**:

- **Logo workspace** (placeholder jika kosong)
- **Nama workspace**
- **Deskripsi singkat** (truncated)
- **Jumlah member**
- **Jumlah task aktif** (non-archived, non-done)
- **Role user** di workspace tersebut (badge: Owner/Admin/Member/Guest)
- **Badge "Diarsipkan"** jika workspace sedang dalam status arsip

### Aksi

- Tombol **"Buat Workspace Baru"**
- Klik card → masuk ke Dashboard workspace tersebut
- Workspace yang diarsipkan ditampilkan terpisah (section bawah, collapsed by default)

---

## Buat Workspace Baru

### Route: `/workspaces/new`

### Form

| Field     | Tipe     | Required | Keterangan                      |
| --------- | -------- | -------- | ------------------------------- |
| Nama      | Text     | ✅       | Maks 50 karakter                |
| Deskripsi | Textarea | ❌       | Maks 500 karakter               |
| Logo      | Upload   | ❌       | Gambar maks 1MB, format JPG/PNG |

### Setelah Submit

- Workspace dibuat, user otomatis menjadi **Owner**
- Redirect ke Dashboard workspace baru
- Kolom kanban default dibuat otomatis: **To Do**, **In Progress**, **Review**, **Done**

---

## Pengaturan Workspace

### Route: `/workspace/:id/settings`

### Akses: Hanya **Owner** dan **Admin**

### Tab Umum

- Edit **nama**, **deskripsi**, **logo** workspace
- **Arsipkan workspace** (Admin dan Owner)
  - Workspace tetap bisa diakses (read-only) tapi tidak bisa diedit
  - Bisa di-unarsipkan kembali
- **Hapus workspace** (hanya **Owner**)
  - Memerlukan konfirmasi ulang (ketik nama workspace)
  - Semua data terkait dihapus permanen (soft delete dulu, hard delete setelah 30 hari)

### Tab Member

Lihat detail di section **Manajemen Member** di bawah.

### Tab Kolom Kanban

- Kelola kolom kanban **global workspace** (berlaku untuk semua task)
- Tambah, rename, hapus, reorder kolom
- Atur warna per kolom
- Kolom minimal: harus ada setidaknya 1 kolom

---

## Manajemen Member

### Daftar Member

Tabel semua member workspace:

| Kolom           | Deskripsi                              |
| --------------- | -------------------------------------- |
| Avatar + Nama   | Foto profil dan nama lengkap           |
| Email           | Email user                             |
| Role            | Owner / Admin / Member / Guest         |
| Status          | Online / Offline (real-time WebSocket) |
| Bergabung Sejak | Tanggal join workspace                 |
| Aksi            | Ubah role, Keluarkan (jika punya izin) |

### Undang Member

Dua cara mengundang:

#### 1. Via Email

- Input email: satu per satu, atau **bulk** (dipisahkan koma atau baris baru)
- Pilih **role default** yang akan diberikan saat bergabung
- Pesan undangan opsional (akan disertakan di email)
- Sistem mengirim email undangan berisi tautan join workspace

#### 2. Via Tautan Undangan

- Generate tautan undangan unik per workspace
- **Tidak ada kedaluwarsa** dan **tidak ada batas penggunaan**
- Tautan bisa di-regenerate (tautan lama otomatis tidak valid)
- Salin tautan untuk dibagikan langsung (WhatsApp, chat, dll)

### Ubah Role Member

- Owner bisa mengubah role siapa saja
- Admin bisa mengubah role non-Owner
- Role yang tersedia: **Owner**, **Admin**, **Member**, **Guest**
- Hanya bisa ada **1 Owner** per workspace pada satu waktu

### Transfer Ownership

- Owner bisa mentransfer ownership ke Admin atau Member
- Setelah transfer, Owner sebelumnya menjadi **Admin**
- Konfirmasi ulang diperlukan

### Keluarkan Member

- Owner bisa mengeluarkan siapa saja (kecuali diri sendiri)
- Admin bisa mengeluarkan Member dan Guest
- Member yang dikeluarkan:
  - Kehilangan akses ke workspace
  - Task yang di-assign ke mereka tetap ada (assignee dikosongkan)
  - Aktivitas mereka tetap tercatat di Activity Log

### Leave Workspace

- Semua role bisa leave workspace kecuali Owner
- Owner harus transfer ownership terlebih dahulu sebelum bisa leave

---

## Sistem Role & Izin

| Aksi                             | Owner | Admin | Member | Guest |
| -------------------------------- | :---: | :---: | :----: | :---: |
| Hapus workspace                  |  ✅   |  ❌   |   ❌   |  ❌   |
| Arsipkan workspace               |  ✅   |  ✅   |   ❌   |  ❌   |
| Edit pengaturan workspace        |  ✅   |  ✅   |   ❌   |  ❌   |
| Kelola member & role             |  ✅   |  ✅   |   ❌   |  ❌   |
| Transfer ownership               |  ✅   |  ❌   |   ❌   |  ❌   |
| Buat & hapus Event               |  ✅   |  ✅   |   ✅   |  ❌   |
| Buat & hapus Task                |  ✅   |  ✅   |   ✅   |  ❌   |
| Buat & edit Widget Brainstorming |  ✅   |  ✅   |   ✅   |  ❌   |
| Lihat semua konten               |  ✅   |  ✅   |   ✅   |  ✅   |
| Komentar & Mention               |  ✅   |  ✅   |   ✅   |  ❌   |

---

## Struktur Data

### Collection: `workspaces`

```json
{
  "_id": "ObjectId",
  "name": "string",
  "description": "string",
  "logo": "string (URL, nullable)",
  "ownerId": "ObjectId (ref: users)",
  "isArchived": "boolean (default: false)",
  "archivedAt": "Date (nullable)",
  "inviteCode": "string (unique, untuk tautan undangan)",
  "kanbanColumns": [
    {
      "_id": "ObjectId",
      "name": "string",
      "color": "string (hex)",
      "order": "number"
    }
  ],
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Collection: `workspace_members`

```json
{
  "_id": "ObjectId",
  "workspaceId": "ObjectId",
  "userId": "ObjectId",
  "role": "string (owner|admin|member|guest)",
  "joinedAt": "Date",
  "invitedBy": "ObjectId (ref: users, nullable)"
}
```

### Collection: `workspace_invitations`

```json
{
  "_id": "ObjectId",
  "workspaceId": "ObjectId",
  "email": "string",
  "role": "string",
  "message": "string (nullable)",
  "invitedBy": "ObjectId",
  "status": "string (pending|accepted|expired)",
  "token": "string",
  "createdAt": "Date",
  "acceptedAt": "Date (nullable)"
}
```

---

## API Endpoints

| Method | Endpoint                                     | Deskripsi                      | Akses     |
| ------ | -------------------------------------------- | ------------------------------ | --------- |
| GET    | `/api/workspaces`                            | Daftar workspace user          | Auth      |
| POST   | `/api/workspaces`                            | Buat workspace baru            | Auth      |
| GET    | `/api/workspaces/:id`                        | Detail workspace               | Member+   |
| PUT    | `/api/workspaces/:id`                        | Update workspace               | Admin+    |
| DELETE | `/api/workspaces/:id`                        | Hapus workspace                | Owner     |
| POST   | `/api/workspaces/:id/archive`                | Arsipkan workspace             | Admin+    |
| POST   | `/api/workspaces/:id/unarchive`              | Unarsipkan workspace           | Admin+    |
| GET    | `/api/workspaces/:id/members`                | Daftar member                  | Member+   |
| POST   | `/api/workspaces/:id/invite`                 | Undang via email               | Admin+    |
| POST   | `/api/workspaces/:id/invite-link/regenerate` | Generate ulang tautan undangan | Admin+    |
| POST   | `/api/workspaces/join/:inviteCode`           | Join via tautan undangan       | Auth      |
| PUT    | `/api/workspaces/:id/members/:userId/role`   | Ubah role member               | Admin+    |
| DELETE | `/api/workspaces/:id/members/:userId`        | Keluarkan member               | Admin+    |
| POST   | `/api/workspaces/:id/leave`                  | Leave workspace                | Non-Owner |
| POST   | `/api/workspaces/:id/transfer-ownership`     | Transfer ownership             | Owner     |
