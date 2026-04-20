"use client";

import Image from "next/image";
import Link from "next/link";

import { AUTH_ASSETS } from "./auth-assets";

function BackArrow({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M12.5 15L7.5 10l5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type RoleCardProps = {
  iconSrc: string;
  iconAlt: string;
  title: string;
  description: string;
  bullets: string[];
  signupLabel: string;
  loginLabel: string;
  role: "student" | "mentor";
};

function RoleCard({
  iconSrc,
  iconAlt,
  title,
  description,
  bullets,
  signupLabel,
  loginLabel,
  role,
}: RoleCardProps) {
  const signupHref = role === "student" ? "/auth/register/student" : "/auth/register/mentor";
  /** After OAuth, `/auth/continue` needs `next` so users without `role` yet reach the right onboarding shell. */
  const loginHref =
    role === "student"
      ? `/auth/login?callbackUrl=${encodeURIComponent("/auth/continue?next=/student")}`
      : `/auth/login?callbackUrl=${encodeURIComponent("/auth/continue?next=/mentor")}`;
  return (
    <div className="flex h-full flex-col rounded-xl border border-black/10 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col items-center text-center">
        <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-primary/10 sm:size-24">
          <Image
            src={iconSrc}
            alt={iconAlt}
            width={52}
            height={52}
            className="icon-brand-line size-12 object-contain sm:size-14"
          />
        </div>
        <h2 className="mt-3 text-base font-semibold text-[#0a0a0a] sm:text-lg">{title}</h2>
        <p className="mt-1.5 text-[13px] leading-snug text-[#717182] sm:text-sm">{description}</p>
      </div>

      <ul className="mt-4 flex flex-col gap-2 text-left text-[13px] leading-snug text-[#4a5565] sm:text-sm">
        {bullets.map((line) => (
          <li key={line} className="flex gap-2">
            <span className="shrink-0 font-normal text-primary" aria-hidden>
              ✓
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-col gap-2">
        <Link
          href={signupHref}
          className="flex h-9 w-full items-center justify-center rounded-md bg-primary text-center text-[13px] font-medium text-white transition-opacity hover:opacity-95 sm:h-10 sm:text-sm"
        >
          {signupLabel}
        </Link>
        <Link
          href={loginHref}
          className="flex h-9 w-full items-center justify-center rounded-md border border-black/10 bg-white text-center text-[13px] font-normal text-[#0a0a0a] transition-colors hover:bg-neutral-50 sm:h-10 sm:text-sm"
        >
          {loginLabel}
        </Link>
      </div>
    </div>
  );
}

export function ChooseRolePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-10 pt-3 sm:px-6 sm:pb-12 sm:pt-4 lg:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[13px] font-normal text-[#0a0a0a] transition-colors hover:text-primary"
      >
        <BackArrow className="size-4 shrink-0" />
        Back
      </Link>

      <header className="mt-4 text-center sm:mt-5">
        <h1 className="text-xl font-semibold tracking-tight text-[#0a0a0a] sm:text-2xl">Choose Your Role</h1>
        <p className="mt-2 text-sm text-[#4a5565]">Are you here to learn or to guide?</p>
      </header>

      <div className="mt-6 grid gap-4 sm:mt-7 lg:grid-cols-2 lg:gap-6">
        <RoleCard
          iconSrc={AUTH_ASSETS.student}
          iconAlt=""
          title="I'm a Student"
          description="Looking for mentorship and guidance"
          bullets={[
            "Connect with experienced mentors",
            "Get feedback on your projects",
            "Access learning resources",
            "Join workshops and events",
          ]}
          signupLabel="Sign Up as Student"
          loginLabel="Login as Student"
          role="student"
        />
        <RoleCard
          iconSrc={AUTH_ASSETS.mentor}
          iconAlt=""
          title="I'm a Mentor"
          description="Ready to share knowledge and experience"
          bullets={[
            "Guide aspiring students",
            "Share your expertise",
            "Build your professional network",
            "Conduct workshops",
          ]}
          signupLabel="Sign Up as Mentor"
          loginLabel="Login as Mentor"
          role="mentor"
        />
      </div>
    </div>
  );
}
