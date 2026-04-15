import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

const sqlite = new Database("./data/whatidid.db");
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite, { schema });

// Apply migrations first
migrate(db, { migrationsFolder: "./drizzle" });

// Clear existing data
db.delete(schema.taskTags).run();
db.delete(schema.tasks).run();
db.delete(schema.tags).run();

// Seed sample tasks
const formatDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const today = new Date();
const todayStr = formatDate(today);

const sampleTasks = [
  {
    id: "tsk_001",
    title: "Plan Q4 roadmap",
    notes: "Outline key deliverables and milestones.",
    dateCreated: "2025-09-25T09:12:03.000Z",
    dateCompleted: null,
    startDate: todayStr,
    userId: "1",
    sortOrder: 0,
  },
  {
    id: "tsk_002",
    title: "Refactor legacy auth module",
    notes: "Improve readability and add missing tests.",
    dateCreated: "2025-09-20T14:31:10.000Z",
    dateCompleted: null,
    startDate: todayStr,
    userId: "1",
    sortOrder: 1,
  },
  {
    id: "tsk_003",
    title: "Write unit tests for task utils",
    notes: "Focus on edge cases around completion toggling.",
    dateCreated: "2025-09-29T11:05:47.000Z",
    dateCompleted: null,
    userId: "1",
    sortOrder: 2,
  },
  {
    id: "tsk_004",
    title: "Update README deployment section",
    notes: "Add staging environment notes.",
    dateCreated: "2025-09-18T08:44:55.000Z",
    dateCompleted: null,
    userId: "1",
    sortOrder: 3,
  },
  {
    id: "tsk_005",
    title: "Design notification settings UI",
    notes: "Keep components accessible with proper ARIA.",
    dateCreated: "2025-10-01T10:02:11.000Z",
    dateCompleted: null,
    startDate: todayStr,
    userId: "1",
    sortOrder: 4,
  },
  {
    id: "tsk_006",
    title: "Fix timezone bug in date picker",
    notes: "Occurs when user switches locale mid-session.",
    dateCreated: "2025-09-30T07:22:39.000Z",
    dateCompleted: null,
    userId: "1",
    sortOrder: 5,
  },
  {
    id: "tsk_007",
    title: "Add API error handling tests",
    notes: "Cover error states (500, 404).",
    dateCreated: "2025-09-27T15:50:33.000Z",
    dateCompleted: "2025-11-17T17:46:50.189Z",
    userId: "1",
    sortOrder: 6,
  },
  {
    id: "tsk_008",
    title: "Optimize bundle size",
    notes: "Investigate code splitting for feature routes.",
    dateCreated: "2025-09-23T09:05:14.000Z",
    dateCompleted: null,
    userId: "1",
    sortOrder: 7,
  },
  {
    id: "tsk_009",
    title: "Create productivity tips blog draft",
    notes: "Reference reputable sources.",
    dateCreated: "2025-09-26T12:14:57.000Z",
    dateCompleted: "2026-04-10T12:00:00.000Z",
    userId: "1",
    sortOrder: 8,
  },
  {
    id: "tsk_010",
    title: "Build task filtering system",
    notes: "Use client-side filtering first pass.",
    dateCreated: "2025-10-03T13:43:22.000Z",
    dateCompleted: null,
    userId: "1",
    sortOrder: 9,
  },
  // Subtasks of tsk_001
  {
    id: "tsk_012",
    title: "Gather team input on priorities",
    notes: null,
    dateCreated: "2025-09-25T09:15:00.000Z",
    dateCompleted: null,
    parentTaskId: "tsk_001",
    userId: "1",
    sortOrder: 0,
  },
  {
    id: "tsk_013",
    title: "Draft milestone timeline",
    notes: null,
    dateCreated: "2025-09-25T09:16:00.000Z",
    dateCompleted: "2025-10-02T11:00:00.000Z",
    parentTaskId: "tsk_001",
    userId: "1",
    sortOrder: 1,
  },
];

db.insert(schema.tasks).values(sampleTasks).run();

// Seed tags
db.insert(schema.tags)
  .values([
    { id: "tag_001", name: "frontend", color: "#3b82f6", userId: "1" },
    { id: "tag_002", name: "backend", color: "#22c55e", userId: "1" },
    { id: "tag_003", name: "urgent", color: "#ef4444", userId: "1" },
    { id: "tag_004", name: "review", color: "#8b5cf6", userId: "1" },
  ])
  .run();

// Seed task-tag relationships
db.insert(schema.taskTags)
  .values([
    { taskId: "tsk_001", tagId: "tag_002" },
    { taskId: "tsk_002", tagId: "tag_002" },
    { taskId: "tsk_002", tagId: "tag_003" },
    { taskId: "tsk_003", tagId: "tag_001" },
    { taskId: "tsk_005", tagId: "tag_001" },
    { taskId: "tsk_005", tagId: "tag_004" },
    { taskId: "tsk_006", tagId: "tag_001" },
    { taskId: "tsk_006", tagId: "tag_003" },
    { taskId: "tsk_008", tagId: "tag_001" },
  ])
  .run();

console.info("Database seeded successfully.");
console.info(`  - ${sampleTasks.length} tasks (including ${2} subtasks)`);
console.info(`  - ${4} tags`);
console.info(`  - ${9} task-tag relationships`);

sqlite.close();
