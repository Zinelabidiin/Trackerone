CREATE TABLE `deviceCallLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`eventKey` varchar(160) NOT NULL,
	`phoneNumber` varchar(80),
	`cachedName` varchar(160),
	`callType` int NOT NULL,
	`startedAt` timestamp NOT NULL,
	`durationSeconds` int NOT NULL DEFAULT 0,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deviceCallLogs_id` PRIMARY KEY(`id`),
	CONSTRAINT `deviceCallLogs_eventKey_unique` UNIQUE(`eventKey`)
);
--> statement-breakpoint
CREATE TABLE `deviceContacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`contactKey` varchar(160) NOT NULL,
	`displayName` varchar(200),
	`phoneNumber` varchar(80),
	`contactType` int NOT NULL DEFAULT 0,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deviceContacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `deviceContacts_contactKey_unique` UNIQUE(`contactKey`)
);
--> statement-breakpoint
CREATE TABLE `deviceUsageStats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`usageKey` varchar(180) NOT NULL,
	`packageName` varchar(220) NOT NULL,
	`totalTimeForegroundMillis` int NOT NULL DEFAULT 0,
	`lastTimeUsed` timestamp NOT NULL,
	`usageDate` timestamp NOT NULL,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deviceUsageStats_id` PRIMARY KEY(`id`),
	CONSTRAINT `deviceUsageStats_usageKey_unique` UNIQUE(`usageKey`)
);
