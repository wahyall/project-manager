const assert = require("assert");
const {
  isWorkspaceAdmin,
  isTaskStatusOnlyPayload,
  isEventStatusOnlyPayload,
  canManageTaskSync,
  canManageEventSync,
} = require("./src/utils/rbacRules");

console.log("=== RBAC Comprehensive Integration Test Suite ===");

const divA = "65a000000000000000000001";
const divB = "65a000000000000000000002";
const userLeaderA = "65b000000000000000000001";
const userRegularMember = "65b000000000000000000002";

// ── 1. Owner & Admin ─────────────────────────────────────────────
console.log("\n1. Testing Owner & Admin Permissions...");
for (const role of ["owner", "admin"]) {
  // Can create task without division
  assert.strictEqual(
    canManageTaskSync({ role, leaderDivisions: [], task: {}, action: "create", payload: {} }).allowed,
    true,
    `${role} should be able to create task without division`
  );

  // Can create event without division
  assert.strictEqual(
    canManageEventSync({ role, leaderDivisions: [], event: {}, action: "create", payload: {} }).allowed,
    true,
    `${role} should be able to create event without division`
  );

  // Can update task full data
  assert.strictEqual(
    canManageTaskSync({
      role,
      leaderDivisions: [],
      task: { divisionId: divA },
      action: "update",
      payload: { title: "New Title", description: "Updated", priority: "critical" },
    }).allowed,
    true,
    `${role} should be able to update full task`
  );

  // Can delete task
  assert.strictEqual(
    canManageTaskSync({ role, leaderDivisions: [], task: { divisionId: divA }, action: "delete" }).allowed,
    true,
    `${role} should be able to delete task`
  );

  // Can update event full data
  assert.strictEqual(
    canManageEventSync({
      role,
      leaderDivisions: [],
      event: { divisionId: divA },
      action: "update",
      payload: { title: "Updated Event Title", startDate: new Date() },
    }).allowed,
    true,
    `${role} should be able to update full event`
  );

  // Can delete event
  assert.strictEqual(
    canManageEventSync({ role, leaderDivisions: [], event: { divisionId: divA }, action: "delete" }).allowed,
    true,
    `${role} should be able to delete event`
  );
}
console.log("-> Owner & Admin tests PASSED!");

// ── 2. Ketua Divisi (Leader of Divisi A) ─────────────────────────
console.log("\n2. Testing Ketua Divisi (Leader of Divisi A) Permissions...");
const leaderDivisions = [divA];

// Can create task with Divisi A
assert.strictEqual(
  canManageTaskSync({
    role: "member",
    leaderDivisions,
    task: { divisionId: divA },
    action: "create",
    payload: { divisionId: divA },
  }).allowed,
  true,
  "Leader of Divisi A should be able to create task for Divisi A"
);

// Rejected create task for Divisi B
assert.strictEqual(
  canManageTaskSync({
    role: "member",
    leaderDivisions,
    task: { divisionId: divB },
    action: "create",
    payload: { divisionId: divB },
  }).allowed,
  false,
  "Leader of Divisi A must NOT be able to create task for Divisi B"
);

// Rejected create task without division
assert.strictEqual(
  canManageTaskSync({
    role: "member",
    leaderDivisions,
    task: { divisionId: null, divisionIds: [] },
    action: "create",
    payload: {},
  }).allowed,
  false,
  "Leader must NOT be able to create task without division"
);

// Can update full task of Divisi A
assert.strictEqual(
  canManageTaskSync({
    role: "member",
    leaderDivisions,
    task: { divisionId: divA },
    action: "update",
    payload: { title: "Div A task edit", dueDate: new Date() },
  }).allowed,
  true,
  "Leader of Divisi A should be able to update full task of Divisi A"
);

// Can delete task of Divisi A
assert.strictEqual(
  canManageTaskSync({
    role: "member",
    leaderDivisions,
    task: { divisionId: divA },
    action: "delete",
  }).allowed,
  true,
  "Leader of Divisi A should be able to delete task of Divisi A"
);

// Cannot delete task of Divisi B
assert.strictEqual(
  canManageTaskSync({
    role: "member",
    leaderDivisions,
    task: { divisionId: divB },
    action: "delete",
  }).allowed,
  false,
  "Leader of Divisi A must NOT be able to delete task of Divisi B"
);

// Can create event with Divisi A
assert.strictEqual(
  canManageEventSync({
    role: "member",
    leaderDivisions,
    event: { divisionId: divA },
    action: "create",
    payload: { divisionId: divA },
  }).allowed,
  true,
  "Leader of Divisi A should be able to create event for Divisi A"
);

// Rejected create event for Divisi B
assert.strictEqual(
  canManageEventSync({
    role: "member",
    leaderDivisions,
    event: { divisionId: divB },
    action: "create",
    payload: { divisionId: divB },
  }).allowed,
  false,
  "Leader of Divisi A must NOT be able to create event for Divisi B"
);

// Rejected create event without division
assert.strictEqual(
  canManageEventSync({
    role: "member",
    leaderDivisions,
    event: { divisionId: null },
    action: "create",
    payload: {},
  }).allowed,
  false,
  "Leader must NOT be able to create event without division"
);

// Can update full event of Divisi A
assert.strictEqual(
  canManageEventSync({
    role: "member",
    leaderDivisions,
    event: { divisionId: divA },
    action: "update",
    payload: { title: "Div A event edit", speakerNotes: "Notes" },
  }).allowed,
  true,
  "Leader of Divisi A should be able to update full event of Divisi A"
);

// Can delete event of Divisi A
assert.strictEqual(
  canManageEventSync({
    role: "member",
    leaderDivisions,
    event: { divisionId: divA },
    action: "delete",
  }).allowed,
  true,
  "Leader of Divisi A should be able to delete event of Divisi A"
);

// Cannot delete event of Divisi B
assert.strictEqual(
  canManageEventSync({
    role: "member",
    leaderDivisions,
    event: { divisionId: divB },
    action: "delete",
  }).allowed,
  false,
  "Leader of Divisi A must NOT be able to delete event of Divisi B"
);
console.log("-> Ketua Divisi tests PASSED!");

// ── 3. Member Biasa (Regular Member) ──────────────────────────────
console.log("\n3. Testing Member Biasa Permissions...");
const regularLeaderDivisions = [];

// Rejected create task
assert.strictEqual(
  canManageTaskSync({
    role: "member",
    leaderDivisions: regularLeaderDivisions,
    task: { divisionId: divA },
    action: "create",
    payload: { divisionId: divA },
  }).allowed,
  false,
  "Regular member must NOT be able to create task"
);

// Rejected create event
assert.strictEqual(
  canManageEventSync({
    role: "member",
    leaderDivisions: regularLeaderDivisions,
    event: { divisionId: divA },
    action: "create",
    payload: { divisionId: divA },
  }).allowed,
  false,
  "Regular member must NOT be able to create event"
);

// Rejected delete task
assert.strictEqual(
  canManageTaskSync({
    role: "member",
    leaderDivisions: regularLeaderDivisions,
    task: { divisionId: divA },
    action: "delete",
  }).allowed,
  false,
  "Regular member must NOT be able to delete task"
);

// Rejected delete event
assert.strictEqual(
  canManageEventSync({
    role: "member",
    leaderDivisions: regularLeaderDivisions,
    event: { divisionId: divA },
    action: "delete",
  }).allowed,
  false,
  "Regular member must NOT be able to delete event"
);

// Rejected update task title / description / dueDate
assert.strictEqual(
  canManageTaskSync({
    role: "member",
    leaderDivisions: regularLeaderDivisions,
    task: { divisionId: divA },
    action: "update",
    payload: { title: "Illegal Title Update" },
  }).allowed,
  false,
  "Regular member must NOT be able to update task title"
);

// ALLOWED update task column (status change)
assert.strictEqual(
  canManageTaskSync({
    role: "member",
    leaderDivisions: regularLeaderDivisions,
    task: { divisionId: divA },
    action: "update",
    payload: { columnId: "col-in-progress", columnOrder: 2 },
  }).allowed,
  true,
  "Regular member SHOULD be able to move task status / column"
);

// ALLOWED toggle subtask
assert.strictEqual(
  canManageTaskSync({
    role: "member",
    leaderDivisions: regularLeaderDivisions,
    task: { divisionId: divA },
    action: "update",
    payload: { subtasks: [{ title: "Subtask 1", isCompleted: true }] },
  }).allowed,
  true,
  "Regular member SHOULD be able to toggle subtask status"
);

// Rejected update event title / dates
assert.strictEqual(
  canManageEventSync({
    role: "member",
    leaderDivisions: regularLeaderDivisions,
    event: { divisionId: divA },
    action: "update",
    payload: { title: "Illegal Event Title" },
  }).allowed,
  false,
  "Regular member must NOT be able to update event title"
);

// ALLOWED update event status ("upcoming" -> "ongoing")
assert.strictEqual(
  canManageEventSync({
    role: "member",
    leaderDivisions: regularLeaderDivisions,
    event: { divisionId: divA },
    action: "update",
    payload: { status: "ongoing" },
  }).allowed,
  true,
  "Regular member SHOULD be able to update event status"
);

console.log("-> Member Biasa tests PASSED!");

console.log("\n==================================================");
console.log(">>> ALL INTEGRATION TEST ASSERTIONS PASSED! <<<");
console.log("==================================================");

