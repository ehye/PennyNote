CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`currency` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`balance_target` integer,
	`balance_date` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_name_currency` ON `accounts` (`name`,`currency`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`name` text NOT NULL,
	`icon` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`date` text NOT NULL,
	`account_id` text NOT NULL,
	`destination_id` text,
	`category_id` text,
	`amount` integer NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`balance_before` integer,
	`balance_after` integer,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`destination_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
