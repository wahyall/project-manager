# Panduan Setup AI Chat Agent (CopilotKit & RAG)

Dokumentasi ini berisi langkah-langkah untuk mengatur environment dan database agar fitur AI Chat Agent yang menggunakan arsitektur RAG (Retrieval-Augmented Generation) dan CopilotKit dapat berjalan dengan baik di server Anda.

## 1. Persiapan Environment Variables (Server)

Fitur AI ini menggunakan API dari Google Generative AI (Gemini). Pastikan Anda telah memiliki API Key dari Google AI Studio.

Buka file `.env` di folder `server/` dan tambahkan/pastikan variabel berikut tersedia:

```env
# Kredensial Google AI Studio (Diperlukan untuk Embedding & Chat)
GOOGLE_AI_API_KEY="AIzaSyA..."

# Konfigurasi Model (Opsional, sudah ada nilai default di kode)
EMBEDDING_MODEL="text-embedding-004"
GEMINI_MODEL="gemini-2.0-flash"

# Konfigurasi RAG (Opsional)
RAG_CHUNK_SIZE=1000
RAG_CHUNK_OVERLAP=200
RAG_TOP_K=10
RAG_SCORE_THRESHOLD=0.6
```

## 2. Membuat Vector Search Index di MongoDB Atlas ⚠️ PENTING

Fitur pencarian pintar (RAG) bergantung pada **MongoDB Atlas Vector Search**. Index ini **TIDAK** bisa dibuat secara otomatis melalui Mongoose, melainkan harus dibuat manual melalui dashboard MongoDB Atlas atau Atlas CLI.

### Langkah-langkah via Dashboard MongoDB Atlas:

1. Login ke [MongoDB Atlas](https://cloud.mongodb.com/).
2. Buka cluster database Anda, lalu pilih tab **Search**.
3. Klik tombol **Create Index**.
4. Pilih **JSON Editor** di bagian pembuatan indeks.
5. Pada panel sebelah kiri:
   - **Database Name**: Pilih nama database Anda (misal: `project-manager`).
   - **Collection Name**: Pilih `embeddings`.
   - **Index Name**: Ketik `embedding_vector_index` (⚠️ Nama ini harus sama persis dengan yang ada di service codebase).
6. Pada panel sebelah kanan (JSON Editor), masukkan konfigurasi berikut:

```json
{
  "fields": [
    {
      "numDimensions": 768,
      "path": "vector",
      "similarity": "cosine",
      "type": "vector"
    },
    {
      "path": "workspaceId",
      "type": "filter"
    },
    {
      "path": "sourceType",
      "type": "filter"
    }
  ]
}
```

7. Klik **Next**, lalu klik **Create Search Index**.
8. Tunggu beberapa saat hingga status index berubah menjadi **Active**.

## 3. Sinkronisasi Data Awal (Manual Re-index)

Setelah Vector Index dibuat dan berhasil _Active_, AI belum mengetahui data lama yang ada di workspace Anda. Anda perlu melakukan proses _synchronization_ sekali untuk mengonversi data-data yang sudah ada ke dalam format _embedding_.

Untuk melakukan ini, buat request **POST** ke endpoint berikut menggunakan Postman atau alat sejenis:

- **Endpoint**: `POST /api/workspaces/:id/embeddings/sync`
- **Headers**:
  - `Authorization`: Bearer _<Token JWT Anda>_ (Catatan: Anda harus login sebagai akun yang memiliki role **Admin / Owner** di workspace tersebut)

Tunggu hingga proses selesai. Waktu yang dibutuhkan tergantung seberapa banyak task, event, komentar, dan aktivitas yang ada di workspace tersebut.

## 4. Memastikan Cron Job Berjalan

Sistem telah dilengkapi dengan Cron Job yang akan melakukan pengecekan data _stale_ (kadaluarsa) setiap jam `03:00` dini hari secara otomatis.
Anda bisa melihat status jalannya cron job ini pada log server:

```
[Cron] Embedding reindex job scheduled at 03:00 AM daily
```

Semua set-up backend telah selesai! Anda kini siap menggunakan layanan Copilot dan RAG melalui antarmuka (frontend).
