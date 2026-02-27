# 🤖 Fitur 23 — AI Chat Agent (RAG + CopilotKit)

## Ringkasan

AI Chat Agent adalah asisten cerdas berbasis **Gemini 2.0 Flash** yang terintegrasi di dalam workspace. Menggunakan **CopilotKit** untuk UI chat dan runtime, serta **RAG (Retrieval-Augmented Generation)** dengan **MongoDB Atlas Vector Search** untuk menjawab pertanyaan berdasarkan seluruh data workspace. AI bisa melakukan aksi langsung seperti membuat task, mengupdate status, membuat event, dan memberikan ringkasan serta saran cerdas.

Fitur ini masuk dalam **Fase 7 — AI Features** dan di-scope **per workspace** (AI hanya mengetahui data workspace yang sedang aktif). Chat history bersifat **session-only** — hilang saat user menutup atau me-refresh halaman.

---

## Halaman & UI

### Halaman AI Chat (Dedicated Page)

- **Route**: `/workspace/:id/ai-chat`
- Halaman penuh (bukan sidebar atau popup)
- Navigasi dari sidebar kiri — menu "AI Chat" dengan ikon robot/sparkle
- Akses: semua role (**Owner**, **Admin**, **Member**) kecuali **Guest**

### Layout Halaman

```
┌─────────────────────────────────────────────────┐
│  🤖 AI Chat Agent              [Workspace Name] │
├─────────────────────────────────────────────────┤
│                                                 │
│  Selamat datang! Saya AI asisten untuk          │
│  workspace ini. Saya bisa membantu:             │
│                                                 │
│  • Menjawab pertanyaan tentang task & event     │
│  • Membuat atau mengupdate task                 │
│  • Memberikan ringkasan workspace               │
│  • Saran prioritas dan distribusi kerja         │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ 💡 Saran pertanyaan:                    │    │
│  │ "Apa saja task yang overdue?"           │    │
│  │ "Buatkan task review proposal untuk..." │    │
│  │ "Ringkasan progress minggu ini"         │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  [Bot] Berdasarkan data workspace, ada 3 task   │
│  yang overdue: ...                              │
│                                                 │
│  [User] Assign task "Review Proposal" ke Budi   │
│                                                 │
│  [Bot] ✅ Task "Review Proposal" berhasil       │
│  di-assign ke Budi Santoso.                     │
│                                                 │
├─────────────────────────────────────────────────┤
│  [📎] Ketik pesan...                    [Kirim] │
└─────────────────────────────────────────────────┘
```

### Elemen UI

| Elemen | Deskripsi |
| --- | --- |
| Header | Judul "AI Chat Agent" + nama workspace aktif |
| Welcome Message | Pesan pembuka dengan daftar kemampuan AI |
| Suggestion Chips | Saran pertanyaan yang bisa diklik langsung |
| Chat Bubble — User | Pesan dari user, rata kanan, warna aksen |
| Chat Bubble — Bot | Pesan dari AI, rata kiri, dengan avatar bot |
| Action Confirmation | Card khusus saat AI berhasil melakukan aksi (buat task, dll) |
| Input Area | Text input + tombol kirim, mendukung Enter untuk kirim |
| Typing Indicator | Animasi "AI sedang mengetik..." saat menunggu respons |
| Streaming Text | Respons AI ditampilkan secara streaming (karakter per karakter) |

---

## Kemampuan AI Agent

### 1. Tanya Jawab (Q&A) Berbasis Data Workspace

AI bisa menjawab pertanyaan tentang semua data dalam workspace berdasarkan konteks RAG:

| Contoh Pertanyaan | Sumber Data |
| --- | --- |
| "Apa saja task yang overdue?" | Tasks |
| "Siapa yang paling banyak task aktif?" | Tasks + Members |
| "Event apa yang akan datang minggu ini?" | Events |
| "Apa yang berubah hari ini di workspace?" | Activity Logs |
| "Berapa jumlah task Done di event Demo Q1?" | Tasks + Events |
| "Siapa saja member di workspace ini?" | Members |

### 2. Buat Task Baru

User bisa meminta AI membuat task dengan bahasa natural:

**Contoh:**
- "Buatkan task review proposal untuk Budi deadline besok"
- "Buat task urgent: fix bug login, prioritas critical, assign ke Sari"

**Parameter yang dipahami AI:**

| Parameter | Contoh Ekspresi |
| --- | --- |
| Judul | "review proposal", "fix bug login" |
| Assignee | "untuk Budi", "assign ke Sari" |
| Due Date | "deadline besok", "tanggal 15 Maret", "minggu depan" |
| Prioritas | "urgent", "prioritas tinggi", "critical" |
| Status | "langsung in progress", "taruh di review" |
| Event | "untuk event Demo Q1" |

**Alur:**
1. AI menginterpretasi pesan user
2. AI menampilkan preview task yang akan dibuat
3. AI meminta konfirmasi: "Saya akan membuat task berikut: [detail]. Lanjutkan?"
4. User konfirmasi → task dibuat via API
5. AI menampilkan konfirmasi sukses dengan link ke task

### 3. Update Task

User bisa meminta AI mengubah task yang sudah ada:

**Contoh:**
- "Pindahkan task 'Review Proposal' ke Done"
- "Ubah prioritas task 'Fix Bug' jadi critical"
- "Ubah deadline task 'Desain UI' ke hari Jumat"

**Field yang bisa diubah:** status, assignee, prioritas, due date, start date, label

### 4. Buat Event Baru

**Contoh:**
- "Buat event Sprint Review pada tanggal 20-21 Maret"
- "Buat event Demo Product, mulai besok sampai lusa, warna biru"

### 5. Assign / Unassign Member

**Contoh:**
- "Assign Budi ke task 'Review Proposal'"
- "Tambahkan Sari sebagai peserta event Demo Q1"
- "Hapus Andi dari task 'Fix Bug Login'"

### 6. Ringkasan Workspace

AI bisa memberikan ringkasan data workspace:

**Contoh:**
- "Berikan ringkasan workspace hari ini"
- "Apa progress minggu ini?"
- "Ringkasan task per member"

**Isi ringkasan mencakup:**
- Jumlah task per status (To Do, In Progress, Review, Done)
- Task overdue dan mendekati deadline
- Event yang sedang berlangsung dan akan datang
- Aktivitas terkini (5-10 terbaru)
- Statistik per member (jumlah task aktif, selesai)

### 7. Saran Cerdas

AI memberikan rekomendasi berdasarkan analisis data workspace:

**Contoh:**
- "Ada saran untuk distribusi task?"
- "Task mana yang harus diprioritaskan?"
- "Siapa yang workload-nya paling ringan?"

**Jenis saran:**

| Saran | Deskripsi |
| --- | --- |
| Prioritas | Task yang seharusnya diprioritaskan berdasarkan deadline dan dependency |
| Distribusi Kerja | Member yang workload-nya terlalu berat atau terlalu ringan |
| Deadline Warning | Task yang berisiko terlambat berdasarkan progress saat ini |
| Bottleneck | Kolom kanban yang task-nya menumpuk |
| Unassigned | Task yang belum memiliki assignee |

---

## Arsitektur Teknis

### Diagram Arsitektur

```
┌──────────────────────────────────────────────────────────────────┐
│ Frontend (Next.js)                                               │
│                                                                  │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────────┐  │
│  │ CopilotKit  │   │ useCopilot   │   │ useCopilotReadable   │  │
│  │ <CopilotChat│   │ Action()     │   │ (workspace context)  │  │
│  │  /> UI      │   │ hooks        │   │                      │  │
│  └──────┬──────┘   └──────────────┘   └──────────────────────┘  │
│         │                                                        │
└─────────┼────────────────────────────────────────────────────────┘
          │ HTTP (streaming)
          ▼
┌──────────────────────────────────────────────────────────────────┐
│ Backend (Express.js)                                             │
│                                                                  │
│  ┌──────────────────┐   ┌───────────────┐   ┌────────────────┐  │
│  │ CopilotKit       │   │ RAG Service   │   │ AI Actions     │  │
│  │ Runtime          │──▶│ (retrieve     │   │ Service        │  │
│  │ /api/copilotkit  │   │  context)     │   │ (CRUD via API) │  │
│  └────────┬─────────┘   └───────┬───────┘   └────────────────┘  │
│           │                     │                                │
└───────────┼─────────────────────┼────────────────────────────────┘
            │                     │
            ▼                     ▼
┌────────────────┐   ┌─────────────────────────────┐
│ Google Gemini  │   │ MongoDB Atlas                │
│ 2.0 Flash      │   │                             │
│ (LLM)          │   │  ┌────────────────────────┐ │
│                │   │  │ embeddings collection  │ │
│ text-embedding │   │  │ (Vector Search Index)  │ │
│ -004           │   │  └────────────────────────┘ │
│ (Embeddings)   │   │  ┌────────────────────────┐ │
│                │   │  │ tasks, events, members │ │
│                │   │  │ comments, activity_logs│ │
└────────────────┘   │  └────────────────────────┘ │
                     └─────────────────────────────┘
```

### Alur Request

```
User mengetik pesan
       │
       ▼
CopilotKit Chat UI mengirim pesan ke CopilotKit Runtime
       │
       ▼
Runtime mengidentifikasi intent:
       │
       ├── Q&A → RAG Service
       │         │
       │         ├── Generate embedding dari pertanyaan user
       │         ├── Vector similarity search (scoped ke workspaceId)
       │         ├── Ambil top-K dokumen relevan
       │         ├── Bangun prompt: system + context + pertanyaan
       │         └── Kirim ke Gemini 2.0 Flash → stream respons
       │
       └── Aksi → CopilotKit Action
                  │
                  ├── AI menentukan action mana yang dipanggil
                  ├── Validasi parameter
                  ├── Eksekusi aksi via internal API/service
                  └── Kembalikan konfirmasi ke user
```

---

## RAG (Retrieval-Augmented Generation)

### Sumber Data yang Di-Index

Semua data workspace berikut di-embed ke vector store:

| Sumber | Konten yang Di-embed | Metadata |
| --- | --- | --- |
| Tasks | Judul + deskripsi (plain text) + status + assignee names + priority + labels + due date | taskId, status, priority, assignees, dueDate |
| Events | Judul + deskripsi + tanggal mulai/selesai + status + participant names | eventId, status, startDate, endDate |
| Comments | Isi komentar (plain text) + konteks (di task/event mana) | commentId, targetType, targetId |
| Activity Logs | Deskripsi aksi + nama pelaku + nama objek | logId, actionType, actorName, createdAt |
| Members | Nama + email + role di workspace | userId, role, email |
| Spreadsheet | Nama sheet + nama kolom + ringkasan data (baris pertama beberapa rows) | sheetId, eventId |

### Embedding Strategy

**Model**: Google `text-embedding-004` (768 dimensi)

**Chunking**:
- Setiap dokumen (task, event, comment, dll) di-embed sebagai **satu chunk**
- Jika deskripsi task/event terlalu panjang (>1000 karakter), dipecah menjadi beberapa chunk dengan overlap 100 karakter
- Setiap chunk menyimpan metadata untuk filtering dan referensi

**Sync Strategy**:

| Trigger | Mekanisme | Keterangan |
| --- | --- | --- |
| CRUD Task | Hook di controller | Setiap create/update/delete task → update embedding |
| CRUD Event | Hook di controller | Setiap create/update/delete event → update embedding |
| Komentar Baru | Hook di controller | Setiap create/edit/delete komentar → update embedding |
| Activity Log | Hook di service | Setiap log dibuat → embed |
| Member Join/Leave | Hook di controller | Update daftar member workspace |
| Spreadsheet Update | Hook di controller | Re-embed summary saat sheet/kolom berubah |
| Full Re-index | Cron job (opsional) | Re-index seluruh workspace (sebagai fallback, misal 1x sehari jam 03:00) |

### Vector Search Query

Saat user bertanya, alur pencarian:

1. Generate embedding dari pertanyaan user menggunakan `text-embedding-004`
2. Jalankan MongoDB Atlas Vector Search:
   - Filter: `workspaceId` harus cocok dengan workspace aktif
   - Opsional filter tambahan: `sourceType` jika pertanyaan spesifik ke tipe data tertentu
   - Top-K: 10 dokumen paling relevan (configurable)
   - Score threshold: > 0.7 (configurable)
3. Gabungkan konten dokumen yang relevan menjadi context string
4. Kirim ke Gemini bersama system prompt dan pertanyaan user

---

## CopilotKit Integration

### Backend — CopilotKit Runtime (Express.js)

CopilotKit Runtime di-host sebagai endpoint Express.js di backend yang sudah ada:

**Endpoint**: `POST /api/copilotkit`

**Setup**:
- Menggunakan package `@copilotkit/runtime`
- Adapter: Express.js (`CopilotRuntime` dengan `GoogleGenerativeAIAdapter`)
- LLM: Gemini 2.0 Flash via `@google/generative-ai`
- Runtime menangani: streaming, message history (in-memory), tool calling

**System Prompt** yang diberikan ke LLM:

```
Kamu adalah AI asisten untuk workspace "{workspaceName}" di aplikasi Project Management.
Kamu hanya mengetahui data dari workspace ini.

Kemampuanmu:
1. Menjawab pertanyaan berdasarkan data workspace (task, event, member, activity)
2. Membuat task baru jika diminta
3. Mengupdate task yang ada
4. Membuat event baru
5. Assign/unassign member ke task atau event
6. Memberikan ringkasan dan statistik workspace
7. Memberikan saran cerdas (prioritas, distribusi kerja, deadline warning)

Aturan:
- Selalu jawab dalam bahasa yang sama dengan pertanyaan user
- Jika tidak yakin, tanyakan klarifikasi kepada user
- Saat melakukan aksi (buat/update), selalu konfirmasi detail sebelum eksekusi
- Jika data tidak ditemukan, sampaikan dengan jelas
- Format respons dengan markdown jika sesuai (bold, list, tabel)
- Gunakan nama member (bukan ID) saat menyebut user
- Sertakan konteks waktu (tanggal, relatif) saat relevan
```

### Frontend — CopilotKit Provider & Chat

**Provider**: `<CopilotKit>` wrapper di layout workspace dengan `runtimeUrl` mengarah ke backend

**Chat UI**: Menggunakan komponen bawaan CopilotKit (`<CopilotChat />`) dengan kustomisasi styling agar sesuai tema aplikasi (shadcn/ui + Tailwind)

**useCopilotReadable**: Menyediakan konteks workspace ke AI:
- Nama workspace, jumlah member, jumlah task aktif
- Daftar kolom kanban yang tersedia
- Daftar member (nama + role)
- Daftar event aktif

**useCopilotAction**: Mendefinisikan aksi yang bisa dilakukan AI:
- `createTask` — buat task baru
- `updateTask` — update field task
- `createEvent` — buat event baru
- `assignMember` — assign member ke task/event
- `searchData` — cari data workspace
- `getWorkspaceSummary` — ambil ringkasan
- `suggestActions` — dapatkan saran cerdas

---

## CopilotKit Actions (Detail)

### Action: `createTask`

| Parameter | Tipe | Required | Deskripsi |
| --- | --- | --- | --- |
| title | string | ✅ | Judul task |
| description | string | ❌ | Deskripsi task |
| assigneeEmails | string[] | ❌ | Email member yang di-assign |
| dueDate | string | ❌ | Tanggal deadline (ISO format) |
| startDate | string | ❌ | Tanggal mulai (ISO format) |
| priority | string | ❌ | `low` / `medium` / `high` / `critical` (default: `medium`) |
| columnId | string | ❌ | ID kolom kanban (default: kolom pertama) |
| eventId | string | ❌ | ID event terkait |
| labels | string[] | ❌ | Nama label yang di-assign |

**Return**: `{ success: true, task: { id, title, url } }`

### Action: `updateTask`

| Parameter | Tipe | Required | Deskripsi |
| --- | --- | --- | --- |
| taskIdentifier | string | ✅ | Judul task atau task ID |
| updates | object | ✅ | Object berisi field yang diubah |

**`updates` bisa berisi**: `title`, `status`/`columnId`, `assigneeEmails`, `dueDate`, `startDate`, `priority`, `labels`, `eventId`

**Return**: `{ success: true, task: { id, title, changes: [...] } }`

### Action: `createEvent`

| Parameter | Tipe | Required | Deskripsi |
| --- | --- | --- | --- |
| title | string | ✅ | Judul event |
| description | string | ❌ | Deskripsi event |
| startDate | string | ✅ | Tanggal mulai (ISO format) |
| endDate | string | ✅ | Tanggal selesai (ISO format) |
| color | string | ❌ | Warna label hex (default: #3B82F6) |
| participantEmails | string[] | ❌ | Email peserta |

**Return**: `{ success: true, event: { id, title, url } }`

### Action: `assignMember`

| Parameter | Tipe | Required | Deskripsi |
| --- | --- | --- | --- |
| action | string | ✅ | `assign` atau `unassign` |
| targetType | string | ✅ | `task` atau `event` |
| targetIdentifier | string | ✅ | Judul atau ID task/event |
| memberEmail | string | ✅ | Email member |

**Return**: `{ success: true, message: "..." }`

### Action: `searchData`

| Parameter | Tipe | Required | Deskripsi |
| --- | --- | --- | --- |
| query | string | ✅ | Kata kunci pencarian |
| type | string | ❌ | Filter tipe: `task` / `event` / `member` / `all` (default: `all`) |
| filters | object | ❌ | Filter tambahan: `status`, `assignee`, `priority`, `dateRange` |

**Return**: `{ results: [{ type, id, title, summary, url }], totalCount: number }`

### Action: `getWorkspaceSummary`

| Parameter | Tipe | Required | Deskripsi |
| --- | --- | --- | --- |
| timeRange | string | ❌ | `today` / `this_week` / `this_month` (default: `this_week`) |

**Return**: `{ taskStats: {...}, eventStats: {...}, recentActivity: [...], memberStats: [...] }`

### Action: `suggestActions`

| Parameter | Tipe | Required | Deskripsi |
| --- | --- | --- | --- |
| focusArea | string | ❌ | `priority` / `workload` / `deadline` / `general` (default: `general`) |

**Return**: `{ suggestions: [{ type, title, description, actionable: boolean, suggestedAction: {...} }] }`

---

## Chat History

- **Session-only**: Chat history disimpan di memory browser selama sesi aktif
- **Tidak di-persist** ke database — hilang saat refresh atau tutup tab
- CopilotKit mengelola message history secara internal
- Saat user membuka halaman AI Chat, selalu dimulai dengan welcome message baru

---

## Keamanan & Otorisasi

### Akses

| Role | Akses AI Chat |
| --- | --- |
| Owner | ✅ Full akses (Q&A + semua aksi) |
| Admin | ✅ Full akses (Q&A + semua aksi) |
| Member | ✅ Q&A + aksi terbatas (buat task, update task milik sendiri) |
| Guest | ❌ Tidak bisa mengakses AI Chat |

### Validasi Aksi

- Semua aksi yang dilakukan AI melalui handler yang sama dengan API reguler
- RBAC tetap berlaku — AI tidak bisa melakukan aksi yang user-nya tidak punya izin
- Contoh: Member tidak bisa menghapus workspace via AI chat

### Rate Limiting

- Maks **30 pesan per menit** per user
- Maks **500 pesan per hari** per user
- Maks **10 aksi (create/update)** per menit per user
- Jika limit tercapai, AI merespons: "Kamu sudah mencapai batas penggunaan. Coba lagi nanti."

### Data Isolation

- AI hanya bisa mengakses data dari workspace yang sedang aktif
- Embedding dan vector search selalu di-filter berdasarkan `workspaceId`
- Tidak ada cross-workspace data leakage

---

## Struktur Data

### Collection: `embeddings`

```json
{
  "_id": "ObjectId",
  "workspaceId": "ObjectId (ref: workspaces)",
  "sourceType": "string (task|event|comment|activity|member|spreadsheet)",
  "sourceId": "ObjectId",
  "chunkIndex": "number (default: 0, untuk multi-chunk)",
  "content": "string (teks yang di-embed)",
  "embedding": "[Number] (array 768 dimensi, text-embedding-004)",
  "metadata": {
    "title": "string (nullable)",
    "status": "string (nullable)",
    "assignees": ["string (nama)"],
    "priority": "string (nullable)",
    "sourceUrl": "string (relative URL ke halaman sumber)"
  },
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### MongoDB Atlas Vector Search Index

```json
{
  "name": "embedding_vector_index",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      {
        "type": "vector",
        "path": "embedding",
        "numDimensions": 768,
        "similarity": "cosine"
      },
      {
        "type": "filter",
        "path": "workspaceId"
      },
      {
        "type": "filter",
        "path": "sourceType"
      }
    ]
  }
}
```

### Index Tambahan

- `{ workspaceId: 1, sourceType: 1, sourceId: 1 }` — untuk upsert embedding saat sync
- `{ workspaceId: 1, updatedAt: 1 }` — untuk batch re-index

---

## API Endpoints

| Method | Endpoint | Deskripsi | Auth | Akses |
| --- | --- | --- | --- | --- |
| POST | `/api/copilotkit` | CopilotKit Runtime endpoint (streaming) | ✅ | Member+ |
| POST | `/api/workspaces/:id/embeddings/sync` | Trigger manual re-index embeddings | ✅ | Admin+ |
| GET | `/api/workspaces/:id/embeddings/stats` | Statistik jumlah embeddings per tipe | ✅ | Admin+ |

---

## Halaman Terkait

| Halaman | Route | Akses |
| --- | --- | --- |
| AI Chat | `/workspace/:id/ai-chat` | Member+ |

---

## Konfigurasi Environment

Variabel environment baru yang diperlukan:

```env
# Google AI
GOOGLE_AI_API_KEY=           # API key untuk Gemini & Embedding
GEMINI_MODEL=gemini-2.0-flash  # Model LLM (default: gemini-2.0-flash)
EMBEDDING_MODEL=text-embedding-004  # Model embedding (default: text-embedding-004)

# RAG Configuration
RAG_TOP_K=10                 # Jumlah dokumen yang diambil dari vector search
RAG_SCORE_THRESHOLD=0.7      # Minimum similarity score
RAG_CHUNK_SIZE=1000          # Maks karakter per chunk sebelum dipecah
RAG_CHUNK_OVERLAP=100        # Overlap karakter antar chunk

# Rate Limiting
AI_CHAT_RATE_LIMIT_PER_MIN=30    # Maks pesan per menit per user
AI_CHAT_RATE_LIMIT_PER_DAY=500   # Maks pesan per hari per user
AI_ACTION_RATE_LIMIT_PER_MIN=10  # Maks aksi per menit per user
```

---

## Tech Stack Terkait

| Komponen | Package |
| --- | --- |
| Chat UI (Frontend) | `@copilotkit/react-core`, `@copilotkit/react-ui` |
| CopilotKit Runtime (Backend) | `@copilotkit/runtime` |
| LLM | `@google/generative-ai` (Gemini 2.0 Flash) |
| Embeddings | `@google/generative-ai` (text-embedding-004) |
| Vector Store | MongoDB Atlas Vector Search (native) |
| RAG Orchestration | `@langchain/google-genai`, `@langchain/mongodb` |
| Streaming | CopilotKit built-in SSE streaming |

---

## Contoh Percakapan

### Contoh 1: Tanya Jawab

```
User: Apa saja task yang overdue di workspace ini?

Bot:  Berdasarkan data workspace, ada **3 task** yang melewati deadline:

| Task | Assignee | Due Date | Status |
|------|----------|----------|--------|
| Desain Landing Page | Budi | 20 Feb 2026 | In Progress |
| Review Copywriting | Sari | 22 Feb 2026 | To Do |
| Setup Database | Andi | 24 Feb 2026 | In Progress |

Apakah kamu ingin saya membantu mengupdate prioritas atau deadline task-task ini?
```

### Contoh 2: Buat Task

```
User: Buatkan task review proposal untuk Budi, deadline hari Jumat, prioritas high

Bot:  Saya akan membuat task berikut:

📋 **Review Proposal**
- Assignee: Budi Santoso
- Due Date: Jumat, 28 Feb 2026
- Prioritas: High
- Status: To Do

Lanjutkan?

User: Ya

Bot:  ✅ Task **"Review Proposal"** berhasil dibuat dan di-assign ke Budi Santoso.
[Lihat Task →](/workspace/abc123/tasks/kanban)
```

### Contoh 3: Ringkasan

```
User: Ringkasan progress minggu ini

Bot:  📊 **Ringkasan Workspace "Project Alpha" — Minggu Ini**

**Task:**
- ✅ Selesai: 8 task
- 🔄 In Progress: 5 task
- ⏰ Overdue: 3 task
- 📝 Baru dibuat: 12 task

**Event:**
- 🟢 Berlangsung: Sprint Review (25-27 Feb)
- 📅 Akan datang: Demo Product (3 Mar)

**Top Kontributor Minggu Ini:**
1. Sari — 4 task selesai
2. Budi — 3 task selesai
3. Andi — 1 task selesai

**⚠️ Perlu Perhatian:**
- 3 task overdue (lihat detail di atas)
- 2 task tanpa assignee
- Event "Demo Product" belum ada task terkait
```

### Contoh 4: Saran Cerdas

```
User: Ada saran untuk distribusi kerja tim?

Bot:  💡 **Saran Distribusi Kerja:**

1. **Budi Santoso** memiliki **8 task aktif** (3 di antaranya overdue)
   → Saran: Redistribusi 2-3 task ke member lain

2. **Reza Pratama** hanya punya **1 task aktif**
   → Saran: Bisa menerima task tambahan dari Budi

3. **Task "Finalisasi Anggaran"** belum punya assignee dan deadline 2 hari lagi
   → Saran: Assign ke Reza yang workload-nya ringan

Apakah kamu ingin saya melakukan salah satu saran di atas?
```

