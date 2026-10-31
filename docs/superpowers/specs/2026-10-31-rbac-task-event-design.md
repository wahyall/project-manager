# Design Specification: Role-Based Access Control (RBAC) Task & Event

## 1. Ringkasan & Tujuan
Mengimplementasikan pembatasan akses berbasis peran (RBAC) untuk modul Task dan Event pada tingkat workspace:
- **Owner & Admin**: Memiliki hak akses penuh (CRUD) ke seluruh task dan event dalam workspace.
- **Ketua Divisi** (`role: "leader"` dalam `WorkspaceDivision`):
  - Memiliki hak akses CRUD penuh untuk task dan event yang terhubung dengan divisi yang dipimpinnya.
  - Untuk task/event lintas divisi yang melibatkan divisinya, ketua divisi dapat mengelola task tersebut.
  - Tidak dapat melakukan create/update/delete untuk task/event divisi lain atau task/event tanpa divisi (kecuali task tersebut melibatkan divisinya).
- **Member Biasa** (`role: "member"` di workspace dan bukan leader dari divisi terkait):
  - Hanya dapat **melihat (Read)** dan **memperbarui status (Update Status)**:
    - **Task**: Boleh memindahkan status kolom kanban (`columnId` & `columnOrder`), mencentang status selesai subtask (`isCompleted`), serta menambahkan komentar. Tidak dapat mengedit data pokok (judul, deskripsi, tanggal, assignee, prioritas, divisi, koordinasi) dan tidak dapat membuat atau menghapus task.
    - **Event**: Boleh memperbarui `status` event (`upcoming`, `ongoing`, `completed`). Tidak dapat mengedit tanggal, judul, deskripsi, catatan pemateri, divisi, dan tidak dapat membuat atau menghapus event.
- **Guest** (`role: "guest"`): Tetap *read-only*.

---

## 2. Arsitektur Backend

### 2.1 Helper Otorisasi Terpusat (`server/src/utils/rbacRules.js`)
Dibuat fungsi utilitas untuk mengevaluasi hak akses user terhadap Task dan Event:

1. `getUserLeaderDivisionIds(workspaceId, userId)`:
   - Mengambil array `divisionId` (string) dari `WorkspaceDivision` di mana user terdaftar dengan `role: "leader"`.

2. `canManageTask({ workspace, membership, userLeaderDivisions, task, action, payload })`:
   - `action: "create"`:
     - Jika `owner` / `admin`: **Allow**.
     - Jika Ketua Divisi: Diperbolehkan jika payload task memiliki `divisionId` atau `divisionIds` yang termasuk dalam `userLeaderDivisions`. Ditolak jika membuat task tanpa divisi atau hanya milik divisi lain.
     - Jika Member Biasa: **Reject** (403 Forbidden).
   - `action: "update"`:
     - Jika `owner` / `admin`: **Allow**.
     - Jika Ketua Divisi: **Allow** jika task terkait dengan salah satu divisi yang dipimpinnya (`task.divisionId` atau `task.divisionIds`).
     - Jika Member Biasa:
       - Diperiksa apakah payload update hanya berisi perubahan status (`columnId`, `columnOrder`) atau toggle subtask (`subtasks` yang hanya mengubah `isCompleted`).
       - Jika payload menyertakan perubahan pada field terlindungi (`title`, `description`, `assignees`, `startDate`, `dueDate`, `priority`, `labels`, `divisionId`, `divisionIds`, `coordination`, `blockedBy`, `phase`), tolak dengan 403 Forbidden.
   - `action: "delete"` / `"archive"`:
     - Jika `owner` / `admin`: **Allow**.
     - Jika Ketua Divisi: **Allow** jika task terkait dengan divisi yang dipimpinnya.
     - Jika Member Biasa: **Reject** (403 Forbidden).

3. `canManageEvent({ workspace, membership, userLeaderDivisions, event, action, payload })`:
   - `action: "create"`:
     - Jika `owner` / `admin`: **Allow**.
     - Jika Ketua Divisi: **Allow** jika `payload.divisionId` adalah salah satu divisi yang dipimpinnya.
     - Jika Member Biasa: **Reject** (403 Forbidden).
   - `action: "update"`:
     - Jika `owner` / `admin`: **Allow**.
     - Jika Ketua Divisi: **Allow** jika `event.divisionId` adalah salah satu divisi yang dipimpinnya.
     - Jika Member Biasa:
       - **Allow** HANYA jika payload yang diubah murni adalah `status` (`["upcoming", "ongoing", "completed"]`).
       - **Reject** (403 Forbidden) jika ada field lain (`title`, `description`, `startDate`, `endDate`, `speakerNotes`, `color`, `divisionId`, `ideas`).
   - `action: "delete"`:
     - Jika `owner` / `admin`: **Allow**.
     - Jika Ketua Divisi: **Allow** jika `event.divisionId` adalah salah satu divisi yang dipimpinnya.
     - Jika Member Biasa: **Reject** (403 Forbidden).

### 2.2 Penyesuaian Controller Backend
- **`server/src/controllers/task.controller.js`**:
  - `createTask`: Panggil `canManageTask` (action: "create"). Tolak jika tidak punya hak.
  - `updateTask`: Panggil `canManageTask` (action: "update"). Periksa apakah user adalah member biasa, jika ya pastikan hanya memodifikasi status.
  - `deleteTask`: Panggil `canManageTask` (action: "delete").
  - `archiveTask`, `unarchiveTask`, `bulkArchiveDone`: Panggil `canManageTask` (action: "archive").
- **`server/src/controllers/event.controller.js`**:
  - `createEvent`: Panggil `canManageEvent` (action: "create").
  - `updateEvent`: Panggil `canManageEvent` (action: "update"). Jika member biasa, izinkan hanya perubahan status.
  - `deleteEvent`: Panggil `canManageEvent` (action: "delete").
- **`server/src/controllers/eventPipeline.controller.js`**:
  - `createPipelineTask`, `applyTemplate`: Hanya untuk yang berhak create task pada event tersebut.

---

## 3. Arsitektur Frontend

### 3.1 Permission Helper (`client/lib/permissions.js`)
Helper reaktif untuk konsistensi di antarmuka web:
- `isWorkspaceAdmin(role)`: `["owner", "admin"].includes(role)`.
- `getLeaderDivisions(divisions, userId)`: daftar divisi di mana user adalah `leader`.
- `canUserCreateTask(user, role, divisions, activeDivisionFilter)`:
  - True jika owner/admin.
  - True jika user adalah ketua di minimal 1 divisi.
- `canUserManageTask(task, user, role, divisions)`:
  - True jika owner/admin.
  - True jika user adalah ketua divisi dari divisi yang terkait dengan task tersebut.
- `canUserCreateEvent(user, role, divisions)`:
  - True jika owner/admin atau ketua divisi.
- `canUserManageEvent(event, user, role, divisions)`:
  - True jika owner/admin atau ketua divisi dari event tersebut.

### 3.2 Penyesuaian UI Komponen
1. **Modul Task (`client/app/workspace/[id]/tasks/page.js` & Kanban components)**:
   - Tombol **"Buat Task"** (`+ Buat Task`): Ditampilkan hanya jika user memiliki wewenang (Owner, Admin, atau Ketua Divisi). Untuk member biasa, tombol disembunyikan.
   - Quick create di kolom kanban (`kanban-column.js`): Tombol tambah task cepat disembunyikan untuk member biasa.
   - **`task-detail-panel.js`**:
     - Menu opsi tiga titik: Item "Hapus Task", "Arsipkan", "Unarsipkan" disembunyikan jika bukan pengelola task.
   - **`tab-detail.js`**:
     - Form fields (Judul, Deskripsi, Assignees, Dates, Priority, Labels, Divisi, Koordinasi): Menjadi *disabled/read-only* untuk member biasa.
     - Pilihan Kolom Kanban (Status): Tetap dapat diubah.
     - Subtask Checklist: Checkbox status selesai tetap bisa dicentang; form tambah subtask baru dan tombol hapus subtask disembunyikan.
   - **`bulk-action-bar.js`**:
     - Aksi bulk delete & archive disembunyikan/dinonaktifkan untuk member biasa.

2. **Modul Event (`client/app/workspace/[id]/events/page.js` & Event components)**:
   - Tombol **"Buat Event"**: Disembunyikan untuk member biasa.
   - **`event-overview-tab.js`**:
     - Input judul, deskripsi, tanggal, warna, catatan pemateri, divisi, dan pemilih ide menjadi *read-only* bagi member biasa.
     - Pilihan dropdown Status Event (`upcoming`, `ongoing`, `completed`) tetap aktif dan dapat diubah oleh member biasa.
   - **`client/app/workspace/[id]/events/[eventId]/page.js`**:
     - Menu opsi "Hapus Event" disembunyikan jika user adalah member biasa.

---

## 4. Keamanan & Penanganan Error
- Jika API menerima request ilegal dari user yang tidak berhak: kembalikan respons standar HTTP `403 Forbidden` dengan pesan ramah pengguna berbahasa Indonesia (contoh: `"Hanya owner, admin, dan ketua divisi yang dapat membuat atau mengelola task ini"`).
- Tidak mengandalkan penyembunyian UI semata; backend memvalidasi seluruh payload secara ketat.
