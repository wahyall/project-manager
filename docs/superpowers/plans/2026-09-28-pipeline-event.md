# Pipeline Event Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Pipeline" tab to Event detail that breaks event preparation into 5 fixed phases (Planning, Preparation, Marketing, Execution, Evaluation), where each phase's items are real Tasks with a relative-or-absolute due date, and the whole phase structure can be saved/reused as a workspace-level template.

**Architecture:** Reuse the existing `Task` model and its controller/socket/notification machinery by adding three optional fields (`phase`, `dueDateMode`, `dueOffsetDays`) rather than building a parallel checklist entity. A new `PipelineTemplate` model stores reusable phase/item blueprints. One new nested route family (`/events/:eventId/pipeline`) exposes phase-grouped reads and template apply/save actions by delegating task creation to the existing task controller. The frontend adds one hook (`use-event-pipeline.js`, following the flat-map + optimistic-update + socket-sync style of `use-kanban.js`) and a new tab component that reuses `TaskCard` and `TaskDetailPanel` — no new card or detail-panel component.

**Tech Stack:** Node/Express/Mongoose backend (no test framework installed — this plan intentionally has no automated test steps, only manual verification, per project decision), Next.js/React frontend, `@hello-pangea/dnd` for drag-and-drop, shadcn/ui components, Socket.io for real-time sync.

**Spec:** `docs/superpowers/specs/2026-09-28-pipeline-event-design.md`

## Global Constraints

- 5 phases are fixed globally, exact enum values: `planning`, `preparation`, `marketing`, `execution`, `evaluation`. Single source of truth: `server/src/utils/pipelinePhases.js` (backend) and `client/lib/pipeline-phases.js` (frontend) — every enum/validation/label must reference these, never re-list the 5 values inline elsewhere.
- `dueDateMode` values: exactly `"absolute"` or `"relative"` (or `null` for non-pipeline tasks).
- A Task with `phase` set (non-null) MUST have `eventId` set (non-null) — enforced server-side in both create and update.
- `dueOffsetDays` is negative for "before" (H-N from `event.startDate`) and positive for "after" (H+N from `event.endDate`), per phase-to-anchor mapping in `pipelinePhases.js`.
- `PipelineTemplate` uses **hard delete** (no `isDeleted`/soft-delete pattern) — it is structure, not audited event history.
- No new Socket.io event names — reuse `task:created`, `task:updated`, `task:moved`, `task:deleted` exactly as emitted today.
- Moving a task between phase columns is unordered and purely visual — no validation blocks it, no phase-order enforcement anywhere in the code.
- No automated tests are added in this plan (project decision — no test framework exists in this repo). Each task's verification step is a manual curl/dev-server check.

## Review Focus

- **Phase set without eventId**: creating/updating a task with `phase` but no `eventId` (or clearing `eventId` on a task that still has `phase`) must return 400, not save a dangling pipeline item that can never show up anywhere.
- **Relative due date mode without offset**: `dueDateMode: "relative"` with `dueOffsetDays` missing/undefined must return 400, not silently store `dueDate: null` or crash on `setDate` of an invalid number.
- **Event date edited after pipeline tasks exist**: changing `event.startDate`/`endDate` must recompute `dueDate` for every task with `dueDateMode: "relative"` on that event, and the change must reach connected clients (Kalender/Kanban) via `task:updated`, not just sit stale in the DB until next reload.
- **Apply-template is additive, not destructive**: applying a template to an event that already has pipeline tasks must add new tasks without touching/deleting the existing ones.
- **Archived/deleted pipeline tasks skew progress**: the phase progress calculation (`done/total`) and the pipeline list itself must exclude archived and soft-deleted tasks, matching the filter convention used elsewhere in `listTasks` (`isArchived: { $ne: true }`), so a phase doesn't look permanently incomplete or double-count.

---

### Task 1: Shared phase constants + Task model fields

**Files:**
- Create: `server/src/utils/pipelinePhases.js`
- Modify: `server/src/models/Task.js`

**Interfaces:**
- Produces: `PHASES` (array of 5 strings), `PHASE_LABELS` (object phase→Indonesian label), `PHASE_ANCHOR` (object phase→`"startDate"|"endDate"`), all exported from `server/src/utils/pipelinePhases.js`. Every later backend task imports phase validation/labels from here.
- Produces on `Task` documents: `phase` (string enum or `null`), `dueDateMode` (`"absolute"|"relative"|null`), `dueOffsetDays` (number or `null`).

- [ ] **Step 1: Create the shared phase constants file**

```js
// server/src/utils/pipelinePhases.js
const PHASES = [
  "planning",
  "preparation",
  "marketing",
  "execution",
  "evaluation",
];

const PHASE_LABELS = {
  planning: "Planning",
  preparation: "Preparation",
  marketing: "Marketing",
  execution: "Execution",
  evaluation: "Evaluation",
};

// Which event date field a phase's relative offset counts from.
// Evaluation happens after the event ends, everything else counts
// from the start (including Execution, usually offset 0 = hari-H).
const PHASE_ANCHOR = {
  planning: "startDate",
  preparation: "startDate",
  marketing: "startDate",
  execution: "startDate",
  evaluation: "endDate",
};

module.exports = { PHASES, PHASE_LABELS, PHASE_ANCHOR };
```

- [ ] **Step 2: Add the three new fields to `taskSchema`**

In `server/src/models/Task.js`, add `const { PHASES } = require("../utils/pipelinePhases");` at the top (after the `mongoose` require), then add these fields to `taskSchema` right after the existing `eventId` field (after line 126, before `subtasks`):

```js
    phase: {
      type: String,
      enum: {
        values: PHASES,
        message: `Fase harus salah satu dari: ${PHASES.join(", ")}`,
      },
      default: null,
    },
    dueDateMode: {
      type: String,
      enum: ["absolute", "relative"],
      default: null,
    },
    dueOffsetDays: {
      type: Number,
      default: null,
    },
```

- [ ] **Step 3: Add the phase index**

Add this line right after the existing `taskSchema.index({ eventId: 1 });` (line 172):

```js
taskSchema.index({ eventId: 1, phase: 1 });
```

- [ ] **Step 4: Verify manually**

Run: `node -e "require('./server/src/models/Task'); require('./server/src/utils/pipelinePhases'); console.log('OK')"` from the repo root.
Expected: prints `OK` with no throw (confirms both files load and the schema compiles without a Mongoose `OverwriteModelError` or syntax error).

- [ ] **Step 5: Commit**

```bash
git add server/src/utils/pipelinePhases.js server/src/models/Task.js
git commit -m "feat(server): add pipeline phase fields to Task model"
```

---

### Task 2: Due-date-from-offset helper + recalculation on event date change

**Files:**
- Modify: `server/src/services/task.service.js`
- Modify: `server/src/controllers/event.controller.js`

**Interfaces:**
- Consumes: `PHASE_ANCHOR` from `server/src/utils/pipelinePhases.js` (Task 1).
- Produces: `computeDueDateFromOffset(event, phase, offsetDays)` and `recalculateRelativeDueDates(eventId, event)`, both exported from `task.service.js`. Task 3 and Task 5 (pipeline controller) both call `computeDueDateFromOffset`.

- [ ] **Step 1: Add the two functions to `task.service.js`**

Add `const { PHASE_ANCHOR } = require("../utils/pipelinePhases");` at the top, then add before `module.exports`:

```js
/**
 * Hitung dueDate absolut dari offset hari relatif terhadap tanggal event.
 * Fase evaluation dihitung dari endDate, fase lain dari startDate.
 *
 * @param {Object} event - Event document (butuh startDate & endDate)
 * @param {string} phase - Salah satu dari PHASES
 * @param {number} offsetDays - Bisa negatif (sebelum) atau positif (sesudah)
 * @returns {Date}
 */
const computeDueDateFromOffset = (event, phase, offsetDays) => {
  const anchorField = PHASE_ANCHOR[phase] || "startDate";
  const anchor = new Date(event[anchorField]);
  const result = new Date(anchor);
  result.setDate(result.getDate() + Number(offsetDays));
  return result;
};

/**
 * Recompute dueDate semua task dengan dueDateMode "relative" milik satu event,
 * dipanggil setelah startDate/endDate event berubah.
 *
 * @param {string} eventId
 * @param {Object} event - Event document dengan startDate/endDate TERBARU
 * @returns {Promise<string[]>} ID task yang berubah
 */
const recalculateRelativeDueDates = async (eventId, event) => {
  const tasks = await Task.find({
    eventId,
    dueDateMode: "relative",
  }).select("_id phase dueOffsetDays");

  if (tasks.length === 0) return [];

  const bulkOps = tasks.map((t) => ({
    updateOne: {
      filter: { _id: t._id },
      update: {
        dueDate: computeDueDateFromOffset(event, t.phase, t.dueOffsetDays),
      },
    },
  }));
  await Task.bulkWrite(bulkOps);

  return tasks.map((t) => t._id.toString());
};
```

Update `module.exports` at the bottom of the file to:

```js
module.exports = {
  hasCircularDependency,
  getDoneColumnIds,
  isValidColumn,
  getNextColumnOrder,
  computeDueDateFromOffset,
  recalculateRelativeDueDates,
};
```

- [ ] **Step 2: Wire recalculation into `updateEvent`**

In `server/src/controllers/event.controller.js`, add `recalculateRelativeDueDates` to the existing `require("../services/task.service")` import. Then, right after the existing block:

```js
  // Validate dates after updates
  if (event.endDate < event.startDate) {
    return next(
      new AppError(
        "Tanggal selesai harus sama atau setelah tanggal mulai",
        400,
      ),
    );
  }
```

and before the `// Color` block, add:

```js
  const datesChanged = startDate !== undefined || endDate !== undefined;
```

Then, right after `await event.save();` (currently followed by the ideas-sync comment block), add:

```js
  // Recalculate relative due dates of pipeline tasks when event dates change
  let recalculatedTaskIds = [];
  if (datesChanged) {
    recalculatedTaskIds = await recalculateRelativeDueDates(event._id, event);
  }
```

Finally, right after the existing `emitEventEvent(workspace._id.toString(), "event:updated", {...})` call, add:

```js
  // Notify clients about recalculated pipeline task due dates
  if (recalculatedTaskIds.length > 0) {
    const recalculatedTasks = await Task.find({
      _id: { $in: recalculatedTaskIds },
    })
      .populate("assignees", "name email avatar")
      .populate("watchers", "name email avatar")
      .populate("labels", "name color")
      .populate("createdBy", "name email avatar")
      .lean();
    recalculatedTasks.forEach((t) => {
      emitEventEvent(workspace._id.toString(), "task:updated", {
        task: t,
        userId,
      });
    });
  }
```

(`Task` is already imported at the top of `event.controller.js` for the `taskCount` query a few lines below — confirm the import exists; if not, add `const Task = require("../models/Task");`.)

- [ ] **Step 3: Verify manually**

Start the server (`cd server && npm run dev`), then via curl/Postman:
1. Create an event with `startDate: 2026-10-01`.
2. Create a task with `eventId` = that event, `phase: "marketing"`, `dueDateMode: "relative"`, `dueOffsetDays: -14` (this requires Task 3 below to accept these fields — if Task 3 isn't done yet, insert the task directly via `mongo`/Compass for this check, or do this verification after Task 3 instead).
3. `PUT` the event with `startDate: 2026-10-08`.
4. Query the task and confirm `dueDate` is now `2026-09-24` (14 days before the new start date).

- [ ] **Step 4: Commit**

```bash
git add server/src/services/task.service.js server/src/controllers/event.controller.js
git commit -m "feat(server): recalculate pipeline task due dates on event date change"
```

---

### Task 3: Accept phase fields in Task create/update

**Files:**
- Modify: `server/src/controllers/task.controller.js`

**Interfaces:**
- Consumes: `computeDueDateFromOffset` from `task.service.js` (Task 2).
- Produces: `createTask` and `updateTask` now read/validate/persist `phase`, `dueDateMode`, `dueOffsetDays` from `req.body`. Task 5 (pipeline controller) relies on `createTask` accepting these fields when it delegates to it.

- [ ] **Step 1: Add a shared validation helper at the top of the file**

Add near the other top-level helpers (after `getIO`/`emitTaskEvent`):

```js
const { computeDueDateFromOffset } = require("../services/task.service");
const Event = require("../models/Event");

// Validate + resolve phase-related fields shared by create and update.
// Returns { phase, dueDateMode, dueOffsetDays, computedDueDate } or calls
// next(AppError) and returns null.
const resolvePhaseFields = async ({
  phase,
  dueDateMode,
  dueOffsetDays,
  eventId,
  next,
}) => {
  if (phase === undefined) {
    return { phase: undefined, dueDateMode: undefined, dueOffsetDays: undefined, computedDueDate: undefined };
  }
  if (phase !== null && !eventId) {
    next(new AppError("Task dengan fase harus terhubung ke event", 400));
    return null;
  }
  if (phase === null) {
    return { phase: null, dueDateMode: null, dueOffsetDays: null, computedDueDate: null };
  }
  if (dueDateMode === "relative") {
    if (dueOffsetDays === undefined || dueOffsetDays === null) {
      next(new AppError("Offset hari harus diisi untuk mode relatif", 400));
      return null;
    }
    const event = await Event.findById(eventId).select("startDate endDate").lean();
    if (!event) {
      next(new AppError("Event tidak ditemukan", 404));
      return null;
    }
    return {
      phase,
      dueDateMode: "relative",
      dueOffsetDays: Number(dueOffsetDays),
      computedDueDate: computeDueDateFromOffset(event, phase, dueOffsetDays),
    };
  }
  return {
    phase,
    dueDateMode: dueDateMode || "absolute",
    dueOffsetDays: null,
    computedDueDate: undefined, // caller keeps whatever dueDate was passed in
  };
};
```

- [ ] **Step 2: Use it in `createTask`**

In the destructure at the top of `createTask` (around line 136), add `phase, dueDateMode, dueOffsetDays,` to the list of destructured `req.body` fields.

Right before `const task = await Task.create({...})` (around line 199), add:

```js
  const resolvedPhase = await resolvePhaseFields({
    phase,
    dueDateMode,
    dueOffsetDays,
    eventId: eventId || null,
    next,
  });
  if (resolvedPhase === null) return; // resolvePhaseFields already called next()
```

Then, inside the `Task.create({...})` call, change the `dueDate` line and add the three new fields:

```js
    dueDate:
      resolvedPhase.computedDueDate !== undefined
        ? resolvedPhase.computedDueDate
        : dueDate || null,
    phase: resolvedPhase.phase ?? null,
    dueDateMode: resolvedPhase.dueDateMode ?? null,
    dueOffsetDays: resolvedPhase.dueOffsetDays ?? null,
```

- [ ] **Step 3: Use it in `updateTask`**

In the destructure at the top of `updateTask` (around line 358), add `phase, dueDateMode, dueOffsetDays,` to the list.

Right after the existing `// Event` block (`if (eventId !== undefined) { task.eventId = eventId || null; }`, around line 454-456), add:

```js
  // Phase (pipeline)
  if (phase !== undefined) {
    const resolvedPhase = await resolvePhaseFields({
      phase,
      dueDateMode,
      dueOffsetDays,
      eventId: eventId !== undefined ? eventId : task.eventId,
      next,
    });
    if (resolvedPhase === null) return;
    task.phase = resolvedPhase.phase;
    task.dueDateMode = resolvedPhase.dueDateMode;
    task.dueOffsetDays = resolvedPhase.dueOffsetDays;
    if (resolvedPhase.computedDueDate !== undefined) {
      task.dueDate = resolvedPhase.computedDueDate;
    }
  } else if (dueDateMode !== undefined && task.phase) {
    // Changing due date mode without changing phase itself
    const resolvedPhase = await resolvePhaseFields({
      phase: task.phase,
      dueDateMode,
      dueOffsetDays,
      eventId: task.eventId,
      next,
    });
    if (resolvedPhase === null) return;
    task.dueDateMode = resolvedPhase.dueDateMode;
    task.dueOffsetDays = resolvedPhase.dueOffsetDays;
    if (resolvedPhase.computedDueDate !== undefined) {
      task.dueDate = resolvedPhase.computedDueDate;
    }
  }
```

- [ ] **Step 4: Verify manually**

With the server running:
1. `POST /api/workspaces/:id/tasks` with `{ title: "Buat Poster", eventId: "<validEventId>", phase: "marketing", dueDateMode: "relative", dueOffsetDays: -14 }` → expect `201` and the response task's `dueDate` equal to the event's `startDate` minus 14 days.
2. `POST /api/workspaces/:id/tasks` with `{ title: "Task tanpa event", phase: "planning" }` (no `eventId`) → expect `400` with the "harus terhubung ke event" message.
3. `PUT /api/workspaces/:id/tasks/:taskId` on the task from step 1 with `{ dueDateMode: "relative" }` (no `dueOffsetDays`) → expect `400` with the "Offset hari harus diisi" message.

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/task.controller.js
git commit -m "feat(server): validate and compute pipeline phase fields on task create/update"
```

---

### Task 4: PipelineTemplate model

**Files:**
- Create: `server/src/models/PipelineTemplate.js`

**Interfaces:**
- Consumes: `PHASES` from `server/src/utils/pipelinePhases.js` (Task 1).
- Produces: `PipelineTemplate` Mongoose model, used by Task 5 and Task 6.

- [ ] **Step 1: Write the model**

```js
const mongoose = require("mongoose");
const { PHASES } = require("../utils/pipelinePhases");

const pipelineTemplateItemSchema = new mongoose.Schema(
  {
    phase: {
      type: String,
      enum: {
        values: PHASES,
        message: `Fase harus salah satu dari: ${PHASES.join(", ")}`,
      },
      required: true,
    },
    title: {
      type: String,
      required: [true, "Judul item harus diisi"],
      trim: true,
      maxlength: [200, "Judul item maksimal 200 karakter"],
    },
    dueDateMode: {
      type: String,
      enum: ["absolute", "relative"],
      required: true,
    },
    dueOffsetDays: {
      type: Number,
      default: null,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: true },
);

const pipelineTemplateSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Nama template harus diisi"],
      trim: true,
      maxlength: [100, "Nama template maksimal 100 karakter"],
    },
    description: {
      type: String,
      default: "",
    },
    items: {
      type: [pipelineTemplateItemSchema],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

pipelineTemplateSchema.index({ workspaceId: 1 });

module.exports = mongoose.model("PipelineTemplate", pipelineTemplateSchema);
```

- [ ] **Step 2: Verify manually**

Run: `node -e "require('./server/src/models/PipelineTemplate'); console.log('OK')"` from repo root.
Expected: prints `OK`.

- [ ] **Step 3: Commit**

```bash
git add server/src/models/PipelineTemplate.js
git commit -m "feat(server): add PipelineTemplate model"
```

---

### Task 5: Event Pipeline controller + routes (list, create task, apply/save template)

**Files:**
- Create: `server/src/controllers/eventPipeline.controller.js`
- Create: `server/src/routes/eventPipeline.routes.js`
- Modify: `server/src/app.js`

**Interfaces:**
- Consumes: `PHASES`, `PHASE_LABELS` (Task 1), `getDoneColumnIds`, `getNextColumnOrder`, `computeDueDateFromOffset` (Task 2/existing `task.service.js`), `taskController.createTask` (Task 3), `PipelineTemplate` model (Task 4).
- Produces: `GET/POST` handlers mounted at `/api/workspaces/:id/events/:eventId/pipeline`. Task 6 (frontend hook) calls these exact paths.

- [ ] **Step 1: Write the controller**

```js
const Task = require("../models/Task");
const Event = require("../models/Event");
const PipelineTemplate = require("../models/PipelineTemplate");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const { PHASES, PHASE_LABELS } = require("../utils/pipelinePhases");
const {
  getDoneColumnIds,
  getNextColumnOrder,
  computeDueDateFromOffset,
} = require("../services/task.service");
const taskController = require("./task.controller");
const ActivityLogService = require("../services/activityLog.service");

const getIO = () => {
  try {
    return require("../config/socket").getIO();
  } catch {
    return null;
  }
};
const emitTaskEvent = (workspaceId, event, data) => {
  const io = getIO();
  if (io) io.to(`workspace:${workspaceId}`).emit(event, data);
};

const populateTask = (query) =>
  query
    .populate("assignees", "name email avatar")
    .populate("watchers", "name email avatar")
    .populate("labels", "name color")
    .populate("createdBy", "name email avatar");

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/events/:eventId/pipeline
// ──────────────────────────────────────────────
exports.listPipeline = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  const workspace = req.workspace;

  const event = await Event.findOne({ _id: eventId, workspaceId: workspace._id });
  if (!event) {
    return next(new AppError("Event tidak ditemukan", 404));
  }

  const tasks = await populateTask(
    Task.find({
      eventId,
      phase: { $ne: null },
      isArchived: { $ne: true },
    }),
  ).lean();

  const doneColumnIds = getDoneColumnIds(workspace).map((id) => id.toString());

  const phases = PHASES.map((phase) => {
    const phaseTasks = tasks.filter((t) => t.phase === phase);
    const done = phaseTasks.filter((t) =>
      doneColumnIds.includes(t.columnId?.toString()),
    ).length;
    return {
      phase,
      label: PHASE_LABELS[phase],
      tasks: phaseTasks,
      progress: { done, total: phaseTasks.length },
    };
  });

  res.status(200).json({ status: "success", data: { phases } });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/events/:eventId/pipeline/tasks
// ──────────────────────────────────────────────
exports.createPipelineTask = (req, res, next) => {
  const { eventId } = req.params;
  const { phase } = req.body;

  if (!phase || !PHASES.includes(phase)) {
    return next(
      new AppError(`Fase harus salah satu dari: ${PHASES.join(", ")}`, 400),
    );
  }

  req.body.eventId = eventId;
  return taskController.createTask(req, res, next);
};

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/events/:eventId/pipeline/apply-template
// ──────────────────────────────────────────────
exports.applyTemplate = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  const { templateId } = req.body;
  const workspace = req.workspace;
  const userId = req.user.id;

  const event = await Event.findOne({ _id: eventId, workspaceId: workspace._id });
  if (!event) {
    return next(new AppError("Event tidak ditemukan", 404));
  }

  const template = await PipelineTemplate.findOne({
    _id: templateId,
    workspaceId: workspace._id,
  }).lean();
  if (!template) {
    return next(new AppError("Template tidak ditemukan", 404));
  }

  const firstColumnId = workspace.kanbanColumns[0]?._id;
  if (!firstColumnId) {
    return next(new AppError("Workspace belum punya kolom kanban", 400));
  }

  const createdTasks = [];
  for (const item of template.items) {
    const dueDate =
      item.dueDateMode === "relative"
        ? computeDueDateFromOffset(event, item.phase, item.dueOffsetDays)
        : null;
    const columnOrder = await getNextColumnOrder(workspace._id, firstColumnId);
    const task = await Task.create({
      workspaceId: workspace._id,
      title: item.title,
      columnId: firstColumnId,
      columnOrder,
      eventId,
      phase: item.phase,
      dueDateMode: item.dueDateMode,
      dueOffsetDays: item.dueDateMode === "relative" ? item.dueOffsetDays : null,
      dueDate,
      createdBy: userId,
      watchers: [userId],
    });
    createdTasks.push(task);
  }

  const populatedTasks = await populateTask(
    Task.find({ _id: { $in: createdTasks.map((t) => t._id) } }),
  ).lean();

  populatedTasks.forEach((t) => {
    emitTaskEvent(workspace._id.toString(), "task:created", { task: t, userId });
  });

  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "event_pipeline.template_applied",
    targetType: "event",
    targetId: event._id,
    targetName: event.title,
    details: { field: "template", newValue: template.name },
  });

  res.status(201).json({ status: "success", data: { tasks: populatedTasks } });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/events/:eventId/pipeline/save-as-template
// ──────────────────────────────────────────────
exports.saveAsTemplate = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  const { name, description } = req.body;
  const workspace = req.workspace;
  const userId = req.user.id;

  if (!name || !name.trim()) {
    return next(new AppError("Nama template harus diisi", 400));
  }

  const event = await Event.findOne({ _id: eventId, workspaceId: workspace._id });
  if (!event) {
    return next(new AppError("Event tidak ditemukan", 404));
  }

  const tasks = await Task.find({
    eventId,
    phase: { $ne: null },
    isArchived: { $ne: true },
  })
    .sort({ phase: 1, columnOrder: 1 })
    .lean();

  const items = tasks.map((t, idx) => ({
    phase: t.phase,
    title: t.title,
    dueDateMode: t.dueDateMode || "absolute",
    dueOffsetDays: t.dueDateMode === "relative" ? t.dueOffsetDays : null,
    order: idx,
  }));

  const template = await PipelineTemplate.create({
    workspaceId: workspace._id,
    name: name.trim(),
    description: description || "",
    items,
    createdBy: userId,
  });

  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "event_pipeline.template_saved",
    targetType: "event",
    targetId: event._id,
    targetName: event.title,
    details: { field: "template", newValue: template.name },
  });

  res.status(201).json({ status: "success", data: { template } });
});
```

- [ ] **Step 2: Write the routes**

```js
// server/src/routes/eventPipeline.routes.js
const express = require("express");
const router = express.Router({ mergeParams: true });
const pipelineController = require("../controllers/eventPipeline.controller");
const auth = require("../middlewares/auth");
const { workspaceMember } = require("../middlewares/rbac");

router.use(auth);

router.get("/", workspaceMember(), pipelineController.listPipeline);

router.post(
  "/tasks",
  workspaceMember("owner", "admin", "member"),
  pipelineController.createPipelineTask,
);

router.post(
  "/apply-template",
  workspaceMember("owner", "admin", "member"),
  pipelineController.applyTemplate,
);

router.post(
  "/save-as-template",
  workspaceMember("owner", "admin", "member"),
  pipelineController.saveAsTemplate,
);

module.exports = router;
```

- [ ] **Step 3: Mount the routes**

In `server/src/app.js`, add near the other event-sub-resource requires (after `const eventDivisionRoutes = require("./routes/eventDivision.routes");`):

```js
const eventPipelineRoutes = require("./routes/eventPipeline.routes");
```

And near `app.use("/api/workspaces/:id/events/:eventId/divisions", eventDivisionRoutes);`, add:

```js
app.use("/api/workspaces/:id/events/:eventId/pipeline", eventPipelineRoutes);
```

- [ ] **Step 4: Verify manually**

With the server running and a valid workspace/event/token:
1. `GET /api/workspaces/:id/events/:eventId/pipeline` → expect `200` with `data.phases` array of 5 entries, all `tasks: []`, `progress: {done:0,total:0}` on a fresh event.
2. `POST /api/workspaces/:id/events/:eventId/pipeline/tasks` with `{ title: "Susun Anggaran", phase: "planning", dueDateMode: "absolute", dueDate: "2026-10-01" }` → expect `201`, then re-run step 1 and confirm the task now appears under `phase: "planning"`.
3. `POST .../pipeline/save-as-template` with `{ name: "Template Test" }` → expect `201` with a template containing one item (`phase: "planning"`).
4. `POST .../pipeline/apply-template` with `{ templateId: "<id from step 3>" }` on the same event → expect `201` with one new task created, and step 1 now shows **two** tasks in `planning` (proves apply is additive, not destructive).

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/eventPipeline.controller.js server/src/routes/eventPipeline.routes.js server/src/app.js
git commit -m "feat(server): add event pipeline endpoints (list, create task, apply/save template)"
```

---

### Task 6: Pipeline template management controller + routes (workspace-level CRUD)

**Files:**
- Create: `server/src/controllers/pipelineTemplate.controller.js`
- Create: `server/src/routes/pipelineTemplate.routes.js`
- Modify: `server/src/app.js`

**Interfaces:**
- Consumes: `PipelineTemplate` model (Task 4).
- Produces: `GET/PUT/DELETE` handlers mounted at `/api/workspaces/:id/pipeline-templates`. Task 7 (frontend template hook) calls these exact paths.

- [ ] **Step 1: Write the controller**

```js
const PipelineTemplate = require("../models/PipelineTemplate");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// GET /api/workspaces/:id/pipeline-templates
exports.listTemplates = catchAsync(async (req, res) => {
  const workspace = req.workspace;
  const templates = await PipelineTemplate.find({ workspaceId: workspace._id })
    .sort({ createdAt: -1 })
    .lean();
  res.status(200).json({ status: "success", data: { templates } });
});

// PUT /api/workspaces/:id/pipeline-templates/:templateId
exports.updateTemplate = catchAsync(async (req, res, next) => {
  const { templateId } = req.params;
  const workspace = req.workspace;
  const { name, description, items } = req.body;

  const template = await PipelineTemplate.findOne({
    _id: templateId,
    workspaceId: workspace._id,
  });
  if (!template) {
    return next(new AppError("Template tidak ditemukan", 404));
  }

  if (name !== undefined) {
    if (!name.trim()) {
      return next(new AppError("Nama template tidak boleh kosong", 400));
    }
    template.name = name.trim();
  }
  if (description !== undefined) template.description = description;
  if (items !== undefined) template.items = items;

  await template.save();

  res.status(200).json({ status: "success", data: { template } });
});

// DELETE /api/workspaces/:id/pipeline-templates/:templateId
exports.deleteTemplate = catchAsync(async (req, res, next) => {
  const { templateId } = req.params;
  const workspace = req.workspace;

  const template = await PipelineTemplate.findOneAndDelete({
    _id: templateId,
    workspaceId: workspace._id,
  });
  if (!template) {
    return next(new AppError("Template tidak ditemukan", 404));
  }

  res.status(200).json({ status: "success", message: "Template dihapus" });
});
```

- [ ] **Step 2: Write the routes**

```js
// server/src/routes/pipelineTemplate.routes.js
const express = require("express");
const router = express.Router({ mergeParams: true });
const templateController = require("../controllers/pipelineTemplate.controller");
const auth = require("../middlewares/auth");
const { workspaceMember } = require("../middlewares/rbac");

router.use(auth);

router.get("/", workspaceMember(), templateController.listTemplates);

router.put(
  "/:templateId",
  workspaceMember("owner", "admin", "member"),
  templateController.updateTemplate,
);

router.delete(
  "/:templateId",
  workspaceMember("owner", "admin"),
  templateController.deleteTemplate,
);

module.exports = router;
```

- [ ] **Step 3: Mount the routes**

In `server/src/app.js`, add `const pipelineTemplateRoutes = require("./routes/pipelineTemplate.routes");` next to the `eventPipelineRoutes` require, and:

```js
app.use("/api/workspaces/:id/pipeline-templates", pipelineTemplateRoutes);
```

- [ ] **Step 4: Verify manually**

1. `GET /api/workspaces/:id/pipeline-templates` → expect `200` with the template created in Task 5's verification step listed.
2. `PUT /api/workspaces/:id/pipeline-templates/:templateId` with `{ name: "Template Renamed" }` → expect `200` with updated `name`.
3. `DELETE /api/workspaces/:id/pipeline-templates/:templateId` → expect `200`, then re-run step 1 and confirm it's gone (hard delete, not soft — no `isDeleted` filter to work around).

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/pipelineTemplate.controller.js server/src/routes/pipelineTemplate.routes.js server/src/app.js
git commit -m "feat(server): add workspace-level pipeline template CRUD endpoints"
```

---

### Task 7: Frontend phase constants + `use-event-pipeline` hook

**Files:**
- Create: `client/lib/pipeline-phases.js`
- Create: `client/hooks/use-event-pipeline.js`

**Interfaces:**
- Consumes: `api` from `@/lib/api`, `getSocket` from `@/lib/socket` (existing).
- Produces: `PHASES`, `PHASE_LABELS` from `client/lib/pipeline-phases.js`. `useEventPipeline(workspaceId, eventId)` hook returning `{ phases, labels, loading, error, activeTaskId, setActiveTaskId, activeTask, createTask, moveTaskPhase, updateTask, deleteTask, archiveTask, unarchiveTask, watchTask, unwatchTask, applyTemplate, saveAsTemplate }`. Task 10 (tab component) consumes this hook's return shape exactly — in particular `activeTask`/`activeTaskId`/`setActiveTaskId` and the six task-mutation functions exist specifically to feed `TaskDetailPanel`'s real props (confirmed against `client/components/kanban/task-detail-panel.js:53-69`), not a self-fetching-by-id panel.

- [ ] **Step 1: Write the shared phase constants**

```js
// client/lib/pipeline-phases.js
export const PHASES = [
  "planning",
  "preparation",
  "marketing",
  "execution",
  "evaluation",
];

export const PHASE_LABELS = {
  planning: "Planning",
  preparation: "Preparation",
  marketing: "Marketing",
  execution: "Execution",
  evaluation: "Evaluation",
};

export const PHASE_COLORS = {
  planning: "#6B7280",
  preparation: "#3B82F6",
  marketing: "#F59E0B",
  execution: "#8B5CF6",
  evaluation: "#10B981",
};
```

- [ ] **Step 2: Write the hook**

```js
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { PHASES } from "@/lib/pipeline-phases";

function emptyPhases() {
  return PHASES.map((phase) => ({
    phase,
    tasks: [],
    progress: { done: 0, total: 0 },
  }));
}

export function useEventPipeline(workspaceId, eventId) {
  const [phases, setPhases] = useState(emptyPhases());
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTaskId, setActiveTaskId] = useState(null);

  const basePath = `/workspaces/${workspaceId}/events/${eventId}/pipeline`;
  const tasksBasePath = `/workspaces/${workspaceId}/tasks`;

  const fetchPipeline = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(basePath);
      setPhases(res.data.data.phases);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  const fetchLabels = useCallback(async () => {
    const res = await api.get(`/workspaces/${workspaceId}/labels`);
    setLabels(res.data.data.labels);
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId && eventId) {
      fetchPipeline();
      fetchLabels();
    }
  }, [workspaceId, eventId, fetchPipeline, fetchLabels]);

  // Task shown in the detail side panel — TaskDetailPanel takes the full
  // task object (not an id it fetches itself), so find it from local state.
  const activeTask = phases
    .flatMap((p) => p.tasks)
    .find((t) => t._id === activeTaskId) || null;

  // ── All tasks belonging to this event's pipeline, flat ──
  const allTaskIds = useRef(new Set());
  useEffect(() => {
    allTaskIds.current = new Set(
      phases.flatMap((p) => p.tasks.map((t) => t._id)),
    );
  }, [phases]);

  const createTask = useCallback(
    async (phase, taskData) => {
      const res = await api.post(`${basePath}/tasks`, { ...taskData, phase });
      await fetchPipeline();
      return res.data.data.task;
    },
    [basePath, fetchPipeline],
  );

  const moveTaskPhase = useCallback(
    async (taskId, newPhase) => {
      // Optimistic: move the task object between phase buckets locally
      setPhases((prev) => {
        let moved = null;
        const withoutTask = prev.map((p) => {
          const found = p.tasks.find((t) => t._id === taskId);
          if (found) moved = found;
          return { ...p, tasks: p.tasks.filter((t) => t._id !== taskId) };
        });
        if (!moved) return prev;
        return withoutTask.map((p) =>
          p.phase === newPhase
            ? { ...p, tasks: [...p.tasks, { ...moved, phase: newPhase }] }
            : p,
        );
      });
      try {
        await api.put(`/workspaces/${workspaceId}/tasks/${taskId}`, {
          phase: newPhase,
        });
      } catch (err) {
        await fetchPipeline();
        throw err;
      }
    },
    [workspaceId, fetchPipeline],
  );

  // ── Generic task mutations, needed to feed TaskDetailPanel's
  // onUpdate/onDelete/onArchive/onUnarchive/onWatch/onUnwatch props ──
  const updateTask = useCallback(
    async (taskId, updates) => {
      await api.put(`${tasksBasePath}/${taskId}`, updates);
      await fetchPipeline();
    },
    [tasksBasePath, fetchPipeline],
  );

  const deleteTask = useCallback(
    async (taskId) => {
      await api.delete(`${tasksBasePath}/${taskId}`);
      setActiveTaskId(null);
      await fetchPipeline();
    },
    [tasksBasePath, fetchPipeline],
  );

  const archiveTask = useCallback(
    async (taskId) => {
      await api.post(`${tasksBasePath}/${taskId}/archive`);
      await fetchPipeline();
    },
    [tasksBasePath, fetchPipeline],
  );

  const unarchiveTask = useCallback(
    async (taskId) => {
      await api.post(`${tasksBasePath}/${taskId}/unarchive`);
      await fetchPipeline();
    },
    [tasksBasePath, fetchPipeline],
  );

  const watchTask = useCallback(
    async (taskId) => {
      await api.post(`${tasksBasePath}/${taskId}/watch`);
      await fetchPipeline();
    },
    [tasksBasePath, fetchPipeline],
  );

  const unwatchTask = useCallback(
    async (taskId) => {
      await api.delete(`${tasksBasePath}/${taskId}/watch`);
      await fetchPipeline();
    },
    [tasksBasePath, fetchPipeline],
  );

  const applyTemplate = useCallback(
    async (templateId) => {
      await api.post(`${basePath}/apply-template`, { templateId });
      await fetchPipeline();
    },
    [basePath, fetchPipeline],
  );

  const saveAsTemplate = useCallback(
    async (name, description) => {
      const res = await api.post(`${basePath}/save-as-template`, {
        name,
        description,
      });
      return res.data.data.template;
    },
    [basePath],
  );

  // ── Real-time sync ──
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const isOurs = (task) => task?.eventId?.toString?.() === eventId || task?.eventId === eventId;

    const handleTaskCreated = ({ task }) => {
      if (!task || task.phase == null || !isOurs(task)) return;
      fetchPipeline();
    };
    const handleTaskUpdated = ({ task }) => {
      if (!task) return;
      if (task.phase != null && isOurs(task)) {
        fetchPipeline();
      } else if (allTaskIds.current.has(task._id)) {
        // Task used to be in our pipeline (phase cleared, or moved off-event)
        fetchPipeline();
      }
    };
    const handleTaskDeleted = ({ taskId }) => {
      if (allTaskIds.current.has(taskId)) fetchPipeline();
    };

    socket.on("task:created", handleTaskCreated);
    socket.on("task:updated", handleTaskUpdated);
    socket.on("task:moved", handleTaskUpdated);
    socket.on("task:deleted", handleTaskDeleted);

    return () => {
      socket.off("task:created", handleTaskCreated);
      socket.off("task:updated", handleTaskUpdated);
      socket.off("task:moved", handleTaskUpdated);
      socket.off("task:deleted", handleTaskDeleted);
    };
  }, [eventId, fetchPipeline]);

  return {
    phases,
    labels,
    loading,
    error,
    activeTaskId,
    setActiveTaskId,
    activeTask,
    createTask,
    moveTaskPhase,
    updateTask,
    deleteTask,
    archiveTask,
    unarchiveTask,
    watchTask,
    unwatchTask,
    applyTemplate,
    saveAsTemplate,
    refetch: fetchPipeline,
  };
}
```

*(This hook deliberately uses "optimistic move, refetch-on-any-other-change" rather than the heavier pending-ops-queue pattern in `use-event-divisions.js` — phase moves have no member-style concurrent-edit risk, and a refetch of one event's pipeline is cheap.)*

- [ ] **Step 3: Verify manually**

In a scratch component or the browser console on any page already wrapped by the app's providers: `import { useEventPipeline } from "@/hooks/use-event-pipeline"` and call it with a real workspaceId/eventId; confirm `phases` populates after mount with 5 entries in `console.log`. (Full UI verification happens in Task 8 once the tab exists.)

- [ ] **Step 4: Commit**

```bash
git add client/lib/pipeline-phases.js client/hooks/use-event-pipeline.js
git commit -m "feat(client): add pipeline phase constants and use-event-pipeline hook"
```

---

### Task 8: `use-pipeline-templates` hook

**Files:**
- Create: `client/hooks/use-pipeline-templates.js`

**Interfaces:**
- Consumes: `api` from `@/lib/api`.
- Produces: `usePipelineTemplates(workspaceId)` returning `{ templates, loading, fetchTemplates, updateTemplate, deleteTemplate }`. Task 10 (template dialogs) consumes this.

- [ ] **Step 1: Write the hook**

```js
"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

export function usePipelineTemplates(workspaceId) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  const basePath = `/workspaces/${workspaceId}/pipeline-templates`;

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(basePath);
      setTemplates(res.data.data.templates);
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    if (workspaceId) fetchTemplates();
  }, [workspaceId, fetchTemplates]);

  const updateTemplate = useCallback(
    async (templateId, updates) => {
      const res = await api.put(`${basePath}/${templateId}`, updates);
      setTemplates((prev) =>
        prev.map((t) => (t._id === templateId ? res.data.data.template : t)),
      );
      return res.data.data.template;
    },
    [basePath],
  );

  const deleteTemplate = useCallback(
    async (templateId) => {
      await api.delete(`${basePath}/${templateId}`);
      setTemplates((prev) => prev.filter((t) => t._id !== templateId));
    },
    [basePath],
  );

  return { templates, loading, fetchTemplates, updateTemplate, deleteTemplate };
}
```

- [ ] **Step 2: Verify manually**

Same approach as Task 7 step 3: call the hook with a real `workspaceId` and confirm `templates` populates with the template(s) created during Task 5/6 manual verification.

- [ ] **Step 3: Commit**

```bash
git add client/hooks/use-pipeline-templates.js
git commit -m "feat(client): add use-pipeline-templates hook"
```

---

### Task 9: Pipeline quick-create modal

**Files:**
- Create: `client/components/events/pipeline-quick-create-modal.js`

**Interfaces:**
- Consumes: shadcn/ui primitives only (no task-card imports needed — this modal has no assignee picker, unlike the generic quick-create modal).
- Produces: `<PipelineQuickCreateModal open onOpenChange phase onCreateTask />`. Task 10 (tab component) renders one instance, reused across phase columns via the `phase` prop.

- [ ] **Step 1: Write the modal**

```js
"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PHASE_LABELS } from "@/lib/pipeline-phases";
import { cn } from "@/lib/utils";

export function PipelineQuickCreateModal({
  open,
  onOpenChange,
  phase,
  onCreateTask,
}) {
  const [title, setTitle] = useState("");
  const [dueDateMode, setDueDateMode] = useState("relative");
  const [offsetDays, setOffsetDays] = useState("");
  const [dueDate, setDueDate] = useState(null);
  const [creating, setCreating] = useState(false);
  const titleInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDueDateMode("relative");
      setOffsetDays("");
      setDueDate(null);
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const taskData = {
        title: title.trim(),
        dueDateMode,
        dueOffsetDays: dueDateMode === "relative" ? Number(offsetDays) : null,
        dueDate:
          dueDateMode === "absolute" && dueDate ? dueDate.toISOString() : null,
      };
      await onCreateTask(phase, taskData);
      onOpenChange(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Item Baru — {PHASE_LABELS[phase]}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Judul <span className="text-red-500">*</span>
            </Label>
            <Input
              ref={titleInputRef}
              placeholder="Contoh: Susun rundown acara"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Due Date</Label>
            <RadioGroup
              value={dueDateMode}
              onValueChange={setDueDateMode}
              className="flex gap-4"
            >
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="relative" id="mode-relative" />
                <Label htmlFor="mode-relative" className="text-xs font-normal">
                  Relatif (H-N)
                </Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="absolute" id="mode-absolute" />
                <Label htmlFor="mode-absolute" className="text-xs font-normal">
                  Tanggal
                </Label>
              </div>
            </RadioGroup>

            {dueDateMode === "relative" ? (
              <Input
                type="number"
                placeholder="mis. -14 untuk H-14, 2 untuk H+2"
                value={offsetDays}
                onChange={(e) => setOffsetDays(e.target.value)}
                className="h-9 text-xs"
              />
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-9 justify-start text-left text-xs font-normal",
                      !dueDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {dueDate
                      ? format(dueDate, "d MMM yyyy", { locale: localeId })
                      : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating} size="sm">
            Batal
          </Button>
          <Button
            onClick={handleCreate}
            disabled={
              !title.trim() ||
              creating ||
              (dueDateMode === "relative" && offsetDays === "")
            }
            size="sm"
          >
            {creating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            Buat Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Check `radio-group` exists in shadcn/ui components**

Run: `Test-Path client/components/ui/radio-group.jsx` (PowerShell) or `ls client/components/ui/radio-group.jsx` (bash).
If missing, run `cd client && npx shadcn@latest add radio-group` before proceeding.

- [ ] **Step 3: Verify manually**

This component has no standalone page yet — full verification happens in Task 10 once it's rendered from the tab. Confirm only that it has no syntax errors: `cd client && npx next lint --file components/events/pipeline-quick-create-modal.js` (or run `npm run build` later in Task 12 as the real gate).

- [ ] **Step 4: Commit**

```bash
git add client/components/events/pipeline-quick-create-modal.js
git commit -m "feat(client): add pipeline quick-create modal with relative/absolute due date"
```

---

### Task 10: Pipeline phase column + main tab component

**Files:**
- Create: `client/components/events/pipeline-phase-column.js`
- Create: `client/components/events/event-pipeline-tab.js`

**Interfaces:**
- Consumes: `useEventPipeline` (Task 7), `PipelineQuickCreateModal` (Task 9), `TaskCard` from `@/components/kanban/task-card` (existing), `TaskDetailPanel` from `@/components/kanban/task-detail-panel` (existing — real signature confirmed: `{ task, open, onClose, columns, members, labels, events, currentUserId, workspaceId, onUpdate, onDelete, onArchive, onUnarchive, onWatch, onUnwatch }`, at `client/components/kanban/task-detail-panel.js:53-69`), `useAuth` from `@/contexts/auth-context` (existing), `PHASE_LABELS` from `@/lib/pipeline-phases`.
- Produces: `<EventPipelineTab event workspaceId workspace members />`. Task 12 (event detail page) renders this inside the new "Pipeline" `TabsContent`.

- [ ] **Step 1: Write the phase column**

```js
// client/components/events/pipeline-phase-column.js
"use client";

import { Droppable } from "@hello-pangea/dnd";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TaskCard } from "@/components/kanban/task-card";
import { PHASE_LABELS, PHASE_COLORS } from "@/lib/pipeline-phases";
import { cn } from "@/lib/utils";

export function PipelinePhaseColumn({ phase, tasks, progress, onQuickCreate, onTaskClick }) {
  const percent =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="flex flex-col w-72 shrink-0 rounded-lg border bg-muted/30">
      <div
        className="h-1 rounded-t-lg"
        style={{ backgroundColor: PHASE_COLORS[phase] }}
      />
      <div className="p-3 space-y-2 border-b bg-background/60 rounded-t-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{PHASE_LABELS[phase]}</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onQuickCreate(phase)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Progress value={percent} className="h-1.5 flex-1" />
          <span className="text-[10px] text-muted-foreground shrink-0">
            {progress.done}/{progress.total}
          </span>
        </div>
      </div>

      <Droppable droppableId={phase}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 p-2 space-y-2 min-h-[120px] overflow-y-auto",
              snapshot.isDraggingOver && "bg-primary/5",
            )}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task._id}
                task={task}
                index={index}
                isSelected={false}
                onToggleSelect={() => {}}
                onClick={() => onTaskClick(task)}
                isDependencyBlocked={false}
              />
            ))}
            {provided.placeholder}
            {tasks.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Belum ada item
              </p>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
```

- [ ] **Step 2: Write the main tab component**

```js
// client/components/events/event-pipeline-tab.js
"use client";

import { useState, useCallback } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { LayoutTemplate, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEventPipeline } from "@/hooks/use-event-pipeline";
import { useAuth } from "@/contexts/auth-context";
import { PipelinePhaseColumn } from "./pipeline-phase-column";
import { PipelineQuickCreateModal } from "./pipeline-quick-create-modal";
import { PipelineTemplateDialog } from "./pipeline-template-dialog";
import { TaskDetailPanel } from "@/components/kanban/task-detail-panel";

export function EventPipelineTab({ event, workspaceId, workspace, members }) {
  const { user } = useAuth();
  const {
    phases,
    labels,
    loading,
    activeTaskId,
    setActiveTaskId,
    activeTask,
    createTask,
    moveTaskPhase,
    updateTask,
    deleteTask,
    archiveTask,
    unarchiveTask,
    watchTask,
    unwatchTask,
    applyTemplate,
    saveAsTemplate,
  } = useEventPipeline(workspaceId, event._id);

  const [quickCreatePhase, setQuickCreatePhase] = useState(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  const totalTasks = phases.reduce((sum, p) => sum + p.tasks.length, 0);

  // Wrap hook mutations with toasts, matching the pattern used on the
  // main Kanban page (client/app/workspace/[id]/tasks/kanban/page.js).
  const handleUpdateTask = useCallback(
    async (taskId, updates) => {
      try {
        await updateTask(taskId, updates);
      } catch {
        toast.error("Gagal mengupdate task");
      }
    },
    [updateTask],
  );
  const handleDeleteTask = useCallback(
    async (taskId) => {
      try {
        await deleteTask(taskId);
        toast.success("Task berhasil dihapus");
      } catch {
        toast.error("Gagal menghapus task");
      }
    },
    [deleteTask],
  );
  const handleArchiveTask = useCallback(
    async (taskId) => {
      try {
        await archiveTask(taskId);
        toast.success("Task berhasil diarsipkan");
      } catch {
        toast.error("Gagal mengarsipkan task");
      }
    },
    [archiveTask],
  );
  const handleUnarchiveTask = useCallback(
    async (taskId) => {
      try {
        await unarchiveTask(taskId);
        toast.success("Task berhasil diunarsipkan");
      } catch {
        toast.error("Gagal membatalkan arsip");
      }
    },
    [unarchiveTask],
  );
  const handleWatchTask = useCallback(
    async (taskId) => {
      try {
        await watchTask(taskId);
      } catch {
        toast.error("Gagal menjadi watcher");
      }
    },
    [watchTask],
  );
  const handleUnwatchTask = useCallback(
    async (taskId) => {
      try {
        await unwatchTask(taskId);
      } catch {
        toast.error("Gagal berhenti menjadi watcher");
      }
    },
    [unwatchTask],
  );

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;
    moveTaskPhase(draggableId, destination.droppableId);
  };

  if (loading) {
    return (
      <div className="flex gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-64 w-72 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setTemplateDialogOpen(true)}>
          <LayoutTemplate className="h-3.5 w-3.5 mr-1.5" />
          {totalTasks === 0 ? "Terapkan Template" : "Kelola Template"}
        </Button>
        {totalTasks > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTemplateDialogOpen("save")}
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Simpan sebagai Template
          </Button>
        )}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {phases.map((p) => (
            <PipelinePhaseColumn
              key={p.phase}
              phase={p.phase}
              tasks={p.tasks}
              progress={p.progress}
              onQuickCreate={setQuickCreatePhase}
              onTaskClick={(task) => setActiveTaskId(task._id)}
            />
          ))}
        </div>
      </DragDropContext>

      <PipelineQuickCreateModal
        open={!!quickCreatePhase}
        onOpenChange={(open) => !open && setQuickCreatePhase(null)}
        phase={quickCreatePhase}
        onCreateTask={createTask}
      />

      <PipelineTemplateDialog
        open={!!templateDialogOpen}
        mode={templateDialogOpen === "save" ? "save" : "apply"}
        onOpenChange={(open) => !open && setTemplateDialogOpen(false)}
        workspaceId={workspaceId}
        onApplyTemplate={applyTemplate}
        onSaveAsTemplate={saveAsTemplate}
      />

      <TaskDetailPanel
        task={activeTask}
        open={!!activeTaskId}
        onClose={() => setActiveTaskId(null)}
        columns={workspace?.kanbanColumns || []}
        members={members}
        labels={labels}
        events={[event]}
        currentUserId={user?._id}
        workspaceId={workspaceId}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
        onArchive={handleArchiveTask}
        onUnarchive={handleUnarchiveTask}
        onWatch={handleWatchTask}
        onUnwatch={handleUnwatchTask}
      />
    </div>
  );
}
```

Note on `events={[event]}`: `TaskDetailPanel` uses `events` to populate an event-reassignment dropdown. Inside a single event's Pipeline tab, only that event is a sensible option — passing just `[event]` avoids fetching the full workspace event list for a dropdown that would rarely be used to move a pipeline item to an unrelated event.

- [ ] **Step 3: Verify manually**

This depends on Task 11 (template dialog must exist) and Task 12 (tab must be mounted in the event detail page) to render — full manual verification happens in Task 12. For now, confirm no build errors: `cd client && npm run build 2>&1 | tail -50` and check there's no error referencing these two new files (an "unresolved import" for `pipeline-template-dialog` is expected until Task 11 lands — that's fine at this checkpoint).

- [ ] **Step 4: Commit**

```bash
git add client/components/events/pipeline-phase-column.js client/components/events/event-pipeline-tab.js
git commit -m "feat(client): add pipeline phase column and main tab component"
```

---

### Task 11: Pipeline template dialog (apply / save / manage)

**Files:**
- Create: `client/components/events/pipeline-template-dialog.js`

**Interfaces:**
- Consumes: `usePipelineTemplates` (Task 8).
- Produces: `<PipelineTemplateDialog open mode onOpenChange workspaceId onApplyTemplate onSaveAsTemplate />`, rendered by `EventPipelineTab` (Task 10).

- [ ] **Step 1: Write the dialog**

```js
"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePipelineTemplates } from "@/hooks/use-pipeline-templates";
import { toast } from "sonner";

export function PipelineTemplateDialog({
  open,
  mode, // "apply" | "save"
  onOpenChange,
  workspaceId,
  onApplyTemplate,
  onSaveAsTemplate,
}) {
  const { templates, loading, deleteTemplate } = usePipelineTemplates(workspaceId);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const handleApply = async () => {
    if (!selectedTemplateId) return;
    setBusy(true);
    try {
      await onApplyTemplate(selectedTemplateId);
      toast.success("Template diterapkan");
      onOpenChange(false);
    } catch (err) {
      toast.error("Gagal menerapkan template");
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await onSaveAsTemplate(newName.trim(), "");
      toast.success("Template disimpan");
      onOpenChange(false);
    } catch (err) {
      toast.error("Gagal menyimpan template");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "save" ? "Simpan sebagai Template" : "Kelola Template Pipeline"}
          </DialogTitle>
        </DialogHeader>

        {mode === "save" ? (
          <div className="space-y-1.5 py-2">
            <Label className="text-xs font-medium">Nama Template</Label>
            <Input
              placeholder="Contoh: Template Seminar"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Terapkan Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Pilih template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.name} ({t.items.length} item)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Semua Template</Label>
              <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-1.5">
                {loading && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Memuat...
                  </p>
                )}
                {!loading && templates.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Belum ada template
                  </p>
                )}
                {templates.map((t) => (
                  <div
                    key={t._id}
                    className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent"
                  >
                    <span className="text-xs">{t.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => deleteTemplate(t._id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy} size="sm">
            Batal
          </Button>
          {mode === "save" ? (
            <Button onClick={handleSave} disabled={!newName.trim() || busy} size="sm">
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Simpan
            </Button>
          ) : (
            <Button onClick={handleApply} disabled={!selectedTemplateId || busy} size="sm">
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Terapkan
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify manually**

`cd client && npm run build 2>&1 | tail -50` — confirm the "unresolved import" for `pipeline-template-dialog` from Task 10 is now gone and there are no new errors.

- [ ] **Step 3: Commit**

```bash
git add client/components/events/pipeline-template-dialog.js
git commit -m "feat(client): add pipeline template apply/save/manage dialog"
```

---

### Task 12: Wire the Pipeline tab into the Event detail page

**Files:**
- Modify: `client/app/workspace/[id]/events/[eventId]/page.js`

**Interfaces:**
- Consumes: `EventPipelineTab` (Task 10).

- [ ] **Step 1: Import the component**

Add near the other event tab imports (after `import { EventNotesTab } from "@/components/events/event-notes-tab";`):

```js
import { EventPipelineTab } from "@/components/events/event-pipeline-tab";
```

- [ ] **Step 2: Add the tab trigger**

Change `<TabsList className="w-full grid grid-cols-5 h-10">` to `<TabsList className="w-full grid grid-cols-6 h-10">`, and add a new trigger right after the "tasks" `TabsTrigger` block (after its closing `</TabsTrigger>`, before the "notes" trigger). Import `GitBranch` (or similar) from `lucide-react` alongside the other icon imports:

```js
          <TabsTrigger value="pipeline" className="gap-1.5 text-xs sm:text-sm">
            <GitBranch className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Pipeline</span>
          </TabsTrigger>
```

- [ ] **Step 3: Add the tab content**

Right after the "Tab: Tasks" `TabsContent` block (after its closing `</TabsContent>`, before "Tab: Notes"), add:

```js
        {/* Tab: Pipeline */}
        <TabsContent value="pipeline" className="mt-0">
          <EventPipelineTab
            event={event}
            workspaceId={id}
            workspace={currentWorkspace}
            members={members}
          />
        </TabsContent>
```

- [ ] **Step 4: Verify manually**

Run `cd client && npm run dev`, open `/workspace/:id/events/:eventId` for a real event in the browser, click the new "Pipeline" tab, and confirm:
1. All 5 phase columns render with 0/0 progress.
2. Clicking "+" on a phase opens the quick-create modal; creating an item with relative mode `-14` shows the item in that column afterward.
3. Dragging the created item to a different phase column moves it there and persists after a page refresh.
4. "Simpan sebagai Template" then "Terapkan Template" on the same event adds a duplicate item rather than replacing anything.
5. Clicking an item card opens the existing task detail side panel.

- [ ] **Step 5: Commit**

```bash
git add client/app/workspace/[id]/events/[eventId]/page.js
git commit -m "feat(client): wire Pipeline tab into event detail page"
```

---

### Task 13: Feature doc

**Files:**
- Create: `docs/features/26-pipeline-event.md`

**Interfaces:** None (documentation only).

- [ ] **Step 1: Write the doc**, following the structure of `docs/features/25-event-divisions.md` (Ringkasan → Struktur Data → API Endpoints → Socket.io Events → Komponen Frontend):

```markdown
# 🧭 Fitur 26 — Pipeline Event

## Ringkasan

Pipeline Event mem-breakdown persiapan event ke 5 fase tetap: **Planning → Preparation → Marketing → Execution → Evaluation**. Setiap item di dalam fase adalah **Task asli** (field `phase` pada model Task), sehingga otomatis muncul di Kanban Board dan Kalender. Due date tiap item bisa **relatif** (offset hari dari tanggal event, mis. H-14) atau **absolut**. Struktur pipeline sebuah event bisa disimpan sebagai **template** dan diterapkan ulang ke event lain.

## Struktur Data

### Task (field baru)

| Field | Tipe | Keterangan |
| --- | --- | --- |
| `phase` | string enum atau `null` | `planning`\|`preparation`\|`marketing`\|`execution`\|`evaluation` |
| `dueDateMode` | string enum atau `null` | `absolute`\|`relative` |
| `dueOffsetDays` | number atau `null` | Offset hari dari `event.startDate`/`endDate` |

### Collection: `pipelinetemplates`

| Field | Tipe |
| --- | --- |
| `workspaceId` | ObjectId |
| `name` | string |
| `description` | string |
| `items[]` | `{ phase, title, dueDateMode, dueOffsetDays, order }` |
| `createdBy` | ObjectId |

## API Endpoints

| Method | Endpoint | Deskripsi |
| --- | --- | --- |
| GET | `/api/workspaces/:id/events/:eventId/pipeline` | Task pipeline event, dikelompokkan per fase + progress |
| POST | `/api/workspaces/:id/events/:eventId/pipeline/tasks` | Buat task pipeline baru |
| POST | `/api/workspaces/:id/events/:eventId/pipeline/apply-template` | Terapkan template (additive) |
| POST | `/api/workspaces/:id/events/:eventId/pipeline/save-as-template` | Simpan pipeline event sebagai template baru |
| GET | `/api/workspaces/:id/pipeline-templates` | Daftar template workspace |
| PUT | `/api/workspaces/:id/pipeline-templates/:templateId` | Update template |
| DELETE | `/api/workspaces/:id/pipeline-templates/:templateId` | Hapus template (hard delete) |

## Socket.io Events

Tidak ada event baru — reuse `task:created`, `task:updated`, `task:moved`, `task:deleted` yang sudah ada di room `workspace:{workspaceId}`.

## Komponen Frontend

| File | Peran |
| --- | --- |
| `client/hooks/use-event-pipeline.js` | Fetch + mutate pipeline satu event, sync real-time |
| `client/hooks/use-pipeline-templates.js` | CRUD template workspace |
| `client/components/events/event-pipeline-tab.js` | Tab utama, 5 kolom fase |
| `client/components/events/pipeline-phase-column.js` | Satu kolom fase (progress bar + drop target) |
| `client/components/events/pipeline-quick-create-modal.js` | Modal buat item dengan toggle due date relatif/absolut |
| `client/components/events/pipeline-template-dialog.js` | Dialog terapkan/simpan/kelola template |
```

- [ ] **Step 2: Commit**

```bash
git add docs/features/26-pipeline-event.md
git commit -m "docs: add Pipeline Event feature documentation"
```

---
