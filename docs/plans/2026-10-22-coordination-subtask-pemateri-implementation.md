# Koordinasi Multi-Divisi, Checklist Subtask, dan Catatan Pemateri — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Menyelesaikan item TODO koordinasi antar-divisi dan masukan pemateri dengan task multi-divisi, checklist subtask ber-PIC, dan catatan pemateri di Overview Event.

**Architecture:** Task tetap menjadi sumber utama koordinasi. `Task` menyimpan `divisionIds`, `divisionPics`, dan `coordination`; subtask menyimpan PIC/divisi/deadline/catatan/metadata penyelesaian. Scope query task memakai helper baru yang mencocokkan `divisionId` lama maupun `divisionIds` baru. Event hanya mendapat field `speakerNotes`.

**Tech Stack:** Next.js App Router, React, Tailwind/shadcn, Express, Mongoose, Socket.io.

---

## Task 1: Backend data model dan service divisi task

**Files:**
- Modify: `server/src/models/Task.js`
- Create: `server/src/services/taskDivision.service.js`

**Step 1: Tambah field Task**

- `divisionIds: [ObjectId]`, default `[]`
- `divisionPics: [{ divisionId, userId }]`, default `[]`
- `coordination: { constraints, helpNeeded, followUp }`, default `{}`
- Subtask: `divisionId`, `dueDate`, `notes`, `completedBy`, `completedAt`
- Index `divisionIds` dan `divisionPics.userId`
- Pre-validate: deduplikasi `divisionIds`, masukkan `divisionId` ke `divisionIds`, isi `divisionId` dari item pertama bila kosong.

**Step 2: Buat service**

`taskDivision.service.js` menyediakan:
- `toIdString(value)`
- `resolveTaskDivisions({ workspaceId, primaryDivisionId, divisionIds })`
- `normalizeDivisionPics({ workspaceId, divisionPics, divisions })`
- `canManageTaskDivisions({ workspaceId, task, userId, role, nextDivisionIds })`

Validasi:
- semua divisi milik workspace
- satu divisi hanya satu PIC
- PIC harus anggota divisi dan workspace
- hanya creator/admin/owner/ketua divisi terkait yang boleh mengubah divisi/PIC

**Step 3: Verifikasi sintaks**

Run: `node --check server/src/models/Task.js`
Run: `node --check server/src/services/taskDivision.service.js`

---

## Task 2: Backend scope dan query task multi-divisi

**Files:**
- Modify: `server/src/utils/divisionScope.js`
- Modify: `server/src/controllers/task.controller.js`
- Modify: `server/src/controllers/calendar.controller.js`
- Modify: `server/src/controllers/export.controller.js`
- Modify: `server/src/services/export.service.js`

**Step 1: Helper scope**

Tambahkan:
- `buildTaskDivisionScope({ workspaceId, userId, role, divisionParam })`
- `applyTaskDivisionScope({ filter, ... })`
- `canViewTask({ task, workspaceId, userId, role })`
- `assertCanViewTask(args)`

Clause task:
```js
{
  $or: [
    { divisionId: { $in: ids } },
    { divisionIds: { $in: ids } },
    { divisionId: null, divisionIds: { $size: 0 } },
    { divisionId: null, divisionIds: { $exists: false } },
  ],
}
```

**Step 2: List/detail/create/update**

- `listTasks` memakai `applyTaskDivisionScope`.
- `createTask` dan `updateTask` memakai service divisi + validasi PIC/subtask.
- `getTask` memakai `assertCanViewTask`.
- Populate `divisionIds`, `divisionPics`, `subtasks.assignee`, `subtasks.divisionId`, `subtasks.completedBy`.

**Step 3: Calendar**

Gabungkan clause scope task dan `$or` tanggal dengan `$and` agar tidak saling menimpa.

**Step 4: Export**

`scopeExportFilters` menyimpan `filters.divisionScope`; `buildTaskFilter` memakai `$and: [divisionScope]`.

---

## Task 3: Backend penyelesaian subtask dan notifikasi

**Files:**
- Modify: `server/src/controllers/task.controller.js`

**Step 1: Sinkronisasi subtask**

- Cocokkan subtask lama berdasarkan `_id`.
- Saat `isCompleted` berubah `false → true`: isi `completedBy` dan `completedAt`.
- Saat `true → false`: kosongkan keduanya.
- Tolak perubahan status jika user bukan assignee, creator, atau owner/admin.
- Validasi assignee workspace/divisi.
- Validasi `divisionId` subtask ada di `divisionIds` task.

**Step 2: Notifikasi**

- PIC divisi baru → `assign_task`
- Subtask baru di-assign → `assign_task`
- Subtask selesai → `task_update`
- Semua subtask selesai → `task_update` sekali saat transisi terakhir
- Status/prioritas/tanggal berubah → notifikasi lama tetap dipertahankan

**Step 3: Verifikasi**

Run: `node --check server/src/controllers/task.controller.js`

---

## Task 4: Backend catatan pemateri event

**Files:**
- Modify: `server/src/models/Event.js`
- Modify: `server/src/controllers/event.controller.js`

**Step 1: Model**

Tambah `speakerNotes: String`, default `""`, maxlength 50000.

**Step 2: Controller**

- Create/update menerima `speakerNotes`.
- Activity log mencatat perubahan `speakerNotes`.
- Mention baru di `speakerNotes` mengirim notifikasi `mention`.

**Step 3: Event tasks**

Populate `divisionIds`, `divisionPics`, dan `subtasks.assignee` di `getEventTasks`.

---

## Task 5: Frontend detail task — koordinasi dan subtask

**Files:**
- Create: `client/components/kanban/coordination-section.js`
- Modify: `client/components/kanban/tab-detail.js`
- Modify: `client/components/kanban/subtask-checklist.js`
- Modify: `client/components/kanban/task-detail-panel.js`
- Modify: `client/app/workspace/[id]/tasks/page.js`

**Step 1: CoordinationSection**

- Selector divisi utama.
- Multi-select divisi terlibat.
- Satu PIC per divisi.
- Textarea kendala, bantuan, tindak lanjut.
- Divisi event terkunci sebagai divisi utama.
- Kontrol divisi/PIC disabled untuk non-manager.

**Step 2: SubtaskChecklist**

- Checkbox hanya aktif untuk PIC, creator, atau owner/admin.
- Form tambah subtask mendukung PIC, divisi, deadline, catatan.
- Baris subtask menampilkan PIC, divisi, deadline, catatan.
- Item selesai diurutkan ke bawah.
- Progress bar tetap.

**Step 3: Wiring**

- `TabDetail` menerima `memberRole` dan `canManageCoordination`.
- `TaskDetailPanel` meneruskan `memberRole`.
- Halaman task mengirim role workspace.

---

## Task 6: Frontend kartu task, filter, dan event tasks

**Files:**
- Modify: `client/components/kanban/task-card.js`
- Modify: `client/hooks/use-kanban.js`
- Modify: `client/components/events/event-tasks-tab.js`
- Modify: `client/app/workspace/[id]/tasks/page.js`
- Modify: `client/components/kanban/quick-create-modal.js`

**Step 1: Task card**

- Tampilkan chip semua divisi terlibat.
- Tampilkan avatar PIC per divisi (maksimal 3 + `+n`).

**Step 2: Filter client**

- Filter divisi mencocokkan `divisionIds` atau `divisionId`.

**Step 3: Event tasks**

- Toggle “Koordinasi” untuk task dengan lebih dari satu divisi.
- Tampilkan chip divisi dan PIC.
- “Buat Task” membawa `eventId` dan memilih event otomatis.

**Step 4: Quick create**

- Tambah `defaultEventId`; reset event saat modal dibuka.
- Divisi mengikuti event.

---

## Task 7: Frontend catatan pemateri

**Files:**
- Modify: `client/components/events/event-overview-tab.js`
- Modify: `client/app/workspace/[id]/events/[eventId]/page.js`

**Step 1: Overview card**

- Card “Masukan Pemateri / Narasumber”.
- MentionEditor + MentionReadOnly.
- Debounced auto-save 800ms.
- Placeholder saat kosong.
- Read-only untuk guest.

**Step 2: Wiring**

- Kirim `readOnly={currentWorkspace?.role === "guest"}`.

---

## Task 8: Verifikasi dan TODO

**Step 1: Sintaks backend**

Run:
```bash
node --check server/src/models/Task.js
node --check server/src/models/Event.js
node --check server/src/utils/divisionScope.js
node --check server/src/services/taskDivision.service.js
node --check server/src/controllers/task.controller.js
node --check server/src/controllers/calendar.controller.js
node --check server/src/controllers/export.controller.js
node --check server/src/controllers/event.controller.js
```

**Step 2: Lint/build client**

Run:
```bash
cd client
npm run lint
npm run build
```

**Step 3: Manual smoke test**

- Buat task dengan 2 divisi dan PIC berbeda.
- Tambah subtask dengan PIC/divisi/deadline.
- Centang sebagai PIC; pastikan non-PIC tidak bisa.
- Pastikan task muncul di board kedua divisi.
- Buka event, isi catatan pemateri, reload.
- Buka tab Task event, aktifkan filter Koordinasi.

**Step 4: Update `TODO.md`**

Centang item 4 (koordinasi antar-divisi, pemateri), item 5 (multi-divisi, divisi peminta/terkait, PIC, kolom koordinasi), dan item 7 hak akses data sensitif yang sudah diverifikasi sebelumnya.
