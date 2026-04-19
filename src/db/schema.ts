import {
  pgTable,
  text,
  integer,
  foreignKey,
  primaryKey,
  customType,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// =====================
// Custom Types
// =====================

const bytea = customType<{ data: Buffer; dpiverType: Buffer }>({
  dataType() {
    return "bytea";
  },
});

// =====================
// Table Declarations
// =====================

// --- Tags ---

export const tags = pgTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color"),
  userId: text("user_id").notNull(),
  dateCreated: text("date_created").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// --- Tasks ---

export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    notes: text("notes"),
    dateCreated: text("date_created").notNull(),
    dateCompleted: text("date_completed"),
    startDate: text("start_date"),
    userId: text("user_id").notNull(),
    parentTaskId: text("parent_task_id"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    foreignKey({
      columns: [table.parentTaskId],
      foreignColumns: [table.id],
    }),
  ],
);

// --- Task Tags (junction) ---

export const taskTags = pgTable(
  "task_tags",
  {
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.taskId, table.tagId] })],
);

// --- Notes ---

export const notes = pgTable("notes", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  title: text("title"),
  date: text("date"),
  sortOrder: integer("sort_order").notNull().default(0),
  userId: text("user_id").notNull(),
  dateCreated: text("date_created").notNull(),
  dateUpdated: text("date_updated").notNull(),
});

// --- Note Tags (junction) ---

export const noteTags = pgTable(
  "note_tags",
  {
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.noteId, table.tagId] })],
);

// --- Note Metadata (one-to-one with notes, AI-generated) ---

export const noteMetadata = pgTable("note_metadata", {
  noteId: text("note_id")
    .primaryKey()
    .references(() => notes.id, { onDelete: "cascade" }),
  keywords: text("keywords"),
  embedding: bytea("embedding"),
});

// =====================
// Relations
// =====================

export const tagsRelations = relations(tags, ({ many }) => ({
  taskTags: many(taskTags),
  noteTags: many(noteTags),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  parentTask: one(tasks, {
    fields: [tasks.parentTaskId],
    references: [tasks.id],
    relationName: "subtasks",
  }),
  subtasks: many(tasks, { relationName: "subtasks" }),
  taskTags: many(taskTags),
}));

export const taskTagsRelations = relations(taskTags, ({ one }) => ({
  task: one(tasks, {
    fields: [taskTags.taskId],
    references: [tasks.id],
  }),
  tag: one(tags, {
    fields: [taskTags.tagId],
    references: [tags.id],
  }),
}));

export const notesRelations = relations(notes, ({ many, one }) => ({
  noteTags: many(noteTags),
  metadata: one(noteMetadata, {
    fields: [notes.id],
    references: [noteMetadata.noteId],
  }),
}));

export const noteTagsRelations = relations(noteTags, ({ one }) => ({
  note: one(notes, {
    fields: [noteTags.noteId],
    references: [notes.id],
  }),
  tag: one(tags, {
    fields: [noteTags.tagId],
    references: [tags.id],
  }),
}));

export const noteMetadataRelations = relations(noteMetadata, ({ one }) => ({
  note: one(notes, {
    fields: [noteMetadata.noteId],
    references: [notes.id],
  }),
}));
