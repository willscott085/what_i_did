import {
  sqliteTable,
  text,
  integer,
  foreignKey,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// =====================
// Table Declarations
// =====================

// --- Priority Categories ---

export const priorityCategories = sqliteTable("priority_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  userId: text("user_id").notNull(),
});

// --- Tags ---

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color"),
  userId: text("user_id").notNull(),
});

// --- Tasks ---

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    notes: text("notes"),
    dateCreated: text("date_created").notNull(),
    dateCompleted: text("date_completed"),
    dueDate: text("due_date"),
    dueTime: text("due_time"),
    userId: text("user_id").notNull(),
    priorityCategoryId: text("priority_category_id").references(
      () => priorityCategories.id,
      { onDelete: "set null" },
    ),
    parentTaskId: text("parent_task_id"),
    recurrenceRule: text("recurrence_rule"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    foreignKey({
      columns: [table.parentTaskId],
      foreignColumns: [table.id],
    }),
  ],
);

// --- Lists ---

export const lists = sqliteTable("lists", {
  id: text("id").primaryKey(),
  title: text("title"),
  userId: text("user_id").notNull(),
});

// --- List Items (junction: ordered tasks in lists) ---

export const listItems = sqliteTable(
  "list_items",
  {
    id: text("id").primaryKey(),
    listId: text("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("list_items_list_task_unique").on(table.listId, table.taskId),
  ],
);

// --- Task Tags (junction) ---

export const taskTags = sqliteTable(
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

// =====================
// Relations
// =====================

export const priorityCategoriesRelations = relations(
  priorityCategories,
  ({ many }) => ({
    tasks: many(tasks),
  }),
);

export const tagsRelations = relations(tags, ({ many }) => ({
  taskTags: many(taskTags),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  priorityCategory: one(priorityCategories, {
    fields: [tasks.priorityCategoryId],
    references: [priorityCategories.id],
  }),
  parentTask: one(tasks, {
    fields: [tasks.parentTaskId],
    references: [tasks.id],
    relationName: "subtasks",
  }),
  subtasks: many(tasks, { relationName: "subtasks" }),
  taskTags: many(taskTags),
  listItems: many(listItems),
}));

export const listsRelations = relations(lists, ({ many }) => ({
  listItems: many(listItems),
}));

export const listItemsRelations = relations(listItems, ({ one }) => ({
  list: one(lists, {
    fields: [listItems.listId],
    references: [lists.id],
  }),
  task: one(tasks, {
    fields: [listItems.taskId],
    references: [tasks.id],
  }),
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
