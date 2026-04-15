PRAGMA foreign_keys=OFF;--> statement-breakpoint
DROP TABLE `priority_categories`;--> statement-breakpoint
CREATE TABLE `__new_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`date_created` text NOT NULL,
	`date_completed` text,
	`start_date` text,
	`user_id` text NOT NULL,
	`parent_task_id` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`parent_task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_tasks`("id", "title", "notes", "date_created", "date_completed", "start_date", "user_id", "parent_task_id", "sort_order") SELECT "id", "title", "notes", "date_created", "date_completed", "start_date", "user_id", "parent_task_id", "sort_order" FROM `tasks`;--> statement-breakpoint
DROP TABLE `tasks`;--> statement-breakpoint
ALTER TABLE `__new_tasks` RENAME TO `tasks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;