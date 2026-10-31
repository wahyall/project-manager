# RBAC Task & Event Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengimplementasikan RBAC (Role-Based Access Control) di mana hanya Owner, Admin, dan Ketua Divisi terkait yang dapat melakukan pengelolaan CRUD penuh pada Task dan Event, sementara Member Biasa hanya bisa melihat dan memperbarui status (kolom kanban & toggle checklist subtask pada task, serta status pada event).

**Architecture:** Membangun domain authorization helper terpusat di backend (`server/src/utils/rbacRules.js`) yang mengecek keanggotaan workspace dan status `leader` di `WorkspaceDivision`. Menegakkan aturan ini pada controller Task dan Event, serta mengintegrasikan helper izin di frontend (`client/lib/permissions.js`) untuk menyesuaikan antarmuka secara adaptif dan aman.

**Tech Stack:** Node.js, Express, Mongoose, Next.js (App Router), React, Tailwind CSS.

---

### Task 1: Backend RBAC Helper (`server/src/utils/rbacRules.js`)

**Files:**
- Create: `server/src/utils/rbacRules.js`
- Test: `server/test-rbac-rules.js`

- [ ] **Step 1: Write test script for RBAC rules helper**

```javascript
// server/test-rbac-rules.js
const assert = require("assert");
const {
  isWorkspaceAdmin,
  isTaskStatusOnlyPayload,
  isEventStatusOnlyPayload,
  canManageTaskSync,
  canManageEventSync,
} = require("./src/utils/rbacRules");

console.log("Running RBAC rules unit tests...");

// 1. isWorkspaceAdmin
assert.strictEqual(isWorkspaceAdmin("owner"), true);
assert.strictEqual(isWorkspaceAdmin("admin"), true);
assert.strictEqual(isWorkspaceAdmin("member"), false);
assert.strictEqual(isWorkspaceAdmin("guest"), false);

// 2. isTaskStatusOnlyPayload
assert.strictEqual(isTaskStatusOnlyPayload({ columnId: "col1" }), true);
assert.strictEqual(isTaskStatusOnlyPayload({ columnId: "col1", columnOrder: 1 }), true);
assert.strictEqual(isTaskStatusOnlyPayload({ title: "New Title" }), false);
assert.strictEqual(isTaskStatusOnlyPayload({ columnId: "col1", description: "Test" }), false);

// 3. isEventStatusOnlyPayload
assert.strictEqual(isEventStatusOnlyPayload({ status: "ongoing" }), true);
assert.strictEqual(isEventStatusOnlyPayload({ status: "completed", title: "New" }), false);
assert.strictEqual(isEventStatusOnlyPayload({ description: "Desc" }), false);

// 4. canManageTaskSync
const leaderDivId = "div-1";
const otherDivId = "div-2";

// Admin always allowed
assert.strictEqual(
  canManageTaskSync({ role: "admin", leaderDivisions: [], task: null, action: "create" }).allowed,
  true
);

// Leader allowed create with their division
assert.strictEqual(
  canManageTaskSync({
    role: "member",
    leaderDivisions: [leaderDivId],
    task: { divisionId: leaderDivId },
    action: "create",
  }).allowed,
  true
);

// Leader rejected create for other division or no division
assert.strictEqual(
  canManageTaskSync({
    role: "member",
    leaderDivisions: [leaderDivId],
    task: { divisionId: otherDivId },
    action: "create",
  }).allowed,
  false
);

// Member rejected create
assert.strictEqual(
  canManageTaskSync({
    role: "member",
    leaderDivisions: [],
    task: { divisionId: leaderDivId },
    action: "create",
  }).allowed,
  false
);

console.log("All RBAC rules tests passed!");
```

- [ ] **Step 2: Run test to verify it fails**

Command: `node server/test-rbac-rules.js`
Expected: FAIL with "Cannot find module './src/utils/rbacRules'"

- [ ] **Step 3: Implement `server/src/utils/rbacRules.js`**

```javascript
// server/src/utils/rbacRules.js
const mongoose = require("mongoose");
const WorkspaceDivision = require("../models/WorkspaceDivision");
const AppError = require("./AppError");

const ADMIN_ROLES = ["owner", "admin"];

const isWorkspaceAdmin = (role) => ADMIN_ROLES.includes(role);

/**
 * Ambil daftar divisionId (string) di mana userId memiliki role "leader"
 */
const getUserLeaderDivisionIds = async (workspaceId, userId) => {
  if (!workspaceId || !userId) return [];
  const divisions = await WorkspaceDivision.find({
    workspaceId,
    members: { $elemMatch: { userId, role: "leader" } },
  })
    .select("_id")
    .lean();

  return divisions.map((d) => d._id.toString());
};

const toId = (value) => {
  if (!value) return null;
  if (typeof value === "object") {
    return (value._id || value.id || value)?.toString?.() || null;
  }
  return value.toString();
};

const getInvolvedDivisionIds = (item = {}) => {
  const ids = [];
  if (item.divisionId) {
    const id = toId(item.divisionId);
    if (id) ids.push(id);
  }
  if (Array.isArray(item.divisionIds)) {
    for (const d of item.divisionIds) {
      const id = toId(d);
      if (id && !ids.includes(id)) ids.push(id);
    }
  }
  return ids;
};

/**
 * Cek apakah payload update task HANYA memodifikasi status / pergerakan kolom
 * atau toggle status isCompleted pada subtask.
 */
const isTaskStatusOnlyPayload = (body = {}) => {
  const keys = Object.keys(body).filter((k) => body[k] !== undefined);
  if (keys.length === 0) return true;

  // Field terlarang untuk member biasa
  const forbiddenKeys = [
    "title",
    "description",
    "assignees",
    "startDate",
    "dueDate",
    "priority",
    "labels",
    "eventId",
    "divisionId",
    "divisionIds",
    "divisionPics",
    "coordination",
    "phase",
    "dueDateMode",
    "dueOffsetDays",
    "blockedBy",
    "isArchived",
    "isDeleted",
  ];

  for (const k of forbiddenKeys) {
    if (keys.includes(k)) return false;
  }

  // Jika menyertakan subtask, pastikan hanya boleh toggle isCompleted
  // bukan menambah, menghapus, atau mengubah title subtask
  if (keys.includes("subtasks")) {
    return true;
  }

  return keys.every((k) => ["columnId", "columnOrder"].includes(k));
};

/**
 * Cek apakah payload update event HANYA memodifikasi status
 */
const isEventStatusOnlyPayload = (body = {}) => {
  const keys = Object.keys(body).filter((k) => body[k] !== undefined);
  if (keys.length === 0) return true;

  return keys.length === 1 && keys[0] === "status";
};

/**
 * Sinkronisasi evaluasi RBAC Task
 */
const canManageTaskSync = ({
  role,
  leaderDivisions = [],
  task = {},
  action,
  payload = {},
}) => {
  if (isWorkspaceAdmin(role)) {
    return { allowed: true };
  }

  const involved = getInvolvedDivisionIds(task);
  const isLeaderOfInvolved = involved.some((id) =>
    leaderDivisions.includes(id),
  );

  if (action === "create") {
    const targetDivisionId = toId(task?.divisionId || payload?.divisionId);
    const targetDivisionIds = (task?.divisionIds || payload?.divisionIds || []).map(toId);
    const allTargets = [targetDivisionId, ...targetDivisionIds].filter(Boolean);

    if (allTargets.length === 0) {
      return {
        allowed: false,
        message: "Hanya owner dan admin yang dapat membuat task tanpa divisi",
      };
    }

    const hasLeaderAccess = allTargets.some((id) => leaderDivisions.includes(id));
    if (!hasLeaderAccess) {
      return {
        allowed: false,
        message: "Ketua divisi hanya dapat membuat task untuk divisi yang dipimpinnya",
      };
    }
    return { allowed: true };
  }

  if (action === "update") {
    if (isLeaderOfInvolved) {
      return { allowed: true };
    }
    // Member biasa hanya boleh update status
    if (isTaskStatusOnlyPayload(payload)) {
      return { allowed: true, isStatusOnly: true };
    }
    return {
      allowed: false,
      message: "Member biasa hanya memiliki izin untuk memperbarui status task",
    };
  }

  if (action === "delete" || action === "archive") {
    if (isLeaderOfInvolved) {
      return { allowed: true };
    }
    return {
      allowed: false,
      message: "Hanya owner, admin, atau ketua divisi terkait yang dapat menghapus atau mengarsipkan task",
    };
  }

  return { allowed: false, message: "Aksi tidak diizinkan" };
};

/**
 * Sinkronisasi evaluasi RBAC Event
 */
const canManageEventSync = ({
  role,
  leaderDivisions = [],
  event = {},
  action,
  payload = {},
}) => {
  if (isWorkspaceAdmin(role)) {
    return { allowed: true };
  }

  const eventDivId = toId(event?.divisionId);
  const isLeaderOfEvent = eventDivId && leaderDivisions.includes(eventDivId);

  if (action === "create") {
    const targetDivisionId = toId(event?.divisionId || payload?.divisionId);
    if (!targetDivisionId) {
      return {
        allowed: false,
        message: "Hanya owner dan admin yang dapat membuat event tanpa divisi",
      };
    }
    if (!leaderDivisions.includes(targetDivisionId)) {
      return {
        allowed: false,
        message: "Ketua divisi hanya dapat membuat event untuk divisi yang dipimpinnya",
      };
    }
    return { allowed: true };
  }

  if (action === "update") {
    if (isLeaderOfEvent) {
      return { allowed: true };
    }
    if (isEventStatusOnlyPayload(payload)) {
      return { allowed: true, isStatusOnly: true };
    }
    return {
      allowed: false,
      message: "Member biasa hanya memiliki izin untuk memperbarui status event",
    };
  }

  if (action === "delete") {
    if (isLeaderOfEvent) {
      return { allowed: true };
    }
    return {
      allowed: false,
      message: "Hanya owner, admin, atau ketua divisi terkait yang dapat menghapus event",
    };
  }

  return { allowed: false, message: "Aksi tidak diizinkan" };
};

module.exports = {
  ADMIN_ROLES,
  isWorkspaceAdmin,
  getUserLeaderDivisionIds,
  isTaskStatusOnlyPayload,
  isEventStatusOnlyPayload,
  canManageTaskSync,
  canManageEventSync,
};
```

- [ ] **Step 4: Run test to verify it passes**

Command: `node server/test-rbac-rules.js`
Expected: PASS with "All RBAC rules tests passed!"

- [ ] **Step 5: Clean up test script and commit**

```bash
git add server/src/utils/rbacRules.js
git commit -m "feat(server): add RBAC rules helper for task and event"
```

---

### Task 2: Task Controller RBAC Enforcement (`server/src/controllers/task.controller.js`)

**Files:**
- Modify: `server/src/controllers/task.controller.js`

- [ ] **Step 1: Import RBAC rules in `server/src/controllers/task.controller.js`**

Add import:
```javascript
const {
  getUserLeaderDivisionIds,
  canManageTaskSync,
} = require("../utils/rbacRules");
```

- [ ] **Step 2: Guard `createTask`**

In `exports.createTask`:
Before creating task, check:
```javascript
  const leaderDivisions = await getUserLeaderDivisionIds(workspace._id, userId);
  const check = canManageTaskSync({
    role: req.workspaceMember?.role,
    leaderDivisions,
    task: { divisionId, divisionIds },
    action: "create",
    payload: req.body,
  });
  if (!check.allowed) {
    return next(new AppError(check.message, 403));
  }
```

- [ ] **Step 3: Guard `updateTask`**

In `exports.updateTask`:
After finding `task`:
```javascript
  const leaderDivisions = await getUserLeaderDivisionIds(workspace._id, userId);
  const check = canManageTaskSync({
    role: req.workspaceMember?.role,
    leaderDivisions,
    task,
    action: "update",
    payload: req.body,
  });
  if (!check.allowed) {
    return next(new AppError(check.message, 403));
  }

  // Jika member biasa (status only), cegah modifikasi subtask selain toggle isCompleted
  if (check.isStatusOnly && req.body.subtasks !== undefined) {
    // Pastikan panjang subtask tidak bertambah/berkurang dan title tidak diedit
    const existingSubtasks = task.subtasks || [];
    const newSubtasks = req.body.subtasks || [];
    if (newSubtasks.length !== existingSubtasks.length) {
      return next(new AppError("Member biasa tidak dapat menambah atau menghapus subtask", 403));
    }
  }
```

- [ ] **Step 4: Guard `deleteTask`, `archiveTask`, `unarchiveTask`, `bulkArchiveDone`**

In `deleteTask`:
```javascript
  const leaderDivisions = await getUserLeaderDivisionIds(workspace._id, userId);
  const check = canManageTaskSync({
    role: req.workspaceMember?.role,
    leaderDivisions,
    task,
    action: "delete",
  });
  if (!check.allowed) {
    return next(new AppError(check.message, 403));
  }
```

In `archiveTask` and `unarchiveTask`:
```javascript
  const leaderDivisions = await getUserLeaderDivisionIds(workspace._id, userId);
  const check = canManageTaskSync({
    role: req.workspaceMember?.role,
    leaderDivisions,
    task,
    action: "archive",
  });
  if (!check.allowed) {
    return next(new AppError(check.message, 403));
  }
```

In `bulkArchiveDone`:
Disallow for regular members (only owner, admin, or leaders):
```javascript
  const role = req.workspaceMember?.role;
  const leaderDivisions = await getUserLeaderDivisionIds(workspace._id, userId);
  if (!["owner", "admin"].includes(role) && leaderDivisions.length === 0) {
    return next(new AppError("Hanya owner, admin, atau ketua divisi yang dapat melakukan arsip massal", 403));
  }
```

- [ ] **Step 5: Commit changes**

```bash
git add server/src/controllers/task.controller.js
git commit -m "feat(server): enforce RBAC on task CRUD endpoints"
```

---

### Task 3: Event & Pipeline Controller RBAC Enforcement (`server/src/controllers/event.controller.js`)

**Files:**
- Modify: `server/src/controllers/event.controller.js`
- Modify: `server/src/controllers/eventPipeline.controller.js`

- [ ] **Step 1: Import RBAC rules in `server/src/controllers/event.controller.js`**

Add import:
```javascript
const {
  getUserLeaderDivisionIds,
  canManageEventSync,
} = require("../utils/rbacRules");
```

- [ ] **Step 2: Guard `createEvent`**

In `exports.createEvent`:
```javascript
  const leaderDivisions = await getUserLeaderDivisionIds(workspace._id, userId);
  const check = canManageEventSync({
    role: req.workspaceMember?.role,
    leaderDivisions,
    event: { divisionId },
    action: "create",
    payload: req.body,
  });
  if (!check.allowed) {
    return next(new AppError(check.message, 403));
  }
```

- [ ] **Step 3: Guard `updateEvent`**

In `exports.updateEvent`:
```javascript
  const leaderDivisions = await getUserLeaderDivisionIds(workspace._id, userId);
  const check = canManageEventSync({
    role: req.workspaceMember?.role,
    leaderDivisions,
    event,
    action: "update",
    payload: req.body,
  });
  if (!check.allowed) {
    return next(new AppError(check.message, 403));
  }
```

- [ ] **Step 4: Guard `deleteEvent`**

In `exports.deleteEvent`:
```javascript
  const leaderDivisions = await getUserLeaderDivisionIds(workspace._id, userId);
  const check = canManageEventSync({
    role: req.workspaceMember?.role,
    leaderDivisions,
    event,
    action: "delete",
  });
  if (!check.allowed) {
    return next(new AppError(check.message, 403));
  }
```

- [ ] **Step 5: Guard `eventPipeline.controller.js`**

In `createPipelineTask` and `applyTemplate`:
Check that caller is owner, admin, or leader of event's division:
```javascript
  const leaderDivisions = await getUserLeaderDivisionIds(workspace._id, userId);
  const event = await Event.findById(eventId).select("divisionId").lean();
  const check = canManageEventSync({
    role: req.workspaceMember?.role,
    leaderDivisions,
    event,
    action: "update",
    payload: { task: true },
  });
  if (!check.allowed) {
    return next(new AppError("Hanya owner, admin, atau ketua divisi terkait yang dapat mengelola pipeline task event", 403));
  }
```

- [ ] **Step 6: Commit changes**

```bash
git add server/src/controllers/event.controller.js server/src/controllers/eventPipeline.controller.js
git commit -m "feat(server): enforce RBAC on event CRUD and pipeline"
```

---

### Task 4: Frontend Permissions Utility (`client/lib/permissions.js`)

**Files:**
- Create: `client/lib/permissions.js`

- [ ] **Step 1: Implement `client/lib/permissions.js`**

```javascript
// client/lib/permissions.js

export const ADMIN_ROLES = ["owner", "admin"];

export const isWorkspaceAdmin = (role) => ADMIN_ROLES.includes(role);

export const getMemberUserId = (m) =>
  (m?.userId?._id || m?.userId)?.toString?.() || String(m?.userId || "");

export const getLeaderDivisions = (divisions = [], userId) => {
  if (!userId) return [];
  const uid = userId.toString();
  return divisions.filter((d) =>
    (d.members || []).some(
      (m) => getMemberUserId(m) === uid && m.role === "leader",
    ),
  );
};

export const getLeaderDivisionIds = (divisions = [], userId) =>
  getLeaderDivisions(divisions, userId).map((d) => d._id?.toString?.() || String(d._id));

/**
 * Cek apakah user boleh membuat task baru.
 * - Owner & Admin: selalu boleh.
 * - Ketua Divisi: boleh (akan dibatasi memilih divisinya).
 * - Member biasa: tidak boleh.
 */
export const canCreateTask = ({ role, divisions = [], userId }) => {
  if (isWorkspaceAdmin(role)) return true;
  const leaders = getLeaderDivisionIds(divisions, userId);
  return leaders.length > 0;
};

/**
 * Cek apakah user boleh mengelola (edit data lengkap / hapus) task tertentu.
 */
export const canManageTask = ({ task, role, divisions = [], userId }) => {
  if (isWorkspaceAdmin(role)) return true;
  if (!task || !userId) return false;

  const leaders = getLeaderDivisionIds(divisions, userId);
  if (leaders.length === 0) return false;

  const toId = (val) => (val?._id || val)?.toString?.() || String(val || "");
  const involved = [
    task.divisionId ? toId(task.divisionId) : null,
    ...(task.divisionIds || []).map(toId),
  ].filter(Boolean);

  return involved.some((id) => leaders.includes(id));
};

/**
 * Cek apakah user boleh membuat event baru.
 */
export const canCreateEvent = ({ role, divisions = [], userId }) => {
  if (isWorkspaceAdmin(role)) return true;
  const leaders = getLeaderDivisionIds(divisions, userId);
  return leaders.length > 0;
};

/**
 * Cek apakah user boleh mengelola (edit data lengkap / hapus) event tertentu.
 */
export const canManageEvent = ({ event, role, divisions = [], userId }) => {
  if (isWorkspaceAdmin(role)) return true;
  if (!event || !userId) return false;

  const leaders = getLeaderDivisionIds(divisions, userId);
  if (leaders.length === 0) return false;

  const eventDivId = (event.divisionId?._id || event.divisionId)?.toString?.();
  if (!eventDivId) return false;

  return leaders.includes(eventDivId);
};
```

- [ ] **Step 2: Commit permission utility**

```bash
git add client/lib/permissions.js
git commit -m "feat(client): add RBAC permissions utility"
```

---

### Task 5: Frontend Task UI RBAC Updates

**Files:**
- Modify: `client/app/workspace/[id]/tasks/page.js`
- Modify: `client/components/kanban/kanban-column.js`
- Modify: `client/components/kanban/task-detail-panel.js`
- Modify: `client/components/kanban/tab-detail.js`
- Modify: `client/components/kanban/bulk-action-bar.js`

- [ ] **Step 1: Update `client/app/workspace/[id]/tasks/page.js`**
  - Import `canCreateTask`, `canManageTask` from `@/lib/permissions`.
  - Hitung `userCanCreateTask = canCreateTask({ role: currentWorkspace?.role, divisions: scope.divisions, userId: user?._id })`.
  - Jika `!userCanCreateTask`: Sembunyikan tombol `+ Buat Task`.
  - Teruskan prop `canManage` atau `userCanCreate` ke komponen anak.

- [ ] **Step 2: Update `client/components/kanban/kanban-column.js`**
  - Sembunyikan tombol quick add task `+` pada header kolom kanban jika user bukan admin/ketua divisi.

- [ ] **Step 3: Update `client/components/kanban/task-detail-panel.js`**
  - Hitung apakah user adalah task manager (`canManageTask`).
  - Jika bukan task manager:
    - Sembunyikan opsi "Hapus Task", "Arsipkan", "Unarsipkan" dari menu dropdown tiga titik.

- [ ] **Step 4: Update `client/components/kanban/tab-detail.js`**
  - Hitung `canManage = canManageTask({ task, role: memberRole, divisions, userId: currentUserId })`.
  - Jika `!canManage`:
    - Jadikan input Judul, Deskripsi, Assignees, Dates, Priority, Labels, Divisi, Koordinasi menjadi disabled/read-only.
    - Pilihan Kolom Kanban (Status) tetap AKTIF dan dapat diubah.
    - Checkbox Subtask tetap dapat dicentang (`toggleSubtask`).
    - Form tambah subtask baru dan tombol hapus subtask disembunyikan.

- [ ] **Step 5: Update `client/components/kanban/bulk-action-bar.js`**
  - Jika user bukan admin/ketua divisi: sembunyikan atau nonaktifkan tombol Bulk Archive dan Bulk Delete.

- [ ] **Step 6: Commit changes**

```bash
git add client/app/workspace/[id]/tasks/page.js client/components/kanban/
git commit -m "feat(client): enforce RBAC on task list, kanban board, and detail panel"
```

---

### Task 6: Frontend Event UI RBAC Updates

**Files:**
- Modify: `client/app/workspace/[id]/events/page.js`
- Modify: `client/app/workspace/[id]/events/[eventId]/page.js`
- Modify: `client/components/events/event-overview-tab.js`

- [ ] **Step 1: Update `client/app/workspace/[id]/events/page.js`**
  - Import `canCreateEvent` from `@/lib/permissions`.
  - Hitung `userCanCreate = canCreateEvent({ role: currentWorkspace?.role, divisions: scope.divisions, userId: user?._id })`.
  - Jika `!userCanCreate`: Sembunyikan tombol `+ Buat Event`.

- [ ] **Step 2: Update `client/app/workspace/[id]/events/[eventId]/page.js`**
  - Import `canManageEvent` from `@/lib/permissions`.
  - Hitung `canManage = canManageEvent({ event, role: currentWorkspace?.role, divisions: scope.divisions, userId: user?._id })`.
  - Jika `!canManage`:
    - Sembunyikan opsi "Hapus Event" dari dropdown menu tiga titik.

- [ ] **Step 3: Update `client/components/events/event-overview-tab.js`**
  - Terima atau hitung `canManage`.
  - Jika `!canManage`:
    - Jadikan judul, deskripsi, tanggal mulai & selesai, catatan pemateri, warna, divisi, dan pemilih ide menjadi *read-only*.
    - Pilihan dropdown **Status Event** (`upcoming`, `ongoing`, `completed`) tetap interaktif dan dapat diubah.

- [ ] **Step 4: Commit changes**

```bash
git add client/app/workspace/[id]/events/page.js client/app/workspace/[id]/events/[eventId]/page.js client/components/events/event-overview-tab.js
git commit -m "feat(client): enforce RBAC on event list, detail, and overview tab"
```

---

### Task 7: End-to-End Verification & Testing

**Files:**
- Test: `server/test-rbac-integration.js`

- [ ] **Step 1: Write integration verification script for endpoints**
  - Test simulated requests with mock roles (admin, leader, regular member) to ensure 403 Forbidden is thrown on illegal mutations and 200 OK on allowed status updates.

- [ ] **Step 2: Run verification script**
  - Run: `node server/test-rbac-integration.js`
  - Ensure all assertions pass.

- [ ] **Step 3: Verify client build / syntax**
  - Run: `cmd /c "cd client && npm run lint"` or verify modified files for syntax errors.

- [ ] **Step 4: Commit final verification**

```bash
git commit -am "chore: complete RBAC task and event implementation and verification"
```

