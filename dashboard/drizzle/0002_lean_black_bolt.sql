CREATE TABLE `deviceTelemetry` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`latitude` varchar(32),
	`longitude` varchar(32),
	`batteryPercent` int,
	`network` varchar(80),
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deviceTelemetry_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `devices` ADD `authToken` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `devices` ADD CONSTRAINT `devices_authToken_unique` UNIQUE(`authToken`);