CREATE TABLE `triviaAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`questionId` int NOT NULL,
	`selectedOptionIndex` int NOT NULL,
	`isCorrect` int NOT NULL,
	`pointsAwarded` int NOT NULL DEFAULT 0,
	`answeredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `triviaAttempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `triviaQuestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`language` varchar(8) NOT NULL DEFAULT 'fr',
	`category` varchar(40) NOT NULL,
	`difficulty` enum('easy','medium','hard') NOT NULL DEFAULT 'easy',
	`prompt` varchar(500) NOT NULL,
	`options` json NOT NULL,
	`correctOptionIndex` int NOT NULL,
	`explanation` varchar(500) NOT NULL,
	`source` varchar(160) NOT NULL DEFAULT 'curated',
	`active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `triviaQuestions_id` PRIMARY KEY(`id`)
);
