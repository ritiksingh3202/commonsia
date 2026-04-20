import { randomUUID } from "crypto";

import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

import { prismaGeneratedClientHasAccountDeletedAt } from "@/lib/user-active";

/** Shape used by student dashboard (matches Prisma `include: { mentor: ... }`). */
export type MentoringBookingWithMentor = {
  id: string;
  mentorId: string;
  startAt: Date;
  endAt: Date;
  googleMeetLink: string | null;
  googleEventId: string | null;
  mentor: {
    id: string;
    name: string | null;
    image: string | null;
    mentorTitle: string | null;
    mentorCompany: string | null;
    accountDeletedAt?: Date | null;
  };
};

function mbDelegate(prisma: PrismaClient): {
  findMany: (args: Record<string, unknown>) => Promise<MentoringBookingWithMentor[]>;
  count: (args: Record<string, unknown>) => Promise<number>;
  create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
} | null {
  const d = (prisma as unknown as { mentoringBooking?: unknown }).mentoringBooking as
    | {
        findMany: (args: Record<string, unknown>) => Promise<MentoringBookingWithMentor[]>;
        count: (args: Record<string, unknown>) => Promise<number>;
        create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
      }
    | undefined;
  if (d && typeof d.findMany === "function") return d;
  return null;
}

export async function findUpcomingBookingsWithMentors(
  prisma: PrismaClient,
  studentId: string,
  now: Date,
): Promise<MentoringBookingWithMentor[]> {
  const d = mbDelegate(prisma);
  const mentorSelect = {
    id: true,
    name: true,
    image: true,
    mentorTitle: true,
    mentorCompany: true,
    ...(prismaGeneratedClientHasAccountDeletedAt() ? { accountDeletedAt: true as const } : {}),
  } as const;

  if (d) {
    return d.findMany({
      where: { studentId, endAt: { gte: now } },
      orderBy: { startAt: "asc" },
      include: {
        mentor: {
          select: mentorSelect,
        },
      },
    });
  }

  const hasDel = prismaGeneratedClientHasAccountDeletedAt();

  try {
    const rows = await prisma.$queryRaw<
      {
        id: string;
        mentorId: string;
        startAt: Date;
        endAt: Date;
        googleMeetLink: string | null;
        googleEventId: string | null;
        m_id: string;
        m_name: string | null;
        m_image: string | null;
        m_title: string | null;
        m_company: string | null;
        m_deleted?: Date | null;
      }[]
    >(Prisma.sql`
      SELECT
        b.id,
        b."mentorId",
        b."startAt",
        b."endAt",
        b."googleMeetLink" AS "googleMeetLink",
        b."googleEventId" AS "googleEventId",
        m.id AS "m_id",
        m.name AS "m_name",
        m.image AS "m_image",
        m."mentorTitle" AS "m_title",
        m."mentorCompany" AS "m_company"
        ${hasDel ? Prisma.sql`, m."accountDeletedAt" AS "m_deleted"` : Prisma.empty}
      FROM "MentoringBooking" b
      INNER JOIN "User" m ON m.id = b."mentorId"
      WHERE b."studentId" = ${studentId} AND b."endAt" >= ${now}
      ORDER BY b."startAt" ASC
    `);
    return rows.map((r) => ({
      id: r.id,
      mentorId: r.mentorId,
      startAt: r.startAt,
      endAt: r.endAt,
      googleMeetLink: r.googleMeetLink,
      googleEventId: r.googleEventId,
      mentor: {
        id: r.m_id,
        name: r.m_name,
        image: r.m_image,
        mentorTitle: r.m_title,
        mentorCompany: r.m_company,
        accountDeletedAt: hasDel ? r.m_deleted ?? null : null,
      },
    }));
  } catch {
    return [];
  }
}

export async function countPastBookings(
  prisma: PrismaClient,
  studentId: string,
  now: Date,
): Promise<number> {
  const d = mbDelegate(prisma);
  if (d) {
    return d.count({
      where: { studentId, endAt: { lt: now } },
    });
  }

  try {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM "MentoringBooking"
      WHERE "studentId" = ${studentId} AND "endAt" < ${now}
    `);
    return Number(rows[0]?.count ?? 0);
  } catch {
    return 0;
  }
}

export async function createMentoringBookingRow(params: {
  prisma: PrismaClient;
  studentId: string;
  mentorId: string;
  startAt: Date;
  endAt: Date;
  title: string;
  googleEventId: string | null;
  googleMeetLink?: string | null;
}): Promise<void> {
  const { prisma, studentId, mentorId, startAt, endAt, title, googleEventId, googleMeetLink = null } = params;
  const d = mbDelegate(prisma);
  if (d) {
    await d.create({
      data: {
        studentId,
        mentorId,
        startAt,
        endAt,
        title,
        googleEventId,
        googleMeetLink,
      },
    });
    return;
  }

  const id = randomUUID();
  try {
    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "MentoringBooking" ("id", "createdAt", "studentId", "mentorId", "startAt", "endAt", "title", "googleEventId", "googleMeetLink")
        VALUES (${id}, NOW(), ${studentId}, ${mentorId}, ${startAt}, ${endAt}, ${title}, ${googleEventId}, ${googleMeetLink})
      `,
    );
  } catch (e) {
    console.error("createMentoringBookingRow (raw)", e);
  }
}
