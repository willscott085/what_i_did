import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { generateNKeysBetween } from "fractional-indexing";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const client = postgres(DATABASE_URL);
const db = drizzle(client, { schema });

// Clear existing data
await db.delete(schema.itemMetadata);
await db.delete(schema.itemTags);
await db.delete(schema.items);
await db.delete(schema.tags);

// Seed sample tasks
const formatDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const today = new Date();
const todayStr = formatDate(today);

// Generate fractional-indexing keys for seed data
const rootKeys = generateNKeysBetween(null, null, 10);
const subtaskKeys = generateNKeysBetween(null, null, 2);
const noteKeys = generateNKeysBetween(null, null, 4);
const eventKeys = generateNKeysBetween(null, null, 3);

const sampleItems = [
  // ── Tasks ──────────────────────────────────────────────────────────
  {
    id: "tsk_001",
    type: "task",
    title: "Plan Q4 roadmap",
    content: "Outline key deliverables and milestones.",
    dateCreated: "2025-09-25T09:12:03.000Z",
    dateUpdated: "2025-09-25T09:12:03.000Z",
    dateCompleted: null,
    date: todayStr,
    userId: "1",
    sortOrder: rootKeys[0],
    parentItemId: null,
  },
  {
    id: "tsk_002",
    type: "task",
    title: "Refactor legacy auth module",
    content: "Improve readability and add missing tests.",
    dateCreated: "2025-09-20T14:31:10.000Z",
    dateUpdated: "2025-09-20T14:31:10.000Z",
    dateCompleted: null,
    date: todayStr,
    userId: "1",
    sortOrder: rootKeys[1],
    parentItemId: null,
  },
  {
    id: "tsk_003",
    type: "task",
    title: "Write unit tests for task utils",
    content: "Focus on edge cases around completion toggling.",
    dateCreated: "2025-09-29T11:05:47.000Z",
    dateUpdated: "2025-09-29T11:05:47.000Z",
    dateCompleted: null,
    date: null,
    userId: "1",
    sortOrder: rootKeys[2],
    parentItemId: null,
  },
  {
    id: "tsk_004",
    type: "task",
    title: "Update README deployment section",
    content: "Add staging environment notes.",
    dateCreated: "2025-09-18T08:44:55.000Z",
    dateUpdated: "2025-09-18T08:44:55.000Z",
    dateCompleted: null,
    date: null,
    userId: "1",
    sortOrder: rootKeys[3],
    parentItemId: null,
  },
  {
    id: "tsk_005",
    type: "task",
    title: "Design notification settings UI",
    content: "Keep components accessible with proper ARIA.",
    dateCreated: "2025-10-01T10:02:11.000Z",
    dateUpdated: "2025-10-01T10:02:11.000Z",
    dateCompleted: null,
    date: todayStr,
    userId: "1",
    sortOrder: rootKeys[4],
    parentItemId: null,
  },
  {
    id: "tsk_006",
    type: "task",
    title: "Fix timezone bug in date picker",
    content: "Occurs when user switches locale mid-session.",
    dateCreated: "2025-09-30T07:22:39.000Z",
    dateUpdated: "2025-09-30T07:22:39.000Z",
    dateCompleted: null,
    date: null,
    userId: "1",
    sortOrder: rootKeys[5],
    parentItemId: null,
  },
  {
    id: "tsk_007",
    type: "task",
    title: "Add API error handling tests",
    content: "Cover error states (500, 404).",
    dateCreated: "2025-09-27T15:50:33.000Z",
    dateUpdated: "2025-11-17T17:46:50.189Z",
    dateCompleted: "2025-11-17T17:46:50.189Z",
    date: null,
    userId: "1",
    sortOrder: rootKeys[6],
    parentItemId: null,
  },
  {
    id: "tsk_008",
    type: "task",
    title: "Optimize bundle size",
    content: "Investigate code splitting for feature routes.",
    dateCreated: "2025-09-23T09:05:14.000Z",
    dateUpdated: "2025-09-23T09:05:14.000Z",
    dateCompleted: null,
    date: null,
    userId: "1",
    sortOrder: rootKeys[7],
    parentItemId: null,
  },
  {
    id: "tsk_009",
    type: "task",
    title: "Create productivity tips blog draft",
    content: "Reference reputable sources.",
    dateCreated: "2025-09-26T12:14:57.000Z",
    dateUpdated: "2026-04-10T12:00:00.000Z",
    dateCompleted: "2026-04-10T12:00:00.000Z",
    date: null,
    userId: "1",
    sortOrder: rootKeys[8],
    parentItemId: null,
  },
  {
    id: "tsk_010",
    type: "task",
    title: "Build task filtering system",
    content: "Use client-side filtering first pass.",
    dateCreated: "2025-10-03T13:43:22.000Z",
    dateUpdated: "2025-10-03T13:43:22.000Z",
    dateCompleted: null,
    date: null,
    userId: "1",
    sortOrder: rootKeys[9],
    parentItemId: null,
  },
  // Subtasks of tsk_001
  {
    id: "tsk_012",
    type: "task",
    title: "Gather team input on priorities",
    content: null,
    dateCreated: "2025-09-25T09:15:00.000Z",
    dateUpdated: "2025-09-25T09:15:00.000Z",
    dateCompleted: null,
    date: null,
    parentItemId: "tsk_001",
    userId: "1",
    sortOrder: subtaskKeys[0],
  },
  {
    id: "tsk_013",
    type: "task",
    title: "Draft milestone timeline",
    content: null,
    dateCreated: "2025-09-25T09:16:00.000Z",
    dateUpdated: "2025-10-02T11:00:00.000Z",
    dateCompleted: "2025-10-02T11:00:00.000Z",
    date: null,
    parentItemId: "tsk_001",
    userId: "1",
    sortOrder: subtaskKeys[1],
  },
  // ── Notes ──────────────────────────────────────────────────────────
  {
    id: "nte_001",
    type: "note",
    title: "Jenkins Pipeline Staging Issue",
    content:
      "Spoke with Sarah about the Jenkins pipeline failing on staging. She thinks it's a Docker image caching issue. Need to check the build logs.",
    date: todayStr,
    dateCompleted: null,
    parentItemId: null,
    sortOrder: noteKeys[0],
    userId: "1",
    dateCreated: "2026-04-18T09:30:00.000Z",
    dateUpdated: "2026-04-18T09:30:00.000Z",
  },
  {
    id: "nte_002",
    type: "note",
    title: "Dashboard Redesign Colour Palette",
    content:
      "Meeting with design team — agreed on new colour palette for dashboard. Moving away from blue-heavy scheme to more neutral tones with accent colours per feature area.",
    date: todayStr,
    dateCompleted: null,
    parentItemId: null,
    sortOrder: noteKeys[1],
    userId: "1",
    dateCreated: "2026-04-17T14:15:00.000Z",
    dateUpdated: "2026-04-17T14:15:00.000Z",
  },
  {
    id: "nte_003",
    type: "note",
    title: "Untitled",
    content:
      "Idea: add keyboard shortcuts for common actions — Cmd+N for new task, Cmd+Shift+N for new note, Cmd+K for search. Check what VS Code and Linear use for reference.",
    date: null,
    dateCompleted: null,
    parentItemId: null,
    sortOrder: noteKeys[2],
    userId: "1",
    dateCreated: "2026-04-16T11:00:00.000Z",
    dateUpdated: "2026-04-16T11:00:00.000Z",
  },
  {
    id: "nte_004",
    type: "note",
    title: "Q1 Performance Review Notes",
    content:
      "Performance review prep: shipped task system, calendar integration, and drag-drop. Contributed to design system tokens. Mentored two junior devs on React Query patterns.",
    date: null,
    dateCompleted: null,
    parentItemId: null,
    sortOrder: noteKeys[3],
    userId: "1",
    dateCreated: "2026-04-10T16:45:00.000Z",
    dateUpdated: "2026-04-15T10:20:00.000Z",
  },
  // ── Events ─────────────────────────────────────────────────────────
  {
    id: "evt_001",
    type: "event",
    title: "Team standup",
    content:
      "Daily sync with the engineering team. Check blockers and progress.",
    date: todayStr,
    dateCompleted: null,
    parentItemId: null,
    sortOrder: eventKeys[0],
    userId: "1",
    dateCreated: "2026-04-15T08:00:00.000Z",
    dateUpdated: "2026-04-15T08:00:00.000Z",
  },
  {
    id: "evt_002",
    type: "event",
    title: "Water the plants",
    content: null,
    date: todayStr,
    dateCompleted: null,
    parentItemId: null,
    sortOrder: eventKeys[1],
    userId: "1",
    dateCreated: "2026-04-14T10:00:00.000Z",
    dateUpdated: "2026-04-14T10:00:00.000Z",
  },
  {
    id: "evt_003",
    type: "event",
    title: "Review quarterly goals",
    content: "Go through OKRs and update progress tracking sheet.",
    date: null,
    dateCompleted: null,
    parentItemId: null,
    sortOrder: eventKeys[2],
    userId: "1",
    dateCreated: "2026-04-12T09:30:00.000Z",
    dateUpdated: "2026-04-12T09:30:00.000Z",
  },
];

// Insert root items first (no parentItemId), then subtasks
const rootItems = sampleItems.filter((i) => !i.parentItemId);
const subtaskItems = sampleItems.filter((i) => i.parentItemId);

await db.insert(schema.items).values(rootItems);
if (subtaskItems.length > 0) {
  await db.insert(schema.items).values(subtaskItems);
}

// Seed tags
await db.insert(schema.tags).values([
  {
    id: "tag_001",
    name: "frontend",
    description: "UI and client-side work",
    color: "#3b82f6",
    userId: "1",
    dateCreated: "2025-09-01T10:00:00.000Z",
    updatedAt: "2025-09-01T10:00:00.000Z",
  },
  {
    id: "tag_002",
    name: "backend",
    description: "Server and API work",
    color: "#22c55e",
    userId: "1",
    dateCreated: "2025-09-02T10:00:00.000Z",
    updatedAt: "2025-09-02T10:00:00.000Z",
  },
  {
    id: "tag_003",
    name: "urgent",
    description: null,
    color: "#ef4444",
    userId: "1",
    dateCreated: "2025-09-03T10:00:00.000Z",
    updatedAt: "2025-09-03T10:00:00.000Z",
  },
  {
    id: "tag_004",
    name: "review",
    description: "Needs code review",
    color: "#8b5cf6",
    userId: "1",
    dateCreated: "2025-09-04T10:00:00.000Z",
    updatedAt: "2025-09-04T10:00:00.000Z",
  },
]);

// Seed task-tag relationships (using itemTags)
const sampleItemTags = [
  { itemId: "tsk_001", tagId: "tag_002" },
  { itemId: "tsk_002", tagId: "tag_002" },
  { itemId: "tsk_002", tagId: "tag_003" },
  { itemId: "tsk_003", tagId: "tag_001" },
  { itemId: "tsk_005", tagId: "tag_001" },
  { itemId: "tsk_005", tagId: "tag_004" },
  { itemId: "tsk_006", tagId: "tag_001" },
  { itemId: "tsk_006", tagId: "tag_003" },
  { itemId: "tsk_008", tagId: "tag_001" },
  // Note-tag relationships
  { itemId: "nte_001", tagId: "tag_002" },
  { itemId: "nte_001", tagId: "tag_003" },
  { itemId: "nte_002", tagId: "tag_001" },
  { itemId: "nte_003", tagId: "tag_001" },
  // Event-tag relationships
  { itemId: "evt_001", tagId: "tag_002" },
  { itemId: "evt_002", tagId: "tag_001" },
];
await db.insert(schema.itemTags).values(sampleItemTags);

// Seed note metadata (AI-generated keywords)
const sampleMetadata = [
  {
    itemId: "nte_001",
    keywords:
      "Jenkins, CI/CD, pipeline, staging, Docker, caching, build, Sarah, DevOps, infrastructure",
  },
  {
    itemId: "nte_002",
    keywords:
      "design, dashboard, colour, palette, UI, redesign, meeting, neutral, accent",
  },
  { itemId: "nte_003", keywords: null },
  {
    itemId: "nte_004",
    keywords:
      "performance, review, accomplishments, React Query, mentoring, design system, drag-drop",
  },
];
await db.insert(schema.itemMetadata).values(sampleMetadata);

const taskCount = sampleItems.filter((i) => i.type === "task").length;
const noteCount = sampleItems.filter((i) => i.type === "note").length;
const eventCount = sampleItems.filter((i) => i.type === "event").length;

console.info("Database seeded successfully.");
console.info(
  `  - ${taskCount} tasks (including ${subtaskItems.length} subtasks)`,
);
console.info(`  - ${4} tags`);
console.info(`  - ${sampleItemTags.length} item-tag relationships`);
console.info(`  - ${noteCount} notes`);
console.info(`  - ${eventCount} events`);
console.info(`  - ${sampleMetadata.length} note metadata entries`);

await client.end();
