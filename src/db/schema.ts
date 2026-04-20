import {
  pgTable,
  text,
  foreignKey,
  primaryKey,
  customType,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// =====================
// Custom Types
// =====================

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
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

// --- Items (unified: task | note | event) ---

export const items = pgTable(
  "items",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(), // 'task' | 'note' | 'event'
    title: text("title").notNull(),
    content: text("content"),
    date: text("date"),
    dateCompleted: text("date_completed"),
    parentItemId: text("parent_item_id"),
    sortOrder: text("sort_order").notNull().default("a0"),
    userId: text("user_id").notNull(),
    dateCreated: text("date_created").notNull(),
    dateUpdated: text("date_updated").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.parentItemId],
      foreignColumns: [table.id],
    }).onDelete("cascade"),
  ],
);

// --- Item Tags (junction) ---

export const itemTags = pgTable(
  "item_tags",
  {
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.tagId] })],
);

// --- Item Metadata (one-to-one, AI-generated) ---

export const itemMetadata = pgTable("item_metadata", {
  itemId: text("item_id")
    .primaryKey()
    .references(() => items.id, { onDelete: "cascade" }),
  keywords: text("keywords"),
  embedding: bytea("embedding"),
});

// --- Schedules (reminders / recurrence, attached to any item) ---

export const schedules = pgTable("schedules", {
  id: text("id").primaryKey(),
  itemId: text("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  reminderTime: text("reminder_time").notNull(),
  rrule: text("rrule"),
  snoozedUntil: text("snoozed_until"),
  cloneOnFire: boolean("clone_on_fire").notNull().default(false),
  status: text("status").notNull().default("active"), // 'active' | 'snoozed' | 'dismissed' | 'completed'
  dateCreated: text("date_created").notNull(),
  dateUpdated: text("date_updated").notNull(),
});

// --- Schedule History ---

export const scheduleHistory = pgTable("schedule_history", {
  id: text("id").primaryKey(),
  scheduleId: text("schedule_id")
    .notNull()
    .references(() => schedules.id, { onDelete: "cascade" }),
  firedAt: text("fired_at").notNull(),
  action: text("action").notNull(), // 'notified' | 'task_created' | 'snoozed' | 'dismissed'
  createdItemId: text("created_item_id").references(() => items.id, {
    onDelete: "set null",
  }),
});

// --- Push Subscriptions ---

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  dateCreated: text("date_created").notNull(),
});

// =====================
// Relations
// =====================

export const tagsRelations = relations(tags, ({ many }) => ({
  itemTags: many(itemTags),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  parentItem: one(items, {
    fields: [items.parentItemId],
    references: [items.id],
    relationName: "subtasks",
  }),
  subtasks: many(items, { relationName: "subtasks" }),
  itemTags: many(itemTags),
  metadata: one(itemMetadata, {
    fields: [items.id],
    references: [itemMetadata.itemId],
  }),
  schedules: many(schedules),
}));

export const itemTagsRelations = relations(itemTags, ({ one }) => ({
  item: one(items, {
    fields: [itemTags.itemId],
    references: [items.id],
  }),
  tag: one(tags, {
    fields: [itemTags.tagId],
    references: [tags.id],
  }),
}));

export const itemMetadataRelations = relations(itemMetadata, ({ one }) => ({
  item: one(items, {
    fields: [itemMetadata.itemId],
    references: [items.id],
  }),
}));

export const schedulesRelations = relations(schedules, ({ one, many }) => ({
  item: one(items, {
    fields: [schedules.itemId],
    references: [items.id],
  }),
  history: many(scheduleHistory),
}));

export const scheduleHistoryRelations = relations(
  scheduleHistory,
  ({ one }) => ({
    schedule: one(schedules, {
      fields: [scheduleHistory.scheduleId],
      references: [schedules.id],
    }),
    createdItem: one(items, {
      fields: [scheduleHistory.createdItemId],
      references: [items.id],
    }),
  }),
);

// =====================
// Legacy table exports (kept for migration reference, will be removed after migration)
// =====================
// These are exported so the migration script can reference them.
// After running migration 0004, these table definitions and the actual
// database tables no longer exist.

/** @deprecated Use `items` table */
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
    sortOrder: text("sort_order").notNull().default("a0"),
  },
  (table) => [
    foreignKey({
      columns: [table.parentTaskId],
      foreignColumns: [table.id],
    }),
  ],
);

/** @deprecated Use `itemTags` table */
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

/** @deprecated Use `items` table */
export const notes = pgTable("notes", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  title: text("title"),
  date: text("date"),
  sortOrder: text("sort_order").notNull().default("0"),
  userId: text("user_id").notNull(),
  dateCreated: text("date_created").notNull(),
  dateUpdated: text("date_updated").notNull(),
});

/** @deprecated Use `itemTags` table */
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

/** @deprecated Use `itemMetadata` table */
export const noteMetadata = pgTable("note_metadata", {
  noteId: text("note_id")
    .primaryKey()
    .references(() => notes.id, { onDelete: "cascade" }),
  keywords: text("keywords"),
  embedding: bytea("embedding"),
});
