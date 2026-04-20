import { Prisma } from "@prisma/client";

/** Table or column missing — migrations / `db push` not applied, or wrong database. */
export function isPrismaMissingSchemaError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2021" || error.code === "P2022";
  }
  return false;
}

/** Wrong password / user / DB name — common after rotating Supabase password without updating `.env`. */
export function isPrismaInvalidCredentialsError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return /P1000|Authentication failed|credentials are not valid/i.test(error.message);
  }
  return false;
}

/** Postgres unreachable, timeout, TLS, or invalid `DATABASE_URL`. */
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
