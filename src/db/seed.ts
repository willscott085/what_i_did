import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const client = postgres(DATABASE_URL);
const db = drizzle(client, { schema });

// Clear existing data
await db.delete(schema.noteMetadata);
await db.delete(schema.noteTags);
await db.delete(schema.notes);
await db.delete(schema.taskTags);
await db.delete(schema.tasks);
await db.delete(schema.tags);

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

await db.insert(schema.tasks).values(sampleTasks);

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

// Seed task-tag relationships
await db.insert(schema.taskTags).values([
  { taskId: "tsk_001", tagId: "tag_002" },
  { taskId: "tsk_002", tagId: "tag_002" },
  { taskId: "tsk_002", tagId: "tag_003" },
  { taskId: "tsk_003", tagId: "tag_001" },
  { taskId: "tsk_005", tagId: "tag_001" },
  { taskId: "tsk_005", tagId: "tag_004" },
  { taskId: "tsk_006", tagId: "tag_001" },
  { taskId: "tsk_006", tagId: "tag_003" },
  { taskId: "tsk_008", tagId: "tag_001" },
]);

// Seed sample notes
const sampleNotes = [
  {
    id: "nte_001",
    content:
      "Spoke with Sarah about the Jenkins pipeline failing on staging. She thinks it's a Docker image caching issue. Need to check the build logs.",
    title: "Jenkins Pipeline Staging Issue",
    date: todayStr,
    sortOrder: 0,
    userId: "1",
    dateCreated: "2026-04-18T09:30:00.000Z",
    dateUpdated: "2026-04-18T09:30:00.000Z",
  },
  {
    id: "nte_002",
    content:
      "Meeting with design team — agreed on new colour palette for dashboard. Moving away from blue-heavy scheme to more neutral tones with accent colours per feature area.",
    title: "Dashboard Redesign Colour Palette",
    date: todayStr,
    sortOrder: 1,
    userId: "1",
    dateCreated: "2026-04-17T14:15:00.000Z",
    dateUpdated: "2026-04-17T14:15:00.000Z",
  },
  {
    id: "nte_003",
    content:
      "Idea: add keyboard shortcuts for common actions — Cmd+N for new task, Cmd+Shift+N for new note, Cmd+K for search. Check what VS Code and Linear use for reference.",
    title: null,
    date: null,
    sortOrder: 0,
    userId: "1",
    dateCreated: "2026-04-16T11:00:00.000Z",
    dateUpdated: "2026-04-16T11:00:00.000Z",
  },
  {
    id: "nte_004",
    content:
      "Performance review prep: shipped task system, calendar integration, and drag-drop. Contributed to design system tokens. Mentored two junior devs on React Query patterns.",
    title: "Q1 Performance Review Notes",
    date: null,
    sortOrder: 1,
    userId: "1",
    dateCreated: "2026-04-10T16:45:00.000Z",
    dateUpdated: "2026-04-15T10:20:00.000Z",
  },
];

await db.insert(schema.notes).values(sampleNotes);

// Seed note-tag relationships
await db.insert(schema.noteTags).values([
  { noteId: "nte_001", tagId: "tag_002" }, // Jenkins note → backend
  { noteId: "nte_001", tagId: "tag_003" }, // Jenkins note → urgent
  { noteId: "nte_002", tagId: "tag_001" }, // Design note → frontend
  { noteId: "nte_003", tagId: "tag_001" }, // Keyboard shortcuts → frontend
]);

// Seed note metadata (AI-generated keywords)
await db.insert(schema.noteMetadata).values([
  {
    noteId: "nte_001",
    keywords:
      "Jenkins, CI/CD, pipeline, staging, Docker, caching, build, Sarah, DevOps, infrastructure",
  },
  {
    noteId: "nte_002",
    keywords:
      "design, dashboard, colour, palette, UI, redesign, meeting, neutral, accent",
  },
  { noteId: "nte_003", keywords: null },
  {
    noteId: "nte_004",
    keywords:
      "performance, review, accomplishments, React Query, mentoring, design system, drag-drop",
  },
]);

console.info("Database seeded successfully.");
console.info(`  - ${sampleTasks.length} tasks (including ${2} subtasks)`);
console.info(`  - ${4} tags`);
console.info(`  - ${9} task-tag relationships`);
console.info(`  - ${sampleNotes.length} notes`);
console.info(`  - ${4} note-tag relationships`);
console.info(`  - ${4} note metadata entries`);

await client.end();
