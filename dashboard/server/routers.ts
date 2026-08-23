import { z } from "zod";
import { nanoid } from "nanoid";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { acceptInvitation, createDevice, createInvitation, createTriviaProfile, getCurrentDeviceStatus, getLatestTelemetryForDevice, getNativeDataForDevice, getTelemetryHistoryForDevice, getTriviaProfile, getValidInvitation, listDevices } from "./db";

const platformSchema = z.enum(["android", "iphone"]);
const emailSchema = z.string().email();

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  devices: router({
    list: adminProcedure.query(({ ctx }) => listDevices(ctx.user.id)),
    currentStatus: adminProcedure.input(z.object({ deviceId: z.number().int().positive() })).query(({ ctx, input }) => getCurrentDeviceStatus(ctx.user.id, input.deviceId)),
    triviaProfile: adminProcedure.input(z.object({ deviceId: z.number().int().positive() })).query(({ ctx, input }) => getTriviaProfile(ctx.user.id, input.deviceId)),
    nativeData: adminProcedure.input(z.object({ deviceId: z.number().int().positive() })).query(({ ctx, input }) => getNativeDataForDevice(ctx.user.id, input.deviceId)),
    latestTelemetry: adminProcedure.input(z.object({ deviceId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const devices = await listDevices(ctx.user.id);
      if (!devices.some(device => device.id === input.deviceId)) throw new Error("Device not found");
      return getLatestTelemetryForDevice(input.deviceId);
    }),
    telemetryHistory: adminProcedure.input(z.object({ deviceId: z.number().int().positive(), limit: z.number().int().min(1).max(500).default(100) })).query(({ ctx, input }) => getTelemetryHistoryForDevice(ctx.user.id, input.deviceId, input.limit)),
    createFromInvite: publicProcedure.input(z.object({ token: z.string().min(8), name: z.string().trim().min(2).max(120), platform: platformSchema })).mutation(async ({ input }) => {
      const invitation = await getValidInvitation(input.token);
      if (!invitation) throw new Error("Ce lien d'invitation est expiré ou invalide.");
      const device = await createDevice({ ownerId: invitation.ownerId, name: input.name, platform: input.platform, deviceId: `TRK-${nanoid(10).toUpperCase()}`, authToken: nanoid(32) });
      await acceptInvitation(invitation.id);
      if (device?.id) await createTriviaProfile(device.id);
      return device;
    }),
  }),
  invitations: router({
    create: adminProcedure.input(z.object({ email: emailSchema.optional(), message: z.string().trim().max(1200).optional() })).mutation(async ({ ctx, input }) => {
      const token = nanoid(16);
      const invitation = await createInvitation({ ownerId: ctx.user.id, email: input.email, token, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
      const origin = process.env.VITE_APP_URL || "";
      const url = `${origin}/invite/${token}`;
      const subject = "Invitation My Trivia Hub — ajouter votre téléphone";
      const body = input.message || `Bonjour,\\n\\nRejoignez My Trivia Hub pour connecter votre téléphone au tableau de bord :\\n${url}\\n\\nCe lien expire dans 7 jours.`;
      return { id: invitation?.id, token, url, email: input.email ?? null, mailto: input.email ? `mailto:${encodeURIComponent(input.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : null };
    }),
    validate: publicProcedure.input(z.object({ token: z.string().min(8) })).query(async ({ input }) => {
      const invitation = await getValidInvitation(input.token);
      if (!invitation) return { valid: false as const };
      return { valid: true as const, expiresAt: invitation.expiresAt, email: invitation.email };
    }),
  }),
});

export type AppRouter = typeof appRouter;
