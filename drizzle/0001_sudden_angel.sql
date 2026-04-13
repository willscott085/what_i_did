PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`date_created` text NOT NULL,
	`date_completed` text,
	`due_date` text,
	`due_time` text,
	`user_id` text NOT NULL,
	`priority_category_id` text,
	`parent_task_id` text,
	`recurrence_rule` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`priority_category_id`) REFERENCES `priority_categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`parent_task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_tasks`("id", "title", "notes", "date_created", "date_completed", "due_date", "due_time", "user_id", "priority_category_id", "parent_task_id", "recurrence_rule", "sort_order") SELECT "id", "title", "notes", "date_created", "date_completed", CASE WHEN "due_date" IS NULL THEN NULL WHEN length("due_date") > 10 THEN substr("due_date", 1, 10) ELSE "due_date" END, NULL, "user_id", "priority_category_id", "parent_task_id", "recurrence_rule", "sort_order" FROM `tasks`;--> statement-breakpoint
DROP TABLE `tasks`;--> statement-breakpoint
ALTER TABLE `__new_tasks` RENAME TO `tasks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_task_tags` (
	`task_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`task_id`, `tag_id`),
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_task_tags`("task_id", "tag_id") SELECT "task_id", "tag_id" FROM `task_tags`;--> statement-breakpoint
DROP TABLE `task_tags`;--> statement-breakpoint
ALTER TABLE `__new_task_tags` RENAME TO `task_tags`;--> statement-breakpoint
CREATE UNIQUE INDEX `list_items_list_task_unique` ON `list_items` (`list_id`,`task_id`);