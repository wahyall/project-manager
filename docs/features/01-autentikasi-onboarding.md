# 🔐 Fitur 01 — Autentikasi & Onboarding

## Ringkasan

Sistem autentikasi berbasis email dan password dengan fitur onboarding interaktif untuk user baru. Tidak menggunakan OAuth atau verifikasi email.

---

## Alur Registrasi

1. User mengakses halaman `/register`
2. Mengisi form: **Nama Lengkap**, **Email**, **Password**, **Konfirmasi Password**
3. Validasi:
   - Email harus unik (belum terdaftar)
   - Password minimal 8 karakter (disarankan kombinasi huruf, angka, simbol)
   - Konfirmasi password harus cocok
4. Akun langsung aktif setelah submit — **tidak ada verifikasi email**
5. User diarahkan ke halaman Daftar Workspace

---

## Alur Login

1. User mengakses halaman `/login`
2. Mengisi **Email** dan **Password**
3. Validasi credential terhadap database
4. Jika berhasil:
   - Generate JWT token (access token + refresh token)
   - Simpan di httpOnly cookie atau localStorage
   - Redirect ke halaman Daftar Workspace (atau workspace terakhir yang aktif)
5. Jika gagal: tampilkan pesan error generik ("Email atau password salah")

### Session Management

- **Tidak ada batas durasi session** — user tetap login sampai logout manual
- **Multi-device**: User bisa login dari banyak perangkat sekaligus
- Refresh token digunakan untuk memperpanjang session tanpa login ulang

---

## Alur Lupa Password

1. User klik "Lupa Password?" di halaman login
2. Mengisi **Email** yang terdaftar
3. Sistem mengirim email berisi **tautan reset password** (berlaku 1 jam)
4. User klik tautan → diarahkan ke form reset password
5. Mengisi **Password Baru** dan **Konfirmasi Password Baru**
6. Password diperbarui, user diarahkan ke halaman login

### Catatan Teknis

- Tautan reset password berisi token unik yang disimpan di database
- Token hanya bisa digunakan sekali (invalidate setelah dipakai)
- Jika email tidak ditemukan, tetap tampilkan pesan sukses generik (security best practice)

---

## Alur Onboarding (Tur Fitur)

Ditampilkan **saat pertama kali user masuk** ke sebuah workspace.

### Mekanisme

- Berbentuk **tooltip overlay** yang menyoroti elemen-elemen UI utama secara berurutan
- User bisa **melewatkan (skip)** tur kapan saja
- Bisa **ditampilkan ulang** dari halaman Pengaturan Akun
- **Tur berbeda per role**:
  - **Owner/Admin**: Tur mencakup pengaturan workspace, manajemen member, dan semua fitur
  - **Member**: Tur fokus pada task, event, brainstorming, dan komentar
  - **Guest**: Tur singkat tentang navigasi dan fitur melihat konten

### Step-step Tur (Contoh untuk Member)

| Step | Elemen          | Pesan                                           |
| ---- | --------------- | ----------------------------------------------- |
| 1    | Sidebar         | "Navigasi utama ada di sini. Akses semua modul" |
| 2    | Kanban Board    | "Kelola task tim kamu dengan papan kanban"      |
| 3    | Kalender        | "Lihat jadwal task dan event di kalender"       |
| 4    | Brainstorming   | "Tuangkan ide dengan canvas brainstorming"      |
| 5    | Notifikasi Bell | "Notifikasi mention dan update ada di sini"     |
| 6    | Profil          | "Lengkapi profil dan nomor WhatsApp kamu"       |

### Tracking Status Tur

- Simpan di database: `user_workspace_onboarding` collection
- Field: `userId`, `workspaceId`, `completedAt`, `skippedAt`
- Gunakan flag ini untuk menentukan apakah tur harus ditampilkan

---

## Halaman Terkait

| Halaman        | Route                    | Akses  |
| -------------- | ------------------------ | ------ |
| Register       | `/register`              | Public |
| Login          | `/login`                 | Public |
| Lupa Password  | `/forgot-password`       | Public |
| Reset Password | `/reset-password/:token` | Public |

---

## Struktur Data

### Collection: `users`

```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string (unique)",
  "password": "string (hashed bcrypt)",
  "avatar": "string (URL, nullable)",
  "whatsappNumber": "string (nullable)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Collection: `password_reset_tokens`

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "token": "string (hashed)",
  "expiresAt": "Date",
  "usedAt": "Date (nullable)",
  "createdAt": "Date"
}
```

### Collection: `user_onboarding`

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "workspaceId": "ObjectId",
  "role": "string",
  "completedAt": "Date (nullable)",
  "skippedAt": "Date (nullable)"
}
```

---

## API Endpoints

| Method | Endpoint                                | Deskripsi                   | Auth |
| ------ | --------------------------------------- | --------------------------- | ---- |
| POST   | `/api/auth/register`                    | Registrasi user baru        | ❌   |
| POST   | `/api/auth/login`                       | Login dan dapatkan token    | ❌   |
| POST   | `/api/auth/logout`                      | Logout dan hapus token      | ✅   |
| POST   | `/api/auth/refresh`                     | Refresh access token        | ✅   |
| POST   | `/api/auth/forgot-password`             | Kirim email reset password  | ❌   |
| POST   | `/api/auth/reset-password`              | Reset password dengan token | ❌   |
| GET    | `/api/onboarding/:workspaceId`          | Cek status onboarding       | ✅   |
| POST   | `/api/onboarding/:workspaceId/complete` | Tandai tur selesai          | ✅   |
| POST   | `/api/onboarding/:workspaceId/skip`     | Skip tur                    | ✅   |
| POST   | `/api/onboarding/:workspaceId/reset`    | Reset untuk lihat ulang     | ✅   |

---

## Tech Stack Terkait

- **Password hashing**: bcrypt
- **Token**: JWT (jsonwebtoken)
- **Email service**: Nodemailer (SMTP)
- **Onboarding UI**: Library tooltip tour (misal react-joyride atau custom)
