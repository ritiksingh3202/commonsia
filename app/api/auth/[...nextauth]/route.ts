import { handlers } from "@/auth";

/** Prisma adapter requires Node (not Edge). */
export const runtime = "nodejs";

export const { GET, POST } = handlers;
