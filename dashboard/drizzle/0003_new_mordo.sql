CREATE TABLE `triviaProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`score` int NOT NULL DEFAULT 0,
	`nickname` varchar(80) NOT NULL DEFAULT 'Nouveau joueur',
	`level` int NOT NULL DEFAULT 1,
	`iconKey` varchar(32) NOT NULL DEFAULT 'seedling',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `triviaProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `triviaProfiles_deviceId_unique` UNIQUE(`deviceId`)
);
