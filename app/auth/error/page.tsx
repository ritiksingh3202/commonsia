import type { Metadata } from "next";
import Link from "next/link";

import { MarketingShell } from "@/components/layout/MarketingShell";
import { authErrorMessage } from "@/lib/auth-error-messages";

export const metadata: Metadata = {
  title: { absolute: "Sign-in error" },
  description: "We could not complete sign-in.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const code = sp.error;
  const message = authErrorMessage(code);
  const isConfiguration = code === "Configuration";

  return (
    <MarketingShell>
      <div className="bg-white px-4 py-16">
        <div className="mx-auto max-w-md rounded-xl border border-[#e5e5e5] bg-white px-6 py-8 text-center shadow-sm">
          <h1 className="font-heading text-lg font-semibold text-[#0a0a0a]">Sign-in problem</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-[#717182]">{message}</p>
          {isConfiguration ? (
            <>
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-left text-[12px] leading-relaxed text-amber-950">
                <p className="font-medium">Most common fix (your server log usually shows this)</p>
                <p className="mt-1 text-amber-900/90">
                  Prisma <span className="font-mono">P1000</span> / &quot;Authentication failed&quot; means Postgres rejected
                  the <strong>database password</strong> in <span className="font-mono">DATABASE_URL</span> (not your
                  Supabase <span className="font-mono">sb_publishable_…</span> key). In Supabase: Settings → Database →
                  <strong> Reset database password</strong> → copy the new <strong>Connection pooling</strong> URIs from the
                  dashboard (do not hand-edit an old password). User must be{" "}
                  <span className="font-mono">postgres.&lt;project-ref&gt;</span> on the pooler host. If you use{" "}
                  <span className="font-mono">.env.local</span>, it overrides <span className="font-mono">.env</span>. Then run{" "}
                  <span className="font-mono">npm run db:ping</span> until it prints OK, and restart{" "}
                  <span className="font-mono">npm run dev</span>.
                </p>
              </div>
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-[12px] font-medium text-[#717182] hover:text-[#0a0a0a]">
                  Full server checklist
                </summary>
                <ul className="mt-2 list-inside list-disc space-y-1.5 pl-0.5 text-[12px] leading-relaxed text-[#717182]">
                  <li>
                    <strong className="text-[#0a0a0a]">Database</strong> —{" "}
                    <span className="font-mono text-[11px]">DATABASE_URL</span> (transaction pooler, port{" "}
                    <span className="font-mono text-[11px]">6543</span>, <span className="font-mono text-[11px]">pgbouncer=true</span>) and{" "}
                    <span className="font-mono text-[11px]">DIRECT_URL</span> (session pooler, port{" "}
                    <span className="font-mono text-[11px]">5432</span>). See <span className="font-mono text-[11px]">.env.example</span>.
                    New DB: <span className="font-mono text-[11px]">npx prisma db push</span>.
                  </li>
                  <li>
                    Set <span className="font-mono text-[11px]">AUTH_SECRET</span> (or{" "}
                    <span className="font-mono text-[11px]">NEXTAUTH_SECRET</span>) —{" "}
                    <span className="font-mono text-[11px]">npx auth secret</span>.
                  </li>
                  <li>
                    Set <span className="font-mono text-[11px]">AUTH_URL</span> to the exact public origin (no trailing slash).
                  </li>
                  <li>
                    Google / LinkedIn: redirect URIs{" "}
                    <span className="font-mono text-[11px]">{"{AUTH_URL}"}/api/auth/callback/google</span> (and LinkedIn equivalent).
                  </li>
                  <li>
                    Terminal where <span className="font-mono text-[11px]">next dev</span> runs, or{" "}
                    <span className="font-mono text-[11px]">AUTH_DEBUG=1</span>.
                  </li>
                </ul>
              </details>
            </>
          ) : null}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/auth/login"
              className="rounded-md bg-primary px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-primary/90"
            >
              Back to sign in
            </Link>
            <Link
              href="/auth"
              className="rounded-md border border-[#e5e5e5] px-4 py-2.5 text-[13px] font-medium text-[#0a0a0a] hover:bg-black/[0.03]"
            >
              Join
            </Link>
          </div>
        </div>
      </div>
    </MarketingShell>
  );
}
