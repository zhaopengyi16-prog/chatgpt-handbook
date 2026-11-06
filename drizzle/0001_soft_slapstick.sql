CREATE TABLE `guest_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `replies` ADD `author_kind` text DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE `replies` ADD `moderation_status` text DEFAULT 'approved' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_replies_review` ON `replies` (`moderation_status`,`created_at`);--> statement-breakpoint
ALTER TABLE `topics` ADD `author_kind` text DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE `topics` ADD `moderation_status` text DEFAULT 'approved' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_topics_review` ON `topics` (`moderation_status`,`created_at`);