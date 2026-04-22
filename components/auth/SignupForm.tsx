"use client";

import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LegalConsentLinks } from "@/components/legal/LegalConsentLinks";
import { AUTH_ASSETS, type AuthRole } from "./auth-assets";
import { AuthBackLink } from "./AuthBackLink";
import { AuthSocialRow } from "./AuthSocialRow";

const MIN_PASSWORD = 8;

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

/** `text-base` on mobile prevents iOS Safari viewport zoom on focus (needs >=16px). Shrinks to 13px on sm+. */
const field =
  "w-full rounded-md border border-[#e5e5e5] bg-white px-2.5 py-2 text-base text-[#0a0a0a] placeholder:text-[#717182] outline-none transition-[box-shadow,border-color] focus:border-primary focus:ring-[1.5px] focus:ring-primary/20 sm:text-[13px]";

type SignupFormProps = {
  role: AuthRole;
  /** Where to send the user after a successful sign-in (email or OAuth) */
  oauthCallbackUrl?: string;
};

export function SignupForm({ role, oauthCallbackUrl }: SignupFormProps) {
  const router = useRouter();
  const c = useMemo(() => copy[role], [role]);
  /** First screen of profile wizard after account creation / OAuth. */
  const setupTarget =
    oauthCallbackUrl ?? (role === "student" ? "/student/setup/1" : "/mentor/setup/1");
  /**
   * Always land on `/auth/continue` after sign-in so `auth()` + JWT are stable before hitting setup.
   * Deep-linking straight to `/student/setup/1` can race the session cookie and bounce users to login.
   */
  const postSignInCallbackUrl = `/auth/continue?next=${encodeURIComponent(setupTarget)}`;
  const icon = role === "student" ? AUTH_ASSETS.student : AUTH_ASSETS.mentor;
  const [submitting, setSubmitting] = useState(false);

  const saveDraftForOAuth = () => {
    const form = document.getElementById(`signup-form-${role}`) as HTMLFormElement | null;
    if (!form) return;
    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    try {
      sessionStorage.setItem(
        "commonsia_signup_draft",
        JSON.stringify({
          name,
          email,
          role: role === "mentor" ? "mentor" : "student",
        }),
      );
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mx-auto w-full max-w-[360px] px-4 py-6 sm:py-8">
      <div className="mb-4">
        <AuthBackLink href="/auth" />
      </div>

      <div className="rounded-xl border border-[#e5e5e5] bg-white px-5 py-6 shadow-sm sm:px-6 sm:py-7">
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Image
              src={icon}
              alt=""
              width={28}
              height={28}
              className="icon-brand-line size-7 object-contain"
            />
          </div>
          <h1 className="font-heading text-lg font-semibold tracking-tight text-[#0a0a0a] sm:text-xl">
            {c.title}
          </h1>
          <p className="mt-1.5 max-w-[280px] text-[13px] leading-snug text-[#717182]">{c.subtitle}</p>
        </div>

        <form
          id={`signup-form-${role}`}
          className="space-y-3"
          suppressHydrationWarning
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            const name = String(fd.get("name") ?? "").trim();
            const email = String(fd.get("email") ?? "").trim();
            const pw = String(fd.get("password") ?? "");
            const confirm = String(fd.get("confirmPassword") ?? "");

            if (!name || !email) {
              window.alert("Please enter your name and email.");
              return;
            }
            if (!pw || !confirm) {
              window.alert(`Please enter and confirm your password (at least ${MIN_PASSWORD} characters).`);
              return;
            }
            if (pw !== confirm) {
              window.alert("Passwords do not match.");
              return;
            }
            if (pw.length < MIN_PASSWORD) {
              window.alert(`Password must be at least ${MIN_PASSWORD} characters.`);
              return;
            }

            setSubmitting(true);
            try {
              const reg = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name,
                  email,
                  password: pw,
                  role,
                }),
              });
              const data = (await reg.json().catch(() => ({}))) as { error?: string };
              if (!reg.ok) {
                window.alert(data.error ?? "Could not create your account.");
                return;
              }

              /**
               * Use Auth.js default redirect so the browser follows the callback response with
               * Set-Cookie before landing on setup. `redirect: false` + manual navigation can
               * leave the server session missing on the first load (credentials + JWT race).
               */
              await signIn("credentials", {
                email: email.trim().toLowerCase(),
                password: pw,
                callbackUrl: postSignInCallbackUrl,
                redirect: true,
              });
              /* Unreachable on success — client navigates away. */
            } catch {
              window.alert(
                "Your account was created, but automatic sign-in failed. Please sign in with your email and password.",
              );
              router.push(c.loginHref);
            } finally {
              setSubmitting(false);
            }
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
              required
              suppressHydrationWarning
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
              required
              suppressHydrationWarning
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
              placeholder={`At least ${MIN_PASSWORD} characters`}
              className={field}
              required
              minLength={MIN_PASSWORD}
              suppressHydrationWarning
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
              required
              minLength={MIN_PASSWORD}
              suppressHydrationWarning
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            suppressHydrationWarning
            className="mt-1 w-full rounded-md bg-primary px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60 sm:text-sm"
          >
            {submitting ? "Creating account…" : "Continue"}
          </button>
        </form>

        <div className="mt-4">
          <AuthSocialRow callbackUrl={postSignInCallbackUrl} onBeforeOAuth={saveDraftForOAuth} />
        </div>

        <LegalConsentLinks />

        <p className="mt-4 text-center text-[13px] text-[#717182]">
          Already have an account?{" "}
          <Link
            href={`/auth/login?callbackUrl=${encodeURIComponent(postSignInCallbackUrl)}`}
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
