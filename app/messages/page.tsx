import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { MessagesInbox } from "@/components/chat/MessagesInbox";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: { absolute: "Messages" },
  description: "Your Commonsia conversations.",
};

type Search = { peer?: string };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/messages");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const r = dbUser?.role ?? session.user.role;
  if (r !== "student" && r !== "mentor") {
    redirect("/");
  }

  const sp = await searchParams;
  const peer = sp.peer?.trim() || null;
  const backHref = r === "mentor" ? "/mentor" : "/student";

  return <MessagesInbox key={peer ?? "inbox"} initialPeerId={peer} backHref={backHref} />;
}
