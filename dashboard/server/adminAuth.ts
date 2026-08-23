import type { Express, Request, Response } from "express";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { parse as parseCookieHeader } from "cookie";
import { z } from "zod";
import { createAdminCredential, getAdminCredentialByUsername, updateAdminCredential } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";

export const ADMIN_SESSION_COOKIE = "my-trivia-hub-admin";
const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;
const PASSWORD_HASH_BYTES = 64;
const loginSchema = z.object({ username: z.string().trim().min(1).max(120), password: z.string().min(1).max(200) });
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(12).max(200),
  confirmPassword: z.string().min(1).max(200),
}).superRefine((value, ctx) => {
  if (value.newPassword !== value.confirmPassword) ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Les mots de passe ne correspondent pas." });
  if (!/[A-Z]/.test(value.newPassword) || !/[a-z]/.test(value.newPassword) || !/[0-9]/.test(value.newPassword)) ctx.addIssue({ code: "custom", path: ["newPassword"], message: "Utilisez au moins 12 caractères avec une majuscule, une minuscule et un chiffre." });
  if (value.newPassword === value.currentPassword) ctx.addIssue({ code: "custom", path: ["newPassword"], message: "Le nouveau mot de passe doit être différent de l’ancien." });
});

type AdminIdentity = { username: string; exp: number; sessionVersion: number };
type ConfiguredAdmin = { username: string; password: string };

function configuredAdmins(): ConfiguredAdmin[] {
  return [
    { username: process.env.DASHBOARD_ADMIN_1_USERNAME ?? "", password: process.env.DASHBOARD_ADMIN_1_PASSWORD ?? "" },
    { username: process.env.DASHBOARD_ADMIN_2_USERNAME ?? "", password: process.env.DASHBOARD_ADMIN_2_PASSWORD ?? "" },
  ].filter(admin => admin.username && admin.password);
}

function secret() {
  return process.env.JWT_SECRET || "development-admin-session-secret";
}

function digest(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftDigest = Buffer.from(digest(left), "hex");
  const rightDigest = Buffer.from(digest(right), "hex");
  return timingSafeEqual(leftDigest, rightDigest);
}

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  return { passwordHash: scryptSync(password, salt, PASSWORD_HASH_BYTES).toString("hex"), passwordSalt: salt };
}

function verifyPassword(password: string, passwordHash: string, passwordSalt: string) {
  const expected = Buffer.from(passwordHash, "hex");
  const actual = scryptSync(password, passwordSalt, PASSWORD_HASH_BYTES);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function ensureAdminCredential(admin: ConfiguredAdmin) {
  const existing = await getAdminCredentialByUsername(admin.username);
  if (existing) return existing;
  return createAdminCredential({ username: admin.username, ...hashPassword(admin.password) });
}

function sign(payload: AdminIdentity) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${digest(encodedPayload)}`;
}

async function verify(value: string | undefined): Promise<AdminIdentity | null> {
  if (!value) return null;
  const [encodedPayload, signature] = value.split(".");
  if (!encodedPayload || !signature || !safeEqual(digest(encodedPayload), signature)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AdminIdentity;
    if (!payload.username || !Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000) || !Number.isInteger(payload.sessionVersion)) return null;
    const credential = await getAdminCredentialByUsername(payload.username);
    if (!credential || credential.sessionVersion !== payload.sessionVersion) return null;
    if (!configuredAdmins().some(admin => safeEqual(admin.username, payload.username))) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getAdminSession(req: Request) {
  return verify(parseCookieHeader(req.headers.cookie ?? "")[ADMIN_SESSION_COOKIE]);
}

export async function hasAdminSession(req: Request) {
  return Boolean(await getAdminSession(req));
}

export async function validateAdminCredentials(username: string, password: string) {
  const configured = configuredAdmins().find(admin => safeEqual(admin.username, username));
  if (!configured) return null;
  const credential = await ensureAdminCredential(configured);
  return credential && verifyPassword(password, credential.passwordHash, credential.passwordSalt) ? credential : null;
}

function setAdminCookie(req: Request, res: Response, credential: { username: string; sessionVersion: number }) {
  const value = sign({ username: credential.username, sessionVersion: credential.sessionVersion, exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS });
  res.cookie(ADMIN_SESSION_COOKIE, value, {
    ...getSessionCookieOptions(req),
    sameSite: "lax",
    maxAge: ADMIN_SESSION_TTL_SECONDS * 1000,
  });
}

export function passwordMeetsPolicy(password: string) {
  return password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);
}

export function registerAdminAuth(app: Express) {
  app.post("/api/admin/login", async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Identifiants invalides" });
    const credential = await validateAdminCredentials(parsed.data.username, parsed.data.password);
    if (!credential) return res.status(401).json({ error: "Nom d'utilisateur ou mot de passe incorrect" });
    setAdminCookie(req, res, credential);
    return res.json({ ok: true, admin: { username: credential.username } });
  });

  app.get("/api/admin/session", async (req: Request, res: Response) => {
    const session = await getAdminSession(req);
    if (!session) return res.status(401).json({ authenticated: false });
    return res.json({ authenticated: true, admin: { username: session.username }, expiresAt: session.exp * 1000 });
  });

  app.post("/api/admin/password", async (req: Request, res: Response) => {
    const session = await getAdminSession(req);
    if (!session) return res.status(401).json({ error: "Session administrateur requise" });
    const parsed = passwordChangeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Mot de passe invalide" });
    const credential = await getAdminCredentialByUsername(session.username);
    if (!credential || !verifyPassword(parsed.data.currentPassword, credential.passwordHash, credential.passwordSalt)) return res.status(401).json({ error: "Le mot de passe actuel est incorrect" });
    const updated = await updateAdminCredential(session.username, hashPassword(parsed.data.newPassword));
    if (!updated) return res.status(500).json({ error: "Le mot de passe n’a pas pu être enregistré" });
    setAdminCookie(req, res, updated);
    return res.json({ ok: true, admin: { username: updated.username } });
  });

  app.post("/api/admin/logout", async (req: Request, res: Response) => {
    res.clearCookie(ADMIN_SESSION_COOKIE, { ...getSessionCookieOptions(req), sameSite: "lax", maxAge: -1 });
    return res.json({ ok: true });
  });
}
