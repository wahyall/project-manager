# 📱 Fitur 17 — Notifikasi WhatsApp

## Ringkasan

Notifikasi otomatis yang dikirim ke nomor WhatsApp user menggunakan **Baileys** (library WhatsApp Web API self-hosted). Sepenuhnya gratis, tanpa tergantung layanan pihak ketiga. Pesan berisi informasi aksi, konteks, dan tautan langsung ke halaman yang relevan.

---

## Library: Baileys

### Deskripsi

- **Repository**: https://github.com/WhiskeySockets/Baileys
- Library Node.js untuk berinteraksi dengan WhatsApp Web API
- **100% self-hosted** — berjalan di server sendiri
- Mendukung multi-device (tidak perlu HP tethered 24/7)
- Tidak memerlukan WhatsApp Business API resmi

### Instalasi

```bash
npm install @whiskeysockets/baileys
```

### Cara Kerja

1. Saat pertama kali, server menampilkan **QR code** di console/admin panel
2. Admin scan QR code menggunakan WhatsApp di HP
3. Session tersimpan (auth state) — tidak perlu scan ulang selama session aktif
4. Server bisa mengirim pesan ke nomor WhatsApp manapun melalui API internal

### Setup Awal

```javascript
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require("@whiskeysockets/baileys");

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth_info");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true, // tampilkan QR di terminal
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      // Auto-reconnect jika bukan logout manual
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;
      if (shouldReconnect) startWhatsApp();
    } else if (connection === "open") {
      console.log("WhatsApp connected!");
    }
  });

  return sock;
}
```

### Mengirim Pesan

```javascript
async function sendWhatsAppMessage(sock, phoneNumber, message) {
  // Format nomor: 62812345678@s.whatsapp.net
  const jid = phoneNumber.replace(/^\+/, "") + "@s.whatsapp.net";

  await sock.sendMessage(jid, { text: message });
}
```

---

## Tipe Pesan yang Dikirim

| Tipe          | Trigger                         | Template Pesan                                          |
| ------------- | ------------------------------- | ------------------------------------------------------- |
| Mention       | Di-mention di teks/komentar     | "📌 [Nama] menyebutmu di [konteks] '[judul]'\n\n[URL]"  |
| Assign Task   | Di-assign ke task               | "📋 [Nama] menugaskan task '[judul]' kepadamu\n\n[URL]" |
| Due Date      | Due date mendekat (H, H-1, H-3) | "⏰ Task '[judul]' jatuh tempo [waktu]\n\n[URL]"        |
| Event Dimulai | Event user dimulai hari ini     | "📅 Event '[judul]' dimulai hari ini\n\n[URL]"          |

---

## Template Pesan

### Format Umum

```
[Emoji] [Deskripsi aksi]

📍 Workspace: [Nama Workspace]
🔗 [URL lengkap ke halaman terkait]
```

### Contoh Pesan

```
📌 Andi menyebutmu di komentar task "Review Desain UI"

📍 Workspace: Project Alpha
🔗 https://app.example.com/workspace/abc/tasks/xyz#comment-123
```

```
📋 Sari menugaskan task "Finalisasi Proposal" kepadamu

📍 Workspace: Project Alpha
🔗 https://app.example.com/workspace/abc/tasks/xyz
```

```
⏰ Task "Setup Database" jatuh tempo besok

📍 Workspace: Project Alpha
🔗 https://app.example.com/workspace/abc/tasks/xyz
```

---

## Alur Pengiriman

```
Aksi terjadi (mention, assign, dll)
      ↓
Backend NotificationService
      ↓
Cek preferensi user:
  - notificationPreferences.[type].whatsapp === true?
  - User punya nomor WhatsApp terdaftar?
      ↓ (jika ya)
Masukkan ke queue pengiriman WhatsApp
      ↓
Worker mengambil dari queue
      ↓
Kirim via Baileys socket instance
      ↓
Log hasil pengiriman
```

---

## Arsitektur WhatsApp Service

### Singleton Pattern

Baileys socket instance dijalankan sebagai **singleton service** yang hidup selama server berjalan:

```javascript
// services/whatsapp.service.js
class WhatsAppService {
  constructor() {
    this.sock = null;
    this.isConnected = false;
  }

  async initialize() {
    const { state, saveCreds } = await useMultiFileAuthState("./auth_info");
    this.sock = makeWASocket({ auth: state });
    this.sock.ev.on("creds.update", saveCreds);
    this.sock.ev.on("connection.update", this.handleConnection.bind(this));
  }

  async sendMessage(phoneNumber, message) {
    if (!this.isConnected) throw new Error("WhatsApp not connected");
    const jid = phoneNumber.replace(/^\+/, "") + "@s.whatsapp.net";
    return await this.sock.sendMessage(jid, { text: message });
  }

  getStatus() {
    return { connected: this.isConnected };
  }
}

module.exports = new WhatsAppService();
```

### Admin Panel — Status & QR Code

- Halaman admin `/admin/whatsapp` menampilkan:
  - **Status koneksi**: Connected / Disconnected
  - **QR Code** (jika belum terhubung) — render QR code di browser untuk di-scan
  - **Tombol Reconnect**: untuk reconnect manual jika terputus
  - **Tombol Test**: kirim pesan test ke nomor tertentu
  - **Log pengiriman**: daftar pesan yang terkirim/gagal

---

## Konfigurasi Backend

### Environment Variables

```env
WHATSAPP_AUTH_DIR=./auth_info
WHATSAPP_ENABLED=true
APP_BASE_URL=https://app.example.com
```

### File Auth

- Auth state disimpan di folder `./auth_info/` (otomatis dibuat oleh Baileys)
- Folder ini berisi file credentials yang harus **dipersist** (jangan hapus, atau harus scan QR ulang)
- Tambahkan ke `.gitignore`: `auth_info/`

---

## Rate Limiting & Queue

- Menggunakan **message queue** (Bull/BullMQ dengan Redis, atau simple in-memory queue)
- Rate limit: maks **30 pesan per menit** (untuk menghindari ban WhatsApp)
- **Delay antar pesan**: minimal 1-2 detik (anti-spam protection)
- Retry: jika gagal, coba ulang maks 3x dengan delay exponential (3s, 10s, 30s)
- Jika tetap gagal: log error, tidak notifikasi user (fail silently)

### Anti-Ban Best Practices

- Jangan kirim pesan massal ke banyak nomor dalam waktu singkat
- Gunakan delay random antara 1-3 detik antar pesan
- Jangan kirim pesan ke nomor yang tidak tersimpan di kontak (jika memungkinkan)
- Monitor status koneksi — jika sering disconnect, kurangi rate

---

## Handling User tanpa WhatsApp

- Jika user tidak mendaftarkan nomor WhatsApp:
  - Notifikasi WhatsApp di-skip (tidak ada error)
  - Di halaman profil user: tampilkan **banner reminder**: "Lengkapi nomor WhatsApp untuk menerima notifikasi langsung"
- Banner muncul di:
  - Dashboard (banner atas)
  - Pengaturan Akun (di section WhatsApp)

---

## Struktur Data

### Collection: `whatsapp_logs`

```json
{
  "_id": "ObjectId",
  "recipientId": "ObjectId",
  "recipientNumber": "string",
  "notificationType": "string",
  "message": "string",
  "status": "string (pending|sent|failed)",
  "error": "string (nullable)",
  "attempts": "number",
  "lastAttemptAt": "Date",
  "sentAt": "Date (nullable)",
  "createdAt": "Date"
}
```

---

## API Endpoints (Internal/Admin)

| Method | Endpoint                        | Deskripsi                |
| ------ | ------------------------------- | ------------------------ |
| GET    | `/api/admin/whatsapp/status`    | Status koneksi WhatsApp  |
| GET    | `/api/admin/whatsapp/qr`        | QR code untuk pairing    |
| POST   | `/api/admin/whatsapp/reconnect` | Reconnect manual         |
| POST   | `/api/admin/whatsapp/test`      | Test kirim pesan WA      |
| GET    | `/api/admin/whatsapp/logs`      | Daftar log pengiriman WA |

**API eksternal (tanpa JWT, pakai API key):** `POST /api/external/whatsapp/send` — dokumentasi lengkap: [whatsapp-external-api.md](./whatsapp-external-api.md).

---

## Catatan Keamanan

- Nomor WhatsApp user **tidak ditampilkan** ke user lain (hanya status "Terdaftar"/"Belum")
- Folder `auth_info/` berisi credentials WhatsApp — **jangan commit ke git**
- Admin panel WhatsApp hanya bisa diakses oleh **super admin** (bukan workspace admin)
- Endpoint admin dilindungi middleware khusus
- Pertimbangkan enkripsi auth state at rest jika server bisa diakses pihak lain

---

## Provider WhatsApp API

### Rekomendasi: Fonnte (fonnte.com)

- **Gratis** untuk penggunaan dasar
- API sederhana (HTTP REST)
- Mendukung pengiriman pesan teks ke nomor WhatsApp
- Tidak memerlukan WhatsApp Business API resmi

### Cara Kerja

1. Daftar akun di Fonnte
2. Hubungkan nomor WhatsApp pengirim (scan QR code)
3. Gunakan API token untuk mengirim pesan

### Alternatif

- **Wablas** (wablas.com) — alternatif gratis Indonesia
- **WhatsApp Gateway** self-hosted (whatsapp-web.js based)

---

## Tipe Pesan yang Dikirim

| Tipe          | Trigger                         | Template Pesan                                          |
| ------------- | ------------------------------- | ------------------------------------------------------- |
| Mention       | Di-mention di teks/komentar     | "📌 [Nama] menyebutmu di [konteks] '[judul]'\n\n[URL]"  |
| Assign Task   | Di-assign ke task               | "📋 [Nama] menugaskan task '[judul]' kepadamu\n\n[URL]" |
| Due Date      | Due date mendekat (H, H-1, H-3) | "⏰ Task '[judul]' jatuh tempo [waktu]\n\n[URL]"        |
| Event Dimulai | Event user dimulai hari ini     | "📅 Event '[judul]' dimulai hari ini\n\n[URL]"          |

---

## Template Pesan

### Format Umum

```
[Emoji] [Deskripsi aksi]

📍 Workspace: [Nama Workspace]
🔗 [URL lengkap ke halaman terkait]
```

### Contoh Pesan

```
📌 Andi menyebutmu di komentar task "Review Desain UI"

📍 Workspace: Project Alpha
🔗 https://app.example.com/workspace/abc/tasks/xyz#comment-123
```

```
📋 Sari menugaskan task "Finalisasi Proposal" kepadamu

📍 Workspace: Project Alpha
🔗 https://app.example.com/workspace/abc/tasks/xyz
```

```
⏰ Task "Setup Database" jatuh tempo besok

📍 Workspace: Project Alpha
🔗 https://app.example.com/workspace/abc/tasks/xyz
```

---

## Alur Pengiriman

```
Aksi terjadi (mention, assign, dll)
      ↓
Backend NotificationService
      ↓
Cek preferensi user:
  - notificationPreferences.[type].whatsapp === true?
  - User punya nomor WhatsApp terdaftar?
      ↓ (jika ya)
Masukkan ke queue pengiriman WhatsApp
      ↓
Worker mengambil dari queue
      ↓
Kirim via Fonnte API
      ↓
Log hasil pengiriman
```

---

## Konfigurasi Backend

### Environment Variables

```env
WHATSAPP_API_URL=https://api.fonnte.com/send
WHATSAPP_API_TOKEN=your-fonnte-api-token
WHATSAPP_SENDER_NUMBER=6281234567890
APP_BASE_URL=https://app.example.com
```

### API Call ke Fonnte

```javascript
// POST https://api.fonnte.com/send
{
  "target": "6281234567890",  // nomor tujuan
  "message": "📌 Andi menyebutmu di...",
  "countryCode": "62"
}
// Header: Authorization: Bearer {token}
```

---

## Rate Limiting & Queue

- Menggunakan **message queue** (Bull/BullMQ dengan Redis, atau simple in-memory queue)
- Rate limit: maks **20 pesan per menit** (sesuaikan dengan limit provider)
- Retry: jika gagal, coba ulang maks 3x dengan delay exponential (1s, 5s, 15s)
- Jika tetap gagal: log error, tidak notifikasi user (fail silently)

---

## Handling User tanpa WhatsApp

- Jika user tidak mendaftarkan nomor WhatsApp:
  - Notifikasi WhatsApp di-skip (tidak ada error)
  - Di halaman profil user: tampilkan **banner reminder**: "Lengkapi nomor WhatsApp untuk menerima notifikasi langsung"
- Banner muncul di:
  - Dashboard (banner atas)
  - Pengaturan Akun (di section WhatsApp)

---

## Struktur Data

### Collection: `whatsapp_logs`

```json
{
  "_id": "ObjectId",
  "recipientId": "ObjectId",
  "recipientNumber": "string",
  "notificationType": "string",
  "message": "string",
  "status": "string (pending|sent|failed)",
  "providerResponse": "object (nullable)",
  "attempts": "number",
  "lastAttemptAt": "Date",
  "sentAt": "Date (nullable)",
  "createdAt": "Date"
}
```

---

## API Endpoints (Internal/Admin)

| Method | Endpoint                   | Deskripsi                |
| ------ | -------------------------- | ------------------------ |
| GET    | `/api/admin/whatsapp-logs` | Daftar log pengiriman WA |
| POST   | `/api/admin/whatsapp/test` | Test kirim pesan WA      |

**API eksternal (tanpa JWT, pakai API key):** `POST /api/external/whatsapp/send` — lihat [whatsapp-external-api.md](./whatsapp-external-api.md).

---

## Catatan Keamanan

- Nomor WhatsApp user **tidak ditampilkan** ke user lain (hanya status "Terdaftar"/"Belum")
- Token API Fonnte disimpan di environment variable (tidak di database)
- Log pengiriman tidak menyimpan konten pesan yang sensitif
