import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const devices = mysqlTable("devices", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  platform: mysqlEnum("platform", ["android", "iphone"]).notNull(),
  deviceId: varchar("deviceId", { length: 64 }).notNull().unique(),
  authToken: varchar("authToken", { length: 64 }).notNull().unique(),
  status: varchar("status", { length: 80 }).notNull().default("Synchronisé il y a 2 min"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const invitations = mysqlTable("invitations", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  email: varchar("email", { length: 320 }),
  token: varchar("token", { length: 32 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Device = typeof devices.$inferSelect;
export const deviceTelemetry = mysqlTable("deviceTelemetry", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: int("deviceId").notNull(),
  latitude: varchar("latitude", { length: 32 }),
  longitude: varchar("longitude", { length: 32 }),
  batteryPercent: int("batteryPercent"),
  network: varchar("network", { length: 80 }),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

export type Invitation = typeof invitations.$inferSelect;
export type DeviceTelemetry = typeof deviceTelemetry.$inferSelect;

export const triviaProfiles = mysqlTable("triviaProfiles", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: int("deviceId").notNull().unique(),
  score: int("score").notNull().default(0),
  bestScore: int("bestScore").notNull().default(0),
  nickname: varchar("nickname", { length: 80 }).notNull().default("Nouveau joueur"),
  level: int("level").notNull().default(1),
  iconKey: varchar("iconKey", { length: 32 }).notNull().default("seedling"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TriviaProfile = typeof triviaProfiles.$inferSelect;

export const triviaQuestions = mysqlTable("triviaQuestions", {
  id: int("id").autoincrement().primaryKey(),
  language: varchar("language", { length: 8 }).notNull().default("fr"),
  category: varchar("category", { length: 40 }).notNull(),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).notNull().default("easy"),
  prompt: varchar("prompt", { length: 500 }).notNull(),
  options: json("options").notNull(),
  correctOptionIndex: int("correctOptionIndex").notNull(),
  explanation: varchar("explanation", { length: 500 }).notNull(),
  source: varchar("source", { length: 160 }).notNull().default("curated"),
  active: int("active").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const triviaAttempts = mysqlTable("triviaAttempts", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: int("deviceId").notNull(),
  questionId: int("questionId").notNull(),
  selectedOptionIndex: int("selectedOptionIndex").notNull(),
  isCorrect: int("isCorrect").notNull(),
  pointsAwarded: int("pointsAwarded").notNull().default(0),
  answeredAt: timestamp("answeredAt").defaultNow().notNull(),
});

export type TriviaQuestion = typeof triviaQuestions.$inferSelect;
export type TriviaAttempt = typeof triviaAttempts.$inferSelect;

export const adminCredentials = mysqlTable("adminCredentials", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 120 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 128 }).notNull(),
  passwordSalt: varchar("passwordSalt", { length: 64 }).notNull(),
  sessionVersion: int("sessionVersion").notNull().default(1),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdminCredential = typeof adminCredentials.$inferSelect;

export const deviceCallLogs = mysqlTable("deviceCallLogs", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: int("deviceId").notNull(),
  eventKey: varchar("eventKey", { length: 160 }).notNull().unique(),
  phoneNumber: varchar("phoneNumber", { length: 80 }),
  cachedName: varchar("cachedName", { length: 160 }),
  callType: int("callType").notNull(),
  startedAt: timestamp("startedAt").notNull(),
  durationSeconds: int("durationSeconds").notNull().default(0),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
});

export const deviceContacts = mysqlTable("deviceContacts", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: int("deviceId").notNull(),
  contactKey: varchar("contactKey", { length: 160 }).notNull().unique(),
  displayName: varchar("displayName", { length: 200 }),
  phoneNumber: varchar("phoneNumber", { length: 80 }),
  contactType: int("contactType").notNull().default(0),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
});

export const deviceUsageStats = mysqlTable("deviceUsageStats", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: int("deviceId").notNull(),
  usageKey: varchar("usageKey", { length: 180 }).notNull().unique(),
  packageName: varchar("packageName", { length: 220 }).notNull(),
  totalTimeForegroundMillis: int("totalTimeForegroundMillis").notNull().default(0),
  lastTimeUsed: timestamp("lastTimeUsed").notNull(),
  usageDate: timestamp("usageDate").notNull(),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
});

export const deviceNotifications = mysqlTable("deviceNotifications", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: int("deviceId").notNull(),
  eventKey: varchar("eventKey", { length: 240 }).notNull().unique(),
  packageName: varchar("packageName", { length: 220 }).notNull(),
  appName: varchar("appName", { length: 160 }),
  title: varchar("title", { length: 500 }),
  body: varchar("body", { length: 1500 }),
  postedAt: timestamp("postedAt").notNull(),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
});

export type DeviceCallLog = typeof deviceCallLogs.$inferSelect;
export type DeviceContact = typeof deviceContacts.$inferSelect;
export type DeviceUsageStat = typeof deviceUsageStats.$inferSelect;
export type DeviceNotification = typeof deviceNotifications.$inferSelect;
