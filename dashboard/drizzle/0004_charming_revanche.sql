CREATE TABLE `adminCredentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(120) NOT NULL,
	`passwordHash` varchar(128) NOT NULL,
	`passwordSalt` varchar(64) NOT NULL,
	`sessionVersion` int NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `adminCredentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `adminCredentials_username_unique` UNIQUE(`username`)
);
