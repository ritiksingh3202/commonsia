import { Prisma } from "@prisma/client";

/** Neon / Postgres unreachable, timeout, or TLS issues — safe to show “try again” UI. */
export function isPrismaConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return (
      error.code === "P1001" || // Can't reach database server
      error.code === "P1002" || // Database server unreachable (timeout)
      error.code === "P1017" // Server closed the connection
    );
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  return false;
}

export class DatabaseUnavailableError extends Error {
  override readonly name = "DatabaseUnavailableError";
  constructor(cause?: unknown) {
    super("Database temporarily unavailable");
    if (cause instanceof Error && cause.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}
