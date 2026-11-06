CREATE TABLE `chapters` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`body` text NOT NULL,
	`position` integer NOT NULL,
	`published_title` text,
	`published_description` text,
	`published_body` text,
	`published_position` integer,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	`published_at` text,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`caption` text NOT NULL,
	`object_key` text,
	`mime` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `replies` (
	`id` text PRIMARY KEY NOT NULL,
	`topic_id` text NOT NULL,
	`body` text NOT NULL,
	`author_id` text NOT NULL,
	`author_name` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_replies_topic` ON `replies` (`topic_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_replies_author_date` ON `replies` (`author_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `topics` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`category` text NOT NULL,
	`chapter_id` text,
	`author_id` text NOT NULL,
	`author_name` text NOT NULL,
	`pinned` integer DEFAULT 0 NOT NULL,
	`locked` integer DEFAULT 0 NOT NULL,
	`hidden` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_topics_public` ON `topics` (`hidden`,`pinned`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_topics_chapter` ON `topics` (`chapter_id`);--> statement-breakpoint
CREATE INDEX `idx_topics_author_date` ON `topics` (`author_id`,`created_at`);