"use client";

import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useMemo } from "react";
import { AUTH_ASSETS, type AuthRole } from "./auth-assets";
import { AuthBackLink } from "./AuthBackLink";
import { AuthSocialRow } from "./AuthSocialRow";

const copy: Record<
  AuthRole,
  {
    title: string;
    subtitle: string;
    namePlaceholder: string;
    emailPlaceholder: string;
    loginHref: string;
  }
> = {
  student: {
    title: "Create Student Account",
    subtitle: "Join our community of learners and start your journey today.",
    namePlaceholder: "John Doe",
    emailPlaceholder: "student@university.edu",
    loginHref: "/auth/login",
  },
  mentor: {
    title: "Create Mentor Account",
    subtitle: "Share your expertise and guide the next generation of professionals.",
    namePlaceholder: "Dr. Jane Smith",
    emailPlaceholder: "mentor@company.com",
    loginHref: "/auth/login",
  },
};

const field =
  "w-full rounded-md border border-[#e5e5e5] bg-white px-2.5 py-2 text-[13px] text-[#0a0a0a] placeholder:text-[#717182] outline-none transition-[box-shadow,border-color] focus:border-primary focus:ring-[1.5px] focus:ring-primary/20";

type SignupFormProps = {
  role: AuthRole;
  /** Where OAuth sends the user after Google sign-in */
  oauthCallbackUrl?: string;
};

export function SignupForm({ role, oauthCallbackUrl }: SignupFormProps) {
  const c = useMemo(() => copy[role], [role]);
  const afterOAuth =
    oauthCallbackUrl ?? (role === "student" ? "/student/setup/1" : "/");
  const icon = role === "student" ? AUTH_ASSETS.student : AUTH_ASSETS.mentor;

  return (
    <div className="mx-auto w-full max-w-[360px] px-4 py-6 sm:py-8">
      <div className="mb-4">
        <AuthBackLink href="/auth" />
      </div>

      <div className="rounded-xl border border-[#e5e5e5] bg-white px-5 py-6 shadow-sm sm:px-6 sm:py-7">
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Image src={icon} alt="" width={28} height={28} className="size-7 object-contain" />
          </div>
          <h1 className="font-heading text-lg font-semibold tracking-tight text-[#0a0a0a] sm:text-xl">
            {c.title}
          </h1>
          <p className="mt-1.5 max-w-[280px] text-[13px] leading-snug text-[#717182]">{c.subtitle}</p>
        </div>

        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            const name = String(fd.get("name") ?? "").trim();
            const email = String(fd.get("email") ?? "").trim();
            const pw = String(fd.get("password") ?? "");
            const confirm = String(fd.get("confirmPassword") ?? "");
            if (!name || !email) return;
            if (pw || confirm) {
              if (pw !== confirm) {
                window.alert("Passwords do not match.");
                return;
              }
            }
            try {
              sessionStorage.setItem(
                "commonsia_signup_draft",
                JSON.stringify({ name, email, role }),
              );
            } catch {
              /* ignore */
            }
            await signIn("google", { callbackUrl: afterOAuth });
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor={`signup-name-${role}`} className="block text-[13px] font-medium text-[#0a0a0a]">
              Full Name
            </label>
            <input
              id={`signup-name-${role}`}
              name="name"
              type="text"
              autoComplete="name"
              placeholder={c.namePlaceholder}
              className={field}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`signup-email-${role}`} className="block text-[13px] font-medium text-[#0a0a0a]">
              Email
            </label>
            <input
              id={`signup-email-${role}`}
              name="email"
              type="email"
              autoComplete="email"
              placeholder={c.emailPlaceholder}
              className={field}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`signup-password-${role}`} className="block text-[13px] font-medium text-[#0a0a0a]">
              Password
            </label>
            <input
              id={`signup-password-${role}`}
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Create a strong password"
              className={field}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`signup-confirm-${role}`} className="block text-[13px] font-medium text-[#0a0a0a]">
              Confirm Password
            </label>
            <input
              id={`signup-confirm-${role}`}
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Confirm your password"
              className={field}
            />
          </div>
          <button
            type="submit"
            className="mt-1 w-full rounded-md bg-primary px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 sm:text-sm"
          >
            Continue
          </button>
        </form>

        <div className="mt-4">
          <AuthSocialRow callbackUrl={afterOAuth} />
        </div>

        <p className="mt-4 text-center text-[13px] text-[#717182]">
          Already have an account?{" "}
          <Link href={c.loginHref} className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
