import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getAdminSession } from "../adminAuth";
import { getUserByOpenId, upsertUser } from "../db";
import { ENV } from "./env";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  adminSession: Awaited<ReturnType<typeof getAdminSession>>;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  const adminSession = await getAdminSession(opts.req);
  if (adminSession && !user && ENV.ownerOpenId) {
    await upsertUser({ openId: ENV.ownerOpenId, name: process.env.OWNER_NAME, role: "admin" });
    user = (await getUserByOpenId(ENV.ownerOpenId)) ?? null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    adminSession,
  };
}
