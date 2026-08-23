CREATE TABLE `deviceNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`eventKey` varchar(240) NOT NULL,
	`packageName` varchar(220) NOT NULL,
	`appName` varchar(160),
	`title` varchar(500),
	`body` varchar(1500),
	`postedAt` timestamp NOT NULL,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deviceNotifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `deviceNotifications_eventKey_unique` UNIQUE(`eventKey`)
);
